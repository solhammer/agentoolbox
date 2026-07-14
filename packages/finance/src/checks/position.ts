import type { AssetType, FinanceCheckResult } from "../types.js";

export interface TradeProposal {
  symbol: string;
  side: "buy" | "sell" | "long" | "short";
  tradeUsd: number;
  leverage?: number; // Default: 1
  assetType: AssetType;
}

export interface PortfolioSnapshot {
  totalValueUsd: number;
  cashUsd: number;
  dailyPnlUsd?: number; // Today's realized+unrealized P&L
  openPositions?: number; // Number of currently open positions
  assetAllocation?: Record<string, number>; // symbol → USD value
}

export interface GuardianRules {
  maxPositionPct?: number; // Max % of portfolio per trade. Default: 25
  maxDailyLossPct?: number; // Kill if daily loss > X%. Default: 10
  maxOpenPositions?: number; // Default: 10
  maxLeverage?: number; // Default: 3
  allowedAssets?: string[]; // If set, only these symbols allowed
  killSwitch?: boolean; // If true, block ALL trades
  maxSingleTradeUsd?: number; // Hard cap in USD
}

export interface PositionCheckResult extends FinanceCheckResult {
  effectiveUsd: number; // tradeUsd * leverage
  positionPct: number | null;
  violations: string[];
}

/**
 * Deterministic position-limit and kill-switch gate. No external API calls.
 */
export function checkPosition(
  trade: TradeProposal,
  portfolio: PortfolioSnapshot,
  rules?: GuardianRules
): PositionCheckResult {
  const start = Date.now();

  const maxPositionPct = rules?.maxPositionPct ?? 25;
  const maxDailyLossPct = rules?.maxDailyLossPct ?? 10;
  const maxOpenPositions = rules?.maxOpenPositions ?? 10;
  const maxLeverage = rules?.maxLeverage ?? 3;

  const leverage = trade.leverage ?? 1;
  const effectiveUsd = trade.tradeUsd * leverage;
  const positionPct =
    portfolio.totalValueUsd > 0 ? (effectiveUsd / portfolio.totalValueUsd) * 100 : null;

  const risks: FinanceCheckResult["risks"] = [];
  const violations: string[] = [];

  let verdict: FinanceCheckResult["verdict"] = "PASS";
  let score = 0;
  const escalate = (next: FinanceCheckResult["verdict"], nextScore: number) => {
    const rank = { PASS: 0, FLAG: 1, BLOCK: 2 } as const;
    if (rank[next] > rank[verdict]) verdict = next;
    if (nextScore > score) score = nextScore;
  };

  const block = (type: string, detail: string, nextScore = 100) => {
    violations.push(type);
    risks.push({ type, severity: "critical", detail });
    escalate("BLOCK", nextScore);
  };

  // Kill switch — blocks everything.
  if (rules?.killSwitch === true) {
    block("kill_switch", "Kill switch is engaged — all trades are blocked.");
  }

  // Daily loss kill.
  if (portfolio.dailyPnlUsd !== undefined && portfolio.totalValueUsd > 0) {
    const dailyLossPct = (-portfolio.dailyPnlUsd / portfolio.totalValueUsd) * 100;
    if (dailyLossPct > maxDailyLossPct) {
      block(
        "max_daily_loss",
        `Daily loss ${dailyLossPct.toFixed(2)}% exceeds max ${maxDailyLossPct}%.`
      );
    }
  }

  // Allowed assets.
  if (rules?.allowedAssets && !rules.allowedAssets.includes(trade.symbol)) {
    block(
      "asset_not_allowed",
      `Asset "${trade.symbol}" is not in the allowed list.`
    );
  }

  // Hard USD cap.
  if (rules?.maxSingleTradeUsd !== undefined && effectiveUsd > rules.maxSingleTradeUsd) {
    block(
      "max_single_trade_usd",
      `Effective trade $${effectiveUsd.toFixed(0)} exceeds hard cap $${rules.maxSingleTradeUsd}.`
    );
  }

  // Leverage.
  if (leverage > maxLeverage) {
    block(
      "max_leverage",
      `Leverage ${leverage}x exceeds max ${maxLeverage}x.`
    );
  }

  // Position size.
  if (positionPct !== null && positionPct > maxPositionPct) {
    block(
      "max_position_pct",
      `Position ${positionPct.toFixed(2)}% of portfolio exceeds max ${maxPositionPct}%.`
    );
  }

  // Open positions.
  if (portfolio.openPositions !== undefined && portfolio.openPositions >= maxOpenPositions) {
    block(
      "max_open_positions",
      `Open positions ${portfolio.openPositions} >= max ${maxOpenPositions}.`
    );
  }

  return {
    verdict,
    score,
    risks,
    latencyMs: Date.now() - start,
    effectiveUsd,
    positionPct,
    violations,
  };
}
