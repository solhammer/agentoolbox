import { z } from "../openapi.js";
import { VerdictSchema, LatencyMsSchema, registerTool } from "../shared.js";

// ── Shared fragments ──────────────────────────────────────────────────────────

const CHAIN_ENUM = z.enum([
  "solana",
  "ethereum",
  "bsc",
  "polygon",
  "base",
  "arbitrum",
]);

/** Severity values used by the finance package (note: "info" instead of "low"). */
const FinanceSeveritySchema = z.enum(["info", "warn", "critical"]);

/** A single risk item returned by all FinanceCheckResult-based responses. */
const RiskItemSchema = z.object({
  type: z.string(),
  severity: FinanceSeveritySchema,
  detail: z.string(),
});

/** Fields common to every FinanceCheckResult-based response. */
const FinanceCheckResultSchema = z.object({
  verdict: VerdictSchema,
  score: z.number(),
  risks: z.array(RiskItemSchema),
  latencyMs: LatencyMsSchema,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/units  (financeUnits)  — credit cost: 1
// ═══════════════════════════════════════════════════════════════════════════

export const FinanceUnitsRequest = z.object({
  tokenAddress: z.string(),
  rawAmount: z.string(),
  uiAmount: z.number().positive(),
  chain: CHAIN_ENUM,
});

export const FinanceUnitsResponse = FinanceCheckResultSchema.extend({
  authoritative_decimals: z.number().int().nullable(),
  expected_raw: z.string().nullable(),
  actual_raw: z.string(),
  deviation_pct: z.number().nullable(),
});

registerTool({
  path: "/v1/finance/units",
  operationId: "financeUnits",
  summary:
    "Guard against decimal-scaling errors by verifying raw on-chain amount against the token's authoritative decimals.",
  tags: ["finance"],
  credits: 1,
  request: FinanceUnitsRequest,
  response: FinanceUnitsResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/price  (financePrice)  — credit cost: 2
// ═══════════════════════════════════════════════════════════════════════════

export const FinancePriceRequest = z
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
  });

const PriceSourceSchema = z.object({
  name: z.string(),
  priceUsd: z.number(),
  ageSeconds: z.number().nullable(),
  available: z.boolean(),
});

export const FinancePriceResponse = FinanceCheckResultSchema.extend({
  sources: z.array(PriceSourceSchema),
  consensusPrice: z.number().nullable(),
  proposedPriceDeviation: z.number().nullable(),
});

registerTool({
  path: "/v1/finance/price",
  operationId: "financePrice",
  summary:
    "Cross-validate an asset price against multiple sources (CoinGecko, DexScreener, Yahoo Finance) and flag stale or hallucinated prices.",
  tags: ["finance"],
  credits: 2,
  request: FinancePriceRequest,
  response: FinancePriceResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/symbol  (financeSymbol)  — credit cost: 1
// ═══════════════════════════════════════════════════════════════════════════

export const FinanceSymbolRequest = z.object({
  symbol: z.string(),
  assetType: z.enum(["crypto", "stock"]),
  expectedName: z.string().optional(),
  chain: z.string().optional(),
});

const SymbolMatchSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string().optional(),
  liquidity: z.number().optional(),
});

export const FinanceSymbolResponse = z.object({
  found: z.boolean(),
  matches: z.array(SymbolMatchSchema),
  ambiguous: z.boolean(),
  verdict: VerdictSchema,
});

registerTool({
  path: "/v1/finance/symbol",
  operationId: "financeSymbol",
  summary:
    "Resolve a ticker symbol or token to a confirmed on-chain identity, detecting ambiguous or imposter tokens.",
  tags: ["finance"],
  credits: 1,
  request: FinanceSymbolRequest,
  response: FinanceSymbolResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/token/risk  (financeTokenRisk)  — credit cost: 3
// ═══════════════════════════════════════════════════════════════════════════

export const FinanceTokenRiskRequest = z.object({
  address: z.string(),
  chain: CHAIN_ENUM,
  maxRugScore: z.number().optional(),
  requireLpLocked: z.boolean().optional(),
  blockIfMintAuthority: z.boolean().optional(),
  blockIfFreezeAuthority: z.boolean().optional(),
});

export const FinanceTokenRiskResponse = FinanceCheckResultSchema.extend({
  rugScore: z.number().nullable(),
  mintAuthorityActive: z.boolean().nullable(),
  freezeAuthorityActive: z.boolean().nullable(),
  lpLockedPct: z.number().nullable(),
  specificRisks: z.array(z.string()),
});

registerTool({
  path: "/v1/finance/token/risk",
  operationId: "financeTokenRisk",
  summary:
    "Run a rug-pull risk assessment on a token using RugCheck — checks mint/freeze authority, LP lock, and overall rug score.",
  tags: ["finance"],
  credits: 3,
  request: FinanceTokenRiskRequest,
  response: FinanceTokenRiskResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/slippage  (financeSlippage)  — credit cost: 2
// ═══════════════════════════════════════════════════════════════════════════

export const FinanceSlippageRequest = z.object({
  tokenAddress: z.string(),
  chain: z.string(),
  tradeUsd: z.number().positive(),
  maxPriceImpactPct: z.number().positive().optional(),
  minLiquidityUsd: z.number().positive().optional(),
});

export const FinanceSlippageResponse = FinanceCheckResultSchema.extend({
  poolLiquidityUsd: z.number().nullable(),
  estimatedPriceImpactPct: z.number().nullable(),
  volume24h: z.number().nullable(),
  washTradingFlag: z.boolean(),
});

registerTool({
  path: "/v1/finance/slippage",
  operationId: "financeSlippage",
  summary:
    "Check pool liquidity and estimate price impact (slippage) for a proposed trade size.",
  tags: ["finance"],
  credits: 2,
  request: FinanceSlippageRequest,
  response: FinanceSlippageResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/order/risk  (financeOrderRisk)  — credit cost: 5
// ═══════════════════════════════════════════════════════════════════════════

export const FinanceOrderRiskRequest = z.object({
  symbol: z.string().optional(),
  tokenAddress: z.string().optional(),
  assetType: z.enum(["crypto", "stock"]),
  side: z.enum(["buy", "sell"]),
  tradeUsd: z.number().positive(),
  portfolioValueUsd: z.number().positive().optional(),
  chain: z.string().optional(),
  leverage: z.number().positive().optional(),
});

/** NamedCheck = FinanceCheckResult & { name: string } */
const NamedCheckSchema = FinanceCheckResultSchema.extend({
  name: z.string(),
});

export const FinanceOrderRiskResponse = z.object({
  verdict: VerdictSchema,
  overallScore: z.number(),
  checks: z.array(NamedCheckSchema),
  blockedBy: z.string().nullable(),
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/finance/order/risk",
  operationId: "financeOrderRisk",
  summary:
    "Full pre-trade risk gate — runs rug, liquidity, price, and position checks in parallel and returns a composite verdict.",
  tags: ["finance"],
  credits: 5,
  request: FinanceOrderRiskRequest,
  response: FinanceOrderRiskResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/finance/position/check  (financePositionCheck)  — credit cost: 1
// ═══════════════════════════════════════════════════════════════════════════

export const FinancePositionCheckRequest = z.object({
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
});

export const FinancePositionCheckResponse = FinanceCheckResultSchema.extend({
  effectiveUsd: z.number(),
  positionPct: z.number().nullable(),
  violations: z.array(z.string()),
});

registerTool({
  path: "/v1/finance/position/check",
  operationId: "financePositionCheck",
  summary:
    "Deterministic position-limit and guardian-rules gate — enforces kill switch, daily-loss cap, position size, leverage, and allowed-asset constraints.",
  tags: ["finance"],
  credits: 1,
  request: FinancePositionCheckRequest,
  response: FinancePositionCheckResponse,
});
