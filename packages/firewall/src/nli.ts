/**
 * NLI (Natural Language Inference) layer using Vectara HHEM v2.
 *
 * Scores factual consistency between a generated LLM response and source
 * context documents. Falls back gracefully (returns null) when
 * VECTARA_API_KEY is not configured.
 */

const VECTARA_HHEM_URL = "https://api.vectara.io/v2/evaluate_factual_consistency";

export interface NliInput {
  generatedText: string;
  /** Retrieved docs / context to check against */
  sourceTexts: string[];
  /** Request timeout in ms. Default: 5000 */
  timeoutMs?: number;
}

export interface NliResult {
  /** 0–1, higher = more factually consistent with source */
  score: number;
  provider: string; // "vectara-hhem"
  rawResponse?: unknown;
}

/**
 * Score factual consistency of `generatedText` against `sourceTexts` using
 * the Vectara HHEM v2 API.
 *
 * Returns `null` when:
 * - VECTARA_API_KEY is not set in the environment
 * - sourceTexts is empty (nothing to check against)
 * - The API request times out or returns an error
 */
export async function scoreFactualConsistency(
  input: NliInput
): Promise<NliResult | null> {
  const apiKey = process.env.VECTARA_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (input.sourceTexts.length === 0) {
    return null;
  }

  const timeoutMs = input.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(VECTARA_HHEM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        generated_text: input.generatedText,
        source_texts: input.sourceTexts,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Non-2xx — degrade gracefully rather than hard-failing the firewall
      return null;
    }

    const raw: unknown = await response.json();

    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as Record<string, unknown>)["score"] !== "number"
    ) {
      return null;
    }

    const score = (raw as Record<string, unknown>)["score"] as number;

    return {
      score,
      provider: "vectara-hhem",
      rawResponse: raw,
    };
  } catch {
    // Timeout, network error, parse error — degrade gracefully
    return null;
  } finally {
    clearTimeout(timer);
  }
}
