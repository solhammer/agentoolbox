import type { FinanceCheckResult } from "../types.js";
import { getBestPair } from "../providers/dexscreener.js";

const DEFAULT_TIMEOUT_MS = 5000;

export interface LiquidityCheckInput {
  tokenAddress: string;
  chain: string;
  tradeUsd: number;
  maxPriceImpactPct?: number; // Default: 2%
  minLiquidityUsd?: number; // Default: 10000
  timeoutMs?: number;
}

export interface LiquidityCheckResult extends FinanceCheckResult {
  poolLiquidityUsd: number | null;
  estimatedPriceImpactPct: number | null;
  volume24h: number | null;
  washTradingFlag: boolean;
}

export async function checkLiquidity(
  input: LiquidityCheckInput
): Promise<LiquidityCheckResult> {
  const start = Date.now();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxPriceImpactPct = input.maxPriceImpactPct ?? 2;
  const minLiquidityUsd = input.minLiquidityUsd ?? 10000;

  const risks: FinanceCheckResult["risks"] = [];
  let verdict: FinanceCheckResult["verdict"] = "PASS";
  let score = 0;
  const escalate = (next: FinanceCheckResult["verdict"], nextScore: number) => {
    const rank = { PASS: 0, FLAG: 1, BLOCK: 2 } as const;
    if (rank[next] > rank[verdict]) verdict = next;
    if (nextScore > score) score = nextScore;
  };

  const pair = await getBestPair(input.tokenAddress, timeoutMs);
  const poolLiquidityUsd = pair?.liquidity?.usd ?? null;
  const volume24h = pair?.volume?.h24 ?? null;

  if (pair === null || poolLiquidityUsd === null || poolLiquidityUsd <= 0) {
    risks.push({
      type: "no_liquidity_data",
      severity: "critical",
      detail: "No liquidity data available for this token.",
    });
    return {
      verdict: "BLOCK",
      score: 100,
      risks,
      latencyMs: Date.now() - start,
      poolLiquidityUsd,
      estimatedPriceImpactPct: null,
      volume24h,
      washTradingFlag: false,
    };
  }

  // Simplified constant-product AMM estimate: impact ≈ 2 * tradeSize / liquidity.
  const estimatedPriceImpactPct = (input.tradeUsd / poolLiquidityUsd) * 100 * 2;

  if (poolLiquidityUsd < minLiquidityUsd) {
    risks.push({
      type: "insufficient_liquidity",
      severity: "critical",
      detail: `Pool liquidity $${poolLiquidityUsd.toFixed(0)} is below minimum $${minLiquidityUsd}.`,
    });
    escalate("BLOCK", 90);
  } else if (poolLiquidityUsd < minLiquidityUsd * 2) {
    risks.push({
      type: "low_liquidity",
      severity: "warn",
      detail: `Pool liquidity $${poolLiquidityUsd.toFixed(0)} is between min and 2× min.`,
    });
    escalate("FLAG", 45);
  }

  if (estimatedPriceImpactPct > maxPriceImpactPct) {
    risks.push({
      type: "high_price_impact",
      severity: "critical",
      detail: `Estimated price impact ${estimatedPriceImpactPct.toFixed(2)}% exceeds max ${maxPriceImpactPct}%.`,
    });
    escalate("BLOCK", 85);
  } else if (estimatedPriceImpactPct > 1) {
    risks.push({
      type: "elevated_price_impact",
      severity: "warn",
      detail: `Estimated price impact ${estimatedPriceImpactPct.toFixed(2)}% (1–${maxPriceImpactPct}%).`,
    });
    escalate("FLAG", 40);
  }

  // Wash trading heuristic: volume/liquidity ratio > 10.
  let washTradingFlag = false;
  if (volume24h !== null && volume24h / poolLiquidityUsd > 10) {
    washTradingFlag = true;
    risks.push({
      type: "wash_trading_suspected",
      severity: "warn",
      detail: `24h volume/liquidity ratio ${(volume24h / poolLiquidityUsd).toFixed(1)} > 10 suggests wash trading.`,
    });
    escalate("FLAG", 50);
  }

  return {
    verdict,
    score,
    risks,
    latencyMs: Date.now() - start,
    poolLiquidityUsd,
    estimatedPriceImpactPct,
    volume24h,
    washTradingFlag,
  };
}
