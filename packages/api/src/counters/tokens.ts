/**
 * BPE-approximate token counter (pure TypeScript, no ML deps).
 *
 * Uses a cl100k_base-style approximation:
 *   - Special tokens (e.g. `<|im_start|>`) count as exactly 1 token each.
 *   - Remaining text is estimated by characters-per-token:
 *       · code-like content  ≈ 3.5 chars / token (denser)
 *       · natural language   ≈ 4   chars / token
 *   - Chat framing adds +3 tokens per message (role overhead) and +3 tokens
 *     for the assistant reply priming.
 *
 * These are estimates intended for pre-flight cost/context budgeting, not an
 * exact tokenisation.
 */

export type ModelFamily = "gpt-4" | "gpt-3.5" | "claude" | "gemini" | "generic";

export interface TokenCount {
  tokens: number;
  characters: number;
  words: number;
  estimatedCostUsd: {
    input: number;
    output1k: number; // cost for 1000 output tokens at this model's rate
  };
  model: ModelFamily;
}

export interface MessageTokenCount {
  total: number;
  perMessage: Array<{ role: string; tokens: number }>;
  estimatedCostUsd: { input: number; output1k: number };
  model: ModelFamily;
  contextWindowRemaining: number;
}

// ── Pricing (July 2026 approximations) ────────────────────────────────────────
// inputPerM / outputPerM are USD per 1,000,000 tokens.
interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
  contextWindow: number;
}

const PRICING: Record<ModelFamily, ModelPricing> = {
  "gpt-4": { inputPerM: 10, outputPerM: 30, contextWindow: 128_000 },
  "gpt-3.5": { inputPerM: 0.5, outputPerM: 1.5, contextWindow: 16_000 },
  claude: { inputPerM: 3, outputPerM: 15, contextWindow: 200_000 },
  gemini: { inputPerM: 1.25, outputPerM: 5, contextWindow: 1_000_000 },
  // Blended middle-ground estimate for unknown models.
  generic: { inputPerM: 2, outputPerM: 6, contextWindow: 128_000 },
};

/** Chat framing overheads. */
const MESSAGE_OVERHEAD = 3; // per-message role overhead
const REPLY_PRIMING = 3; // assistant reply priming

/** Matches OpenAI-style special tokens, e.g. `<|im_start|>`. */
const SPECIAL_TOKEN_RE = /<\|[^|]*?\|>/g;

/** Chars-per-token ratios. */
const CHARS_PER_TOKEN_CODE = 3.5;
const CHARS_PER_TOKEN_TEXT = 4;

/** Count whitespace-delimited words. */
function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * Heuristic: is this text code-like? Code has a much higher density of
 * structural punctuation than natural language.
 */
function isCodeLike(text: string): boolean {
  if (text.length === 0) return false;
  const codeChars = text.match(/[{}()[\];=<>+\-*/%&|!~^]/g)?.length ?? 0;
  return codeChars / text.length > 0.03;
}

/** Compute estimated USD cost for a given input-token count under a model. */
function computeCost(
  model: ModelFamily,
  inputTokens: number
): { input: number; output1k: number } {
  const pricing = PRICING[model];
  return {
    input: (inputTokens * pricing.inputPerM) / 1_000_000,
    output1k: (1000 * pricing.outputPerM) / 1_000_000,
  };
}

/** Approximate token count for a single string. */
export function countTokens(
  text: string,
  model: ModelFamily = "generic"
): TokenCount {
  const characters = text.length;
  const words = countWords(text);

  const specialCount = text.match(SPECIAL_TOKEN_RE)?.length ?? 0;
  const body = text.replace(SPECIAL_TOKEN_RE, "");

  const ratio = isCodeLike(body) ? CHARS_PER_TOKEN_CODE : CHARS_PER_TOKEN_TEXT;
  const bodyTokens = body.length > 0 ? Math.ceil(body.length / ratio) : 0;
  const tokens = bodyTokens + specialCount;

  return {
    tokens,
    characters,
    words,
    estimatedCostUsd: computeCost(model, tokens),
    model,
  };
}

/** Approximate token count for a chat-formatted message list. */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>,
  model: ModelFamily = "generic"
): MessageTokenCount {
  const perMessage = messages.map((m) => ({
    role: m.role,
    tokens: countTokens(m.content, model).tokens + MESSAGE_OVERHEAD,
  }));

  const total =
    perMessage.reduce((sum, m) => sum + m.tokens, 0) + REPLY_PRIMING;

  const contextWindow = PRICING[model].contextWindow;

  return {
    total,
    perMessage,
    estimatedCostUsd: computeCost(model, total),
    model,
    contextWindowRemaining: contextWindow - total,
  };
}
