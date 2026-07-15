import type { Chain, FinanceCheckResult, Verdict } from "../types.js";
import { checkPrice } from "./price.js";
import { checkRug } from "./rug.js";
import { checkLiquidity } from "./liquidity.js";
import { checkPosition } from "./position.js";

export type NamedCheck = FinanceCheckResult & { name: string };

export interface OrderRiskInput {
  symbol?: string;
  tokenAddress?: string;
  assetType: "crypto" | "stock";
  side: "buy" | "sell";
  tradeUsd: number;
  portfolioValueUsd?: number;
  chain?: string;
  leverage?: number;
}

export interface OrderRiskResult {
  verdict: Verdict;
  overallScore: number;
  checks: NamedCheck[];
  blockedBy: string | null;
  latencyMs: number;
}

/**
 * Full pre-trade gate. Runs all applicable checks in parallel (rug + liquidity
 * for tokens, price always, and position limits when a portfolio value is
 * given) and returns a composite verdict — the worst sub-verdict wins.
 */
export async function checkOrder(input: OrderRiskInput): Promise<OrderRiskResult> {
  const start = Date.now();
  const checks: NamedCheck[] = [];

  if (input.tokenAddress !== undefined) {
    const chain = (input.chain ?? "solana") as Chain;
    const [rug, liq] = await Promise.all([
      checkRug({ address: input.tokenAddress, chain }),
      checkLiquidity({
        tokenAddress: input.tokenAddress,
        chain: input.chain ?? "solana",
        tradeUsd: input.tradeUsd,
      }),
    ]);
    checks.push({ ...rug, name: "rug" }, { ...liq, name: "liquidity" });
  }

  const price = await checkPrice({
    assetType: input.assetType,
    ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
    ...(input.tokenAddress !== undefined ? { tokenAddress: input.tokenAddress } : {}),
  });
  checks.push({ ...price, name: "price" });

  if (input.portfolioValueUsd !== undefined) {
    const pos = checkPosition(
      {
        symbol: input.symbol ?? input.tokenAddress ?? "unknown",
        side: input.side,
        tradeUsd: input.tradeUsd,
        assetType: input.assetType,
        ...(input.leverage !== undefined ? { leverage: input.leverage } : {}),
      },
      { totalValueUsd: input.portfolioValueUsd, cashUsd: input.portfolioValueUsd }
    );
    checks.push({ ...pos, name: "position" });
  }

  const rank: Record<Verdict, number> = { PASS: 0, FLAG: 1, BLOCK: 2 };
  let verdict: Verdict = "PASS";
  let overallScore = 0;
  let blockedBy: string | null = null;
  for (const ch of checks) {
    if (rank[ch.verdict] > rank[verdict]) verdict = ch.verdict;
    if (ch.score > overallScore) overallScore = ch.score;
    if (ch.verdict === "BLOCK" && blockedBy === null) blockedBy = ch.name;
  }

  return {
    verdict,
    overallScore,
    checks,
    blockedBy,
    latencyMs: Date.now() - start,
  };
}
