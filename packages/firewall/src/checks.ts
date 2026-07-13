import type { ClaimVerdict } from "./types.js";
import { scoreFactualConsistency } from "./nli.js";

const DEFAULT_TIMEOUT_MS = 5000;

// ── URL existence check ──────────────────────────────────────────────────────

const URL_PATTERN = /https?:\/\/[^\s"')\]>]+/g;

async function headWithTimeout(url: string, timeoutMs: number): Promise<number | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    return res.status;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

export async function checkUrls(
  text: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ClaimVerdict[]> {
  const matches = [...text.matchAll(URL_PATTERN)].map((m) => m[0]!);
  if (matches.length === 0) return [];

  const results = await Promise.allSettled(
    matches.map(async (url): Promise<ClaimVerdict | null> => {
      // Skip obviously internal/localhost URLs
      if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)) return null;
      const status = await headWithTimeout(url, timeoutMs);
      if (status === null) {
        return {
          text: url,
          verdict: "FLAG",
          confidence: 0.5,
          checkType: "url_unreachable",
          evidence: "Request timed out or failed",
        };
      }
      if (status === 404 || status === 410) {
        return {
          text: url,
          verdict: "BLOCK",
          confidence: 0.9,
          checkType: "url_not_found",
          evidence: `HTTP ${status}`,
          suggestedFix: "Remove or replace this URL — the resource does not exist.",
        };
      }
      return null; // URL is fine
    })
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is ClaimVerdict => r !== null);
}

// ── DOI / arXiv citation format check ───────────────────────────────────────

/**
 * Loose DOI capture: anything starting with 10. followed by digits.
 * We validate the full format after capture.
 */
const DOI_PATTERN = /\b(10\.\d+(?:\/[^\s"')\]>]*)?)/g;

/**
 * Loose arXiv capture: "arXiv:" followed by anything non-whitespace.
 * We validate the format after capture.
 */
const ARXIV_PATTERN = /arXiv:([^\s"')\]>,]+)/gi;

export function checkCitations(text: string): ClaimVerdict[] {
  const claims: ClaimVerdict[] = [];

  // DOI structural check: must be 10.NNNN(N+)/suffix with 4+ digits and a slash
  for (const match of text.matchAll(DOI_PATTERN)) {
    const doi = match[1]!;
    const validDoi = /^10\.\d{4,}\/\S+/.test(doi);
    if (!validDoi) {
      claims.push({
        text: doi,
        verdict: "FLAG",
        confidence: 0.7,
        checkType: "malformed_doi",
        evidence: "DOI does not match expected format 10.NNNN/suffix (requires 4+ digits before slash)",
      });
    }
  }

  // arXiv format check: new YYMM.NNNNN or old category/YYMMNNN
  for (const match of text.matchAll(ARXIV_PATTERN)) {
    const id = match[1]!;
    const newFormat = /^\d{4}\.\d{4,5}$/.test(id);
    const oldFormat = /^[a-z-]+\/\d{7}$/.test(id);
    if (!newFormat && !oldFormat) {
      claims.push({
        text: `arXiv:${id}`,
        verdict: "FLAG",
        confidence: 0.75,
        checkType: "malformed_arxiv_id",
        evidence: "arXiv ID does not match known format (expected YYMM.NNNNN or category/YYMMNNN)",
      });
    }
  }

  return claims;
}

// ── NLI factual consistency check ────────────────────────────────────────────

/**
 * Checks factual consistency between `text` and `sourceTexts` using the
 * Vectara HHEM v2 NLI API.
 *
 * - score < 0.3  → BLOCK ("low_nli_consistency")
 * - score < 0.5  → FLAG  ("low_nli_consistency")
 * - No sourceTexts or provider unavailable → empty (no claim added)
 */
export async function checkNliConsistency(
  text: string,
  sourceTexts: string[],
  timeoutMs?: number
): Promise<ClaimVerdict[]> {
  if (sourceTexts.length === 0) return [];

  const result = await scoreFactualConsistency({
    generatedText: text,
    sourceTexts,
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
  if (result === null) return [];

  const { score } = result;

  if (score < 0.3) {
    return [
      {
        text: text.slice(0, 200),
        verdict: "BLOCK",
        confidence: 1 - score,
        checkType: "low_nli_consistency",
        evidence: `Vectara HHEM factual consistency score ${score.toFixed(3)} is below threshold (0.3). Response may contradict source context.`,
      },
    ];
  }

  if (score < 0.5) {
    return [
      {
        text: text.slice(0, 200),
        verdict: "FLAG",
        confidence: 1 - score,
        checkType: "low_nli_consistency",
        evidence: `Vectara HHEM factual consistency score ${score.toFixed(3)} is below threshold (0.5). Response may partially contradict source context.`,
      },
    ];
  }

  return [];
}

// ── Numeric contradiction heuristics ────────────────────────────────────────

/**
 * Detects obvious numeric contradictions within a single sentence:
 * e.g. "increased from 90% to 10%" or "90% reduction to 150%"
 * These are heuristic and low-confidence flags, not blocks.
 */
const PERCENTAGE_SENTENCE = /([^.!?\n]+\d+(?:\.\d+)?%[^.!?\n]*\d+(?:\.\d+)?%[^.!?\n]*[.!?\n])/g;

export function checkNumericContradictions(text: string): ClaimVerdict[] {
  const claims: ClaimVerdict[] = [];

  for (const match of text.matchAll(PERCENTAGE_SENTENCE)) {
    const sentence = match[1]!;
    const numbers = [...sentence.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(
      (m) => parseFloat(m[1]!)
    );

    if (numbers.length >= 2) {
      // Flag if any value exceeds 100% where it doesn't make sense
      const hasImplausible = numbers.some((n) => n > 100);
      // Flag increase/decrease language contradictions
      const hasIncreaseDecrease =
        /increas|improv|grew|better/i.test(sentence) &&
        /decreas|fell|worse|reduc/i.test(sentence);

      if (hasImplausible || hasIncreaseDecrease) {
        claims.push({
          text: sentence.trim(),
          verdict: "FLAG",
          confidence: 0.6,
          checkType: "numeric_contradiction",
          evidence: hasImplausible
            ? `Percentage value exceeds 100%: ${numbers.join(", ")}%`
            : "Sentence contains contradictory increase/decrease language",
        });
      }
    }
  }

  return claims;
}
