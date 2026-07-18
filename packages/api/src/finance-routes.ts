import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  FinanceUnitsRequest,
  FinancePriceRequest,
  FinanceSymbolRequest,
  FinanceTokenRiskRequest,
  FinanceSlippageRequest,
  FinanceOrderRiskRequest,
  FinancePositionCheckRequest,
} from "@agentoolbox/contracts";
import {
  checkDecimals,
  checkPrice,
  checkRug,
  checkLiquidity,
  checkPosition,
  resolveSymbol,
  checkOrder,
  type TradeProposal,
  type PortfolioSnapshot,
  type GuardianRules,
} from "@agentoolbox/finance";

const financeRoutes = new Hono();

// ── POST /v1/finance/units ────────────────────────────────────────────────────
financeRoutes.post(
  "/units",
  zValidator("json", FinanceUnitsRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await checkDecimals({
      tokenAddress: b.tokenAddress,
      rawAmount: b.rawAmount,
      uiAmount: b.uiAmount,
      chain: b.chain,
    });
    return c.json(result);
  }
);

// ── POST /v1/finance/price ────────────────────────────────────────────────────
financeRoutes.post(
  "/price",
  zValidator("json", FinancePriceRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await checkPrice({
      assetType: b.assetType,
      ...(b.symbol !== undefined ? { symbol: b.symbol } : {}),
      ...(b.tokenAddress !== undefined ? { tokenAddress: b.tokenAddress } : {}),
      ...(b.proposedPrice !== undefined ? { proposedPrice: b.proposedPrice } : {}),
      ...(b.maxAgeSeconds !== undefined ? { maxAgeSeconds: b.maxAgeSeconds } : {}),
      ...(b.divergenceThresholdPct !== undefined
        ? { divergenceThresholdPct: b.divergenceThresholdPct }
        : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/finance/symbol ───────────────────────────────────────────────────
financeRoutes.post(
  "/symbol",
  zValidator("json", FinanceSymbolRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await resolveSymbol({
      symbol: b.symbol,
      assetType: b.assetType,
      ...(b.expectedName !== undefined ? { expectedName: b.expectedName } : {}),
      ...(b.chain !== undefined ? { chain: b.chain } : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/finance/token/risk ───────────────────────────────────────────────
financeRoutes.post(
  "/token/risk",
  zValidator("json", FinanceTokenRiskRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await checkRug({
      address: b.address,
      chain: b.chain,
      ...(b.maxRugScore !== undefined ? { maxRugScore: b.maxRugScore } : {}),
      ...(b.requireLpLocked !== undefined ? { requireLpLocked: b.requireLpLocked } : {}),
      ...(b.blockIfMintAuthority !== undefined
        ? { blockIfMintAuthority: b.blockIfMintAuthority }
        : {}),
      ...(b.blockIfFreezeAuthority !== undefined
        ? { blockIfFreezeAuthority: b.blockIfFreezeAuthority }
        : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/finance/slippage ─────────────────────────────────────────────────
financeRoutes.post(
  "/slippage",
  zValidator("json", FinanceSlippageRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await checkLiquidity({
      tokenAddress: b.tokenAddress,
      chain: b.chain,
      tradeUsd: b.tradeUsd,
      ...(b.maxPriceImpactPct !== undefined
        ? { maxPriceImpactPct: b.maxPriceImpactPct }
        : {}),
      ...(b.minLiquidityUsd !== undefined ? { minLiquidityUsd: b.minLiquidityUsd } : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/finance/order/risk ───────────────────────────────────────────────
financeRoutes.post(
  "/order/risk",
  zValidator("json", FinanceOrderRiskRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await checkOrder({
      assetType: b.assetType,
      side: b.side,
      tradeUsd: b.tradeUsd,
      ...(b.symbol !== undefined ? { symbol: b.symbol } : {}),
      ...(b.tokenAddress !== undefined ? { tokenAddress: b.tokenAddress } : {}),
      ...(b.portfolioValueUsd !== undefined ? { portfolioValueUsd: b.portfolioValueUsd } : {}),
      ...(b.chain !== undefined ? { chain: b.chain } : {}),
      ...(b.leverage !== undefined ? { leverage: b.leverage } : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/finance/position/check ───────────────────────────────────────────
financeRoutes.post(
  "/position/check",
  zValidator("json", FinancePositionCheckRequest),
  (c) => {
    const { trade: t, portfolio: p, rules: r } = c.req.valid("json");

    const trade: TradeProposal = {
      symbol: t.symbol,
      side: t.side,
      tradeUsd: t.tradeUsd,
      assetType: t.assetType,
      ...(t.leverage !== undefined ? { leverage: t.leverage } : {}),
    };

    const portfolio: PortfolioSnapshot = {
      totalValueUsd: p.totalValueUsd,
      cashUsd: p.cashUsd,
      ...(p.dailyPnlUsd !== undefined ? { dailyPnlUsd: p.dailyPnlUsd } : {}),
      ...(p.openPositions !== undefined ? { openPositions: p.openPositions } : {}),
      ...(p.assetAllocation !== undefined
        ? { assetAllocation: p.assetAllocation }
        : {}),
    };

    let rules: GuardianRules | undefined;
    if (r !== undefined) {
      rules = {
        ...(r.maxPositionPct !== undefined ? { maxPositionPct: r.maxPositionPct } : {}),
        ...(r.maxDailyLossPct !== undefined ? { maxDailyLossPct: r.maxDailyLossPct } : {}),
        ...(r.maxOpenPositions !== undefined
          ? { maxOpenPositions: r.maxOpenPositions }
          : {}),
        ...(r.maxLeverage !== undefined ? { maxLeverage: r.maxLeverage } : {}),
        ...(r.allowedAssets !== undefined ? { allowedAssets: r.allowedAssets } : {}),
        ...(r.killSwitch !== undefined ? { killSwitch: r.killSwitch } : {}),
        ...(r.maxSingleTradeUsd !== undefined
          ? { maxSingleTradeUsd: r.maxSingleTradeUsd }
          : {}),
      };
    }

    const result = checkPosition(trade, portfolio, rules);
    return c.json(result);
  }
);

export { financeRoutes };
