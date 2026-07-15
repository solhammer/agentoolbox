/**
 * TF-IDF importance-based context distiller.
 *
 * Replaces the naive sliding window with a scoring-based approach:
 *   1. Score each message via TF-IDF (term frequency across the message set)
 *   2. Always keep system messages
 *   3. Always keep the last 3 messages (recency bias)
 *   4. Fill remaining token budget with the highest-scoring messages
 *   5. Return messages in original chronological order
 *
 * If LLMLINGUA_URL is set, delegates to that external service instead of
 * running the local TF-IDF algorithm.
 */

/** Rough chars-per-token estimate for GPT-style tokenisers */
const CHARS_PER_TOKEN = 4;

export interface DistillerInput {
  messages: Array<{ role: string; content: string }>;
  targetTokens: number;
  preserveSystemPrompt: boolean;
}

export interface DistillerResult {
  messages: Array<{ role: string; content: string }>;
  originalCount: number;
  distilledCount: number;
  estimatedTokens: number;
  compressionRatio: number;
  method: string;
}

// ── TF-IDF helpers ────────────────────────────────────────────────────────────

/** Tokenise content into lowercase word tokens (strips punctuation). */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Build an inverse-document-frequency map over the full message set. */
function buildIdf(messages: Array<{ content: string }>): Map<string, number> {
  const docCount = messages.length || 1;
  const termDocFreq = new Map<string, number>();

  for (const msg of messages) {
    const seen = new Set(tokenise(msg.content));
    for (const term of seen) {
      termDocFreq.set(term, (termDocFreq.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, df] of termDocFreq) {
    // Smoothed IDF: log((N+1)/(df+1)) + 1
    idf.set(term, Math.log((docCount + 1) / (df + 1)) + 1);
  }
  return idf;
}

/** Compute a TF-IDF importance score for a single message. */
function scoreTfIdf(content: string, idf: Map<string, number>): number {
  const tokens = tokenise(content);
  if (tokens.length === 0) return 0;

  const tfMap = new Map<string, number>();
  for (const t of tokens) {
    tfMap.set(t, (tfMap.get(t) ?? 0) + 1);
  }

  let score = 0;
  for (const [term, count] of tfMap) {
    const tf = count / tokens.length;
    const termIdf = idf.get(term) ?? 1;
    score += tf * termIdf;
  }
  return score;
}

// ── LLMLingua-2 optional integration ─────────────────────────────────────────

interface LLMLinguaResponse {
  messages?: Array<{ role: string; content: string }>;
  method?: string;
}

async function tryLLMLingua(
  messages: Array<{ role: string; content: string }>,
  targetTokens: number
): Promise<DistillerResult | null> {
  const url = process.env.LLMLINGUA_URL;
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, target_tokens: targetTokens }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as LLMLinguaResponse;
    const compressed = data.messages ?? messages;
    const usedChars = compressed.reduce((s, m) => s + m.content.length, 0);
    const estimatedTokens = Math.ceil(usedChars / CHARS_PER_TOKEN);

    return {
      messages: compressed,
      originalCount: messages.length,
      distilledCount: compressed.length,
      estimatedTokens,
      compressionRatio:
        messages.length > 0
          ? Math.round((compressed.length / messages.length) * 100) / 100
          : 1,
      method: "llmlingua2_remote",
    };
  } catch {
    return null;
  }
}

// ── Main distiller ────────────────────────────────────────────────────────────

/**
 * Distil a message list down to `targetTokens` using TF-IDF importance
 * scoring (or LLMLingua-2 if LLMLINGUA_URL is configured).
 */
export async function distillContext(
  input: DistillerInput
): Promise<DistillerResult> {
  const { messages, targetTokens, preserveSystemPrompt } = input;

  // ── LLMLingua-2 fast path ─────────────────────────────────────────────────
  const linguaResult = await tryLLMLingua(messages, targetTokens);
  if (linguaResult !== null) return linguaResult;

  // ── TF-IDF local algorithm ────────────────────────────────────────────────
  const charBudget = targetTokens * CHARS_PER_TOKEN;

  // Partition messages
  const systemMessages = preserveSystemPrompt
    ? messages.filter((m) => m.role === "system")
    : [];
  const nonSystem = messages.filter((m) => m.role !== "system");

  // Always keep last 3 non-system messages (recency bias)
  const recencyCount = Math.min(3, nonSystem.length);
  const recencyMessages = nonSystem.slice(-recencyCount);
  const candidateMessages = nonSystem.slice(0, nonSystem.length - recencyCount);

  // Charge budget for pinned messages
  const systemChars = systemMessages.reduce((s, m) => s + m.content.length, 0);
  const recencyChars = recencyMessages.reduce(
    (s, m) => s + m.content.length,
    0
  );
  let remainingChars = charBudget - systemChars - recencyChars;

  // Score candidates with TF-IDF (computed across the full non-system set)
  const idf = buildIdf(nonSystem);
  const scored = candidateMessages.map((msg, idx) => ({
    msg,
    originalIndex: idx,
    score: scoreTfIdf(msg.content, idf),
  }));

  // Sort descending by score, then fill budget
  scored.sort((a, b) => b.score - a.score);
  const selectedOriginalIndices = new Set<number>();

  for (const { msg, originalIndex } of scored) {
    if (remainingChars <= 0) break;
    if (msg.content.length <= remainingChars) {
      selectedOriginalIndices.add(originalIndex);
      remainingChars -= msg.content.length;
    }
  }

  // Reconstruct in original chronological order
  const selectedCandidates = candidateMessages.filter((_, idx) =>
    selectedOriginalIndices.has(idx)
  );

  const result = [...systemMessages, ...selectedCandidates, ...recencyMessages];

  // Estimate tokens from chars actually included
  const usedChars =
    systemChars +
    selectedCandidates.reduce((s, m) => s + m.content.length, 0) +
    recencyChars;
  const estimatedTokens = Math.ceil(usedChars / CHARS_PER_TOKEN);

  return {
    messages: result,
    originalCount: messages.length,
    distilledCount: result.length,
    estimatedTokens,
    compressionRatio:
      messages.length > 0
        ? Math.round((result.length / messages.length) * 100) / 100
        : 1,
    method: "tfidf_importance_v2",
  };
}
