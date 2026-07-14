import type { Chain, FinanceCheckResult } from "../types.js";
import { getRugCheckSummary } from "../providers/rugcheck.js";

const DEFAULT_TIMEOUT_MS = 5000;

export interface RugCheckInput {
  address: string;
  chain: Chain;
  timeoutMs?: number;
  // Thresholds
  maxRugScore?: number; // Default: 60 — block above this
  requireLpLocked?: boolean; // Default: true
  blockIfMintAuthority?: boolean; // Default: true
  blockIfFreezeAuthority?: boolean; // Default: true
}

export interface RugCheckResultExtended extends FinanceCheckResult {
  rugScore: number | null;
  mintAuthorityActive: boolean | null;
  freezeAuthorityActive: boolean | null;
  lpLockedPct: number | null;
  specificRisks: string[];
}

export async function checkRug(input: RugCheckInput): Promise<RugCheckResultExtended> {
  const start = Date.now();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRugScore = input.maxRugScore ?? 60;
  const requireLpLocked = input.requireLpLocked ?? true;
  const blockIfMintAuthority = input.blockIfMintAuthority ?? true;
  const blockIfFreezeAuthority = input.blockIfFreezeAuthority ?? true;

  const risks: FinanceCheckResult["risks"] = [];
  const specificRisks: string[] = [];

  let verdict: FinanceCheckResult["verdict"] = "PASS";
  let score = 0;
  const escalate = (next: FinanceCheckResult["verdict"], nextScore: number) => {
    const rank = { PASS: 0, FLAG: 1, BLOCK: 2 } as const;
    if (rank[next] > rank[verdict]) verdict = next;
    if (nextScore > score) score = nextScore;
  };

  if (input.chain !== "solana") {
    risks.push({
      type: "unsupported_chain",
      severity: "warn",
      detail: `Rug checks are only supported for Solana; got "${input.chain}".`,
    });
    return {
      verdict: "FLAG",
      score: 50,
      risks,
      latencyMs: Date.now() - start,
      rugScore: null,
      mintAuthorityActive: null,
      freezeAuthorityActive: null,
      lpLockedPct: null,
      specificRisks,
    };
  }

  const summary = await getRugCheckSummary(input.address, timeoutMs);
  if (!summary) {
    risks.push({
      type: "rugcheck_unavailable",
      severity: "warn",
      detail: "RugCheck data was unavailable for this token.",
    });
    return {
      verdict: "FLAG",
      score: 50,
      risks,
      latencyMs: Date.now() - start,
      rugScore: null,
      mintAuthorityActive: null,
      freezeAuthorityActive: null,
      lpLockedPct: null,
      specificRisks,
    };
  }

  // Map RugCheck risks -> our risk list.
  for (const r of summary.risks) {
    specificRisks.push(r.name);
    if (r.level === "danger") {
      risks.push({ type: r.name, severity: "critical", detail: `RugCheck danger: ${r.name}` });
    } else {
      risks.push({ type: r.name, severity: "warn", detail: `RugCheck ${r.level}: ${r.name}` });
    }
  }

  // Authority checks.
  if (summary.mintAuthorityActive) {
    risks.push({
      type: "mint_authority_active",
      severity: "critical",
      detail: "Mint authority is still active — supply can be inflated.",
    });
    if (blockIfMintAuthority) escalate("BLOCK", 90);
    else escalate("FLAG", 50);
  }
  if (summary.freezeAuthorityActive) {
    risks.push({
      type: "freeze_authority_active",
      severity: "critical",
      detail: "Freeze authority is still active — token accounts can be frozen.",
    });
    if (blockIfFreezeAuthority) escalate("BLOCK", 90);
    else escalate("FLAG", 50);
  }

  // Score threshold.
  if (summary.score > maxRugScore) {
    risks.push({
      type: "high_rug_score",
      severity: "critical",
      detail: `RugCheck score ${summary.score} exceeds max ${maxRugScore}.`,
    });
    escalate("BLOCK", Math.min(100, summary.score));
  } else if (summary.score >= 40) {
    risks.push({
      type: "elevated_rug_score",
      severity: "warn",
      detail: `RugCheck score ${summary.score} is elevated (40–${maxRugScore}).`,
    });
    escalate("FLAG", summary.score);
  }

  // LP locked.
  const lpLockedPct = summary.lpLockedPct ?? null;
  if (lpLockedPct === 0) {
    risks.push({
      type: "lp_not_locked",
      severity: "warn",
      detail: "Liquidity pool is not locked (0%).",
    });
    if (requireLpLocked) escalate("FLAG", 45);
  }

  return {
    verdict,
    score,
    risks,
    latencyMs: Date.now() - start,
    rugScore: summary.score,
    mintAuthorityActive: summary.mintAuthorityActive,
    freezeAuthorityActive: summary.freezeAuthorityActive,
    lpLockedPct,
    specificRisks,
  };
}
