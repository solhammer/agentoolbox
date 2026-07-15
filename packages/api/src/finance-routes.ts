import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
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

const CHAIN_ENUM = z.enum([
  "solana",
  "ethereum",
  "bsc",
  "polygon",
  "base",
  "arbitrum",
]);

// ── POST /v1/finance/units ────────────────────────────────────────────────────
financeRoutes.post(
  "/units",
  zValidator(
    "json",
    z.object({
      tokenAddress: z.string(),
      rawAmount: z.string(),
      uiAmount: z.number().positive(),
      chain: CHAIN_ENUM,
    })
  ),
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
  zValidator(
    "json",
    z
      .object({
        symbol: z.string().optional(),
        tokenAddress: z.string().optional(),
        assetType: z.enum(["crypto", "stock", "forex"]),
        proposedPrice: z.number().positive().optional(),
        maxAgeSeconds: z.number().int().positive().optional(),
        divergenceThresholdPct: z.number().positive().optional(),
      })
      .refine((d) => d.symbol || d.tokenAddress, {
        message: "Provide symbol or tokenAddress",
      })
  ),
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
  zValidator(
    "json",
    z.object({
      symbol: z.string(),
      assetType: z.enum(["crypto", "stock"]),
      expectedName: z.string().optional(),
      chain: z.string().optional(),
    })
  ),
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
  zValidator(
    "json",
    z.object({
      address: z.string(),
      chain: CHAIN_ENUM,
      maxRugScore: z.number().optional(),
      requireLpLocked: z.boolean().optional(),
      blockIfMintAuthority: z.boolean().optional(),
      blockIfFreezeAuthority: z.boolean().optional(),
    })
  ),
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
  zValidator(
    "json",
    z.object({
      tokenAddress: z.string(),
      chain: z.string(),
      tradeUsd: z.number().positive(),
      maxPriceImpactPct: z.number().positive().optional(),
      minLiquidityUsd: z.number().positive().optional(),
    })
  ),
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
  zValidator(
    "json",
    z.object({
      symbol: z.string().optional(),
      tokenAddress: z.string().optional(),
      assetType: z.enum(["crypto", "stock"]),
      side: z.enum(["buy", "sell"]),
      tradeUsd: z.number().positive(),
      portfolioValueUsd: z.number().positive().optional(),
      chain: z.string().optional(),
      leverage: z.number().positive().optional(),
    })
  ),
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
  zValidator(
    "json",
    z.object({
      trade: z.object({
        symbol: z.string(),
        side: z.enum(["buy", "sell", "long", "short"]),
        tradeUsd: z.number().positive(),
        leverage: z.number().positive().optional(),
        assetType: z.enum(["crypto", "stock", "forex"]),
      }),
      portfolio: z.object({
        totalValueUsd: z.number().positive(),
        cashUsd: z.number().nonnegative(),
        dailyPnlUsd: z.number().optional(),
        openPositions: z.number().int().nonnegative().optional(),
        assetAllocation: z.record(z.string(), z.number()).optional(),
      }),
      rules: z
        .object({
          maxPositionPct: z.number().positive().max(100).optional(),
          maxDailyLossPct: z.number().positive().optional(),
          maxOpenPositions: z.number().int().positive().optional(),
          maxLeverage: z.number().positive().optional(),
          allowedAssets: z.array(z.string()).optional(),
          killSwitch: z.boolean().optional(),
          maxSingleTradeUsd: z.number().positive().optional(),
        })
        .optional(),
    })
  ),
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
