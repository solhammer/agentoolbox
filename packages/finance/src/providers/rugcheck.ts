const DEFAULT_TIMEOUT_MS = 5000;
const BASE_URL = "https://api.rugcheck.xyz/v1";

export interface RugCheckSummary {
  mint: string;
  score: number; // 0-100, higher = riskier
  scoreNormalized: number; // 0-100
  risks: Array<{ name: string; level: "info" | "warn" | "danger"; score: number }>;
  lpLockedPct?: number;
  mintAuthorityActive: boolean;
  freezeAuthorityActive: boolean;
}

/** Raw shape of the RugCheck summary/report response (fields we consume). */
interface RugCheckRawResponse {
  score?: number;
  score_normalised?: number;
  risks?: Array<{ name?: string; level?: string; score?: number }>;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  markets?: Array<{ lp?: { lpLockedPct?: number } }>;
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

function normalizeLevel(level: string | undefined): "info" | "warn" | "danger" {
  if (level === "danger") return "danger";
  if (level === "warn") return "warn";
  return "info";
}

/**
 * Fetch a Solana token safety summary from RugCheck.
 * Note: RugCheck enforces roughly 1 request/second; callers should throttle.
 * Returns null on error.
 */
export async function getRugCheckSummary(
  mint: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<RugCheckSummary | null> {
  const url = `${BASE_URL}/tokens/${encodeURIComponent(mint)}/report/summary`;
  const data = await fetchJson<RugCheckRawResponse>(url, timeoutMs);
  if (!data) return null;

  const score = typeof data.score === "number" ? data.score : 0;
  const scoreNormalized =
    typeof data.score_normalised === "number" ? data.score_normalised : score;

  const risks = Array.isArray(data.risks)
    ? data.risks.map((r) => ({
        name: typeof r.name === "string" ? r.name : "unknown",
        level: normalizeLevel(r.level),
        score: typeof r.score === "number" ? r.score : 0,
      }))
    : [];

  const lpLockedPct = Array.isArray(data.markets)
    ? data.markets.find((m) => typeof m.lp?.lpLockedPct === "number")?.lp?.lpLockedPct
    : undefined;

  return {
    mint,
    score,
    scoreNormalized,
    risks,
    ...(typeof lpLockedPct === "number" ? { lpLockedPct } : {}),
    mintAuthorityActive: data.mintAuthority != null,
    freezeAuthorityActive: data.freezeAuthority != null,
  };
}
