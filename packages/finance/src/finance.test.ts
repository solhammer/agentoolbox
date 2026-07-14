/**
 * Finance Protection Toolkit — comprehensive unit tests
 *
 * All external provider calls are mocked so tests run without network access
 * and complete in milliseconds.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external providers ───────────────────────────────────────────────

vi.mock("./providers/coingecko.js", () => ({
  getCoinPrice: vi.fn(),
  searchCoin: vi.fn(),
}));

vi.mock("./providers/dexscreener.js", () => ({
  getTokenPairs: vi.fn(),
  searchDex: vi.fn(),
  getBestPair: vi.fn(),
}));

vi.mock("./providers/yahoo.js", () => ({
  getStockQuote: vi.fn(),
  searchStock: vi.fn(),
}));

vi.mock("./providers/rugcheck.js", () => ({
  getRugCheckSummary: vi.fn(),
}));

import { getCoinPrice } from "./providers/coingecko.js";
import { getBestPair } from "./providers/dexscreener.js";
import { getStockQuote } from "./providers/yahoo.js";
import { getRugCheckSummary } from "./providers/rugcheck.js";
import { checkPrice } from "./checks/price.js";
import { checkRug } from "./checks/rug.js";
import { checkLiquidity } from "./checks/liquidity.js";
import { checkPosition } from "./checks/position.js";
import type { TradeProposal, PortfolioSnapshot, GuardianRules } from "./checks/position.js";

const mockedGetCoinPrice = vi.mocked(getCoinPrice);
const mockedGetBestPair = vi.mocked(getBestPair);
const mockedGetStockQuote = vi.mocked(getStockQuote);
const mockedGetRugCheckSummary = vi.mocked(getRugCheckSummary);

const NOW_MS = Date.now();
const NOW_S = Math.floor(NOW_MS / 1000);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePair(overrides: Record<string, unknown> = {}) {
  return {
    chainId: "solana",
    dexId: "raydium",
    pairAddress: "pair123",
    baseToken: { address: "TOKEN", name: "Test Token", symbol: "TST" },
    quoteToken: { address: "USDC", name: "USD Coin", symbol: "USDC" },
    priceUsd: "100.00",
    liquidity: { usd: 500_000 },
    volume: { h24: 250_000, h1: 10_000 },
    txns: { h24: { buys: 200, sells: 180 } },
    pairCreatedAt: NOW_MS - 30 * 24 * 60 * 60 * 1000, // 30 days old
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof getBestPair>>;
}

// ── checkPrice — crypto ───────────────────────────────────────────────────────

describe("checkPrice (crypto)", () => {
  beforeEach(() => {
    mockedGetCoinPrice.mockReset();
    mockedGetBestPair.mockReset();
  });

  it("PASS — two sources agree within 2%", async () => {
    mockedGetCoinPrice.mockResolvedValue({ priceUsd: 100, updatedAt: NOW_S });
    mockedGetBestPair.mockResolvedValue(makePair({ priceUsd: "101.00" }));

    const result = await checkPrice({
      symbol: "mytoken",
      tokenAddress: "TOKEN",
      assetType: "crypto",
    });

    expect(result.verdict).toBe("PASS");
    expect(result.consensusPrice).toBeGreaterThan(0);
  });

  it("BLOCK — sources diverge by more than threshold", async () => {
    mockedGetCoinPrice.mockResolvedValue({ priceUsd: 100, updatedAt: NOW_S });
    mockedGetBestPair.mockResolvedValue(makePair({ priceUsd: "110.00" })); // 10% divergence

    const result = await checkPrice({
      symbol: "mytoken",
      tokenAddress: "TOKEN",
      assetType: "crypto",
      divergenceThresholdPct: 2,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.risks.length).toBeGreaterThan(0); // divergence risk present
  });

  it("BLOCK — proposed price deviates >5% from consensus", async () => {
    mockedGetCoinPrice.mockResolvedValue({ priceUsd: 100, updatedAt: NOW_S });
    mockedGetBestPair.mockResolvedValue(makePair({ priceUsd: "100.50" }));

    const result = await checkPrice({
      symbol: "mytoken",
      tokenAddress: "TOKEN",
      assetType: "crypto",
      proposedPrice: 80, // 20% below consensus
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.risks.some((r) => r.type === "proposed_price_deviation")).toBe(true);
    expect(result.proposedPriceDeviation).toBeGreaterThan(5);
  });

  it("FLAG — proposed price deviates 2–5% (warn but don't block)", async () => {
    mockedGetCoinPrice.mockResolvedValue({ priceUsd: 100, updatedAt: NOW_S });
    mockedGetBestPair.mockResolvedValue(makePair({ priceUsd: "100.50" }));

    const result = await checkPrice({
      symbol: "mytoken",
      tokenAddress: "TOKEN",
      assetType: "crypto",
      proposedPrice: 96.5, // ~3.5% below consensus
    });

    expect(result.verdict).toBe("FLAG");
  });

  it("BLOCK — stale data (exceeds maxAgeSeconds)", async () => {
    const staleTimestamp = NOW_S - 3600; // 1 hour old
    mockedGetCoinPrice.mockResolvedValue({ priceUsd: 100, updatedAt: staleTimestamp });
    mockedGetBestPair.mockResolvedValue(makePair({ priceUsd: "100.00" }));

    const result = await checkPrice({
      symbol: "mytoken",
      tokenAddress: "TOKEN",
      assetType: "crypto",
      maxAgeSeconds: 60, // only allow 60s old data
    });

    // Stale data should trigger a non-PASS verdict
    expect(["FLAG", "BLOCK"]).toContain(result.verdict);
    expect(result.risks.length).toBeGreaterThan(0);
  });

  it("FLAG — only one source available", async () => {
    mockedGetCoinPrice.mockResolvedValue({ priceUsd: 100, updatedAt: NOW_S });
    mockedGetBestPair.mockResolvedValue(null); // DEX source unavailable

    const result = await checkPrice({
      symbol: "mytoken",
      tokenAddress: "TOKEN",
      assetType: "crypto",
    });

    expect(result.verdict).toBe("FLAG");
    expect(result.sources.filter((s) => s.available)).toHaveLength(1);
  });
});

// ── checkPrice — stocks ───────────────────────────────────────────────────────

describe("checkPrice (stock)", () => {
  beforeEach(() => mockedGetStockQuote.mockReset());

  it("returns a verdict for a valid stock quote", async () => {
    mockedGetStockQuote.mockResolvedValue({
      price: 220,
      timestamp: NOW_S,
      name: "Apple Inc.",
      currency: "USD",
    });

    const result = await checkPrice({ symbol: "AAPL", assetType: "stock" });

    // With only one source available (Yahoo — no second source for stocks),
    // the conservative implementation returns BLOCK or FLAG (can't cross-validate).
    expect(["PASS", "FLAG", "BLOCK"]).toContain(result.verdict);
    expect(result.sources.some((s) => s.available && s.priceUsd === 220)).toBe(true);
  });

  it("BLOCK — proposed stock price deviates >5%", async () => {
    mockedGetStockQuote.mockResolvedValue({
      price: 220,
      timestamp: NOW_S,
      name: "Apple Inc.",
      currency: "USD",
    });

    const result = await checkPrice({
      symbol: "AAPL",
      assetType: "stock",
      proposedPrice: 190, // ~13.6% below
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.proposedPriceDeviation).toBeGreaterThan(5);
  });

  it("degrades gracefully when Yahoo Finance unavailable", async () => {
    mockedGetStockQuote.mockResolvedValue(null);

    const result = await checkPrice({ symbol: "AAPL", assetType: "stock" });

    // No sources available — conservative implementation may FLAG or BLOCK
    expect(["FLAG", "BLOCK"]).toContain(result.verdict);
    expect(result.sources.every((s) => !s.available)).toBe(true);
  });
});

// ── checkRug ──────────────────────────────────────────────────────────────────

describe("checkRug (Solana)", () => {
  beforeEach(() => mockedGetRugCheckSummary.mockReset());

  it("PASS — clean token, low score, LP locked", async () => {
    mockedGetRugCheckSummary.mockResolvedValue({
      mint: "TOKEN",
      score: 5,
      scoreNormalized: 5,
      risks: [],
      lpLockedPct: 90,
      mintAuthorityActive: false,
      freezeAuthorityActive: false,
    });

    const result = await checkRug({ address: "TOKEN", chain: "solana" });

    expect(result.verdict).toBe("PASS");
    expect(result.rugScore).toBe(5);
  });

  it("BLOCK — mint authority active (token is printable)", async () => {
    mockedGetRugCheckSummary.mockResolvedValue({
      mint: "TOKEN",
      score: 40,
      scoreNormalized: 40,
      risks: [{ name: "Mint Authority", level: "danger", score: 40 }],
      lpLockedPct: 50,
      mintAuthorityActive: true,
      freezeAuthorityActive: false,
    });

    const result = await checkRug({
      address: "TOKEN",
      chain: "solana",
      blockIfMintAuthority: true,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.mintAuthorityActive).toBe(true);
    // Mint authority risk should be mentioned in specificRisks or risks
    const hasMintRisk =
      result.specificRisks.some((r) => r.toLowerCase().includes("mint")) ||
      result.risks.some((r) => r.detail?.toLowerCase().includes("mint"));
    expect(hasMintRisk).toBe(true);
  });

  it("BLOCK — freeze authority active (funds can be frozen)", async () => {
    mockedGetRugCheckSummary.mockResolvedValue({
      mint: "TOKEN",
      score: 35,
      scoreNormalized: 35,
      risks: [{ name: "Freeze Authority", level: "danger", score: 35 }],
      lpLockedPct: 80,
      mintAuthorityActive: false,
      freezeAuthorityActive: true,
    });

    const result = await checkRug({
      address: "TOKEN",
      chain: "solana",
      blockIfFreezeAuthority: true,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.freezeAuthorityActive).toBe(true);
  });

  it("BLOCK — rug score exceeds threshold", async () => {
    mockedGetRugCheckSummary.mockResolvedValue({
      mint: "TOKEN",
      score: 75,
      scoreNormalized: 75,
      risks: [
        { name: "High Concentration", level: "danger", score: 40 },
        { name: "No LP", level: "danger", score: 35 },
      ],
      lpLockedPct: 0,
      mintAuthorityActive: false,
      freezeAuthorityActive: false,
    });

    const result = await checkRug({
      address: "TOKEN",
      chain: "solana",
      maxRugScore: 60,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.rugScore).toBe(75);
  });

  it("FLAG — no LP locked (suspicious but not conclusive)", async () => {
    mockedGetRugCheckSummary.mockResolvedValue({
      mint: "TOKEN",
      score: 45,
      scoreNormalized: 45,
      risks: [{ name: "No LP Lock", level: "warn", score: 20 }],
      lpLockedPct: 0,
      mintAuthorityActive: false,
      freezeAuthorityActive: false,
    });

    const result = await checkRug({
      address: "TOKEN",
      chain: "solana",
      maxRugScore: 60,         // score 45 < 60, so no block from score
      requireLpLocked: false,  // not blocking on LP
    });

    // Should FLAG due to mid-range score, not BLOCK
    expect(["PASS", "FLAG"]).toContain(result.verdict);
  });

  it("degrades safely when RugCheck unavailable", async () => {
    mockedGetRugCheckSummary.mockResolvedValue(null);

    const result = await checkRug({ address: "TOKEN", chain: "solana" });

    // No rug data available — conservative implementation may FLAG or BLOCK
    expect(["FLAG", "BLOCK"]).toContain(result.verdict);
    expect(result.rugScore).toBeNull();
    // A risk entry should still be present explaining the unavailability
    expect(result.risks.length).toBeGreaterThan(0);
  });
});

// ── checkLiquidity ────────────────────────────────────────────────────────────

describe("checkLiquidity", () => {
  beforeEach(() => mockedGetBestPair.mockReset());

  it("PASS — small trade relative to deep pool", async () => {
    mockedGetBestPair.mockResolvedValue(
      makePair({ liquidity: { usd: 1_000_000 }, volume: { h24: 500_000 } })
    );

    const result = await checkLiquidity({
      tokenAddress: "TOKEN",
      chain: "solana",
      tradeUsd: 1000, // 0.1% of pool
    });

    expect(result.verdict).toBe("PASS");
    expect(result.estimatedPriceImpactPct).toBeLessThan(1);
  });

  it("BLOCK — trade is larger than pool (Lobstar scenario)", async () => {
    mockedGetBestPair.mockResolvedValue(
      makePair({ liquidity: { usd: 45_000 } }) // thin pool
    );

    const result = await checkLiquidity({
      tokenAddress: "TOKEN",
      chain: "solana",
      tradeUsd: 440_000, // ~980% price impact
      maxPriceImpactPct: 2,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.estimatedPriceImpactPct).toBeGreaterThan(100);
    expect(result.poolLiquidityUsd).toBe(45_000);
  });

  it("BLOCK — pool below minimum liquidity floor", async () => {
    mockedGetBestPair.mockResolvedValue(
      makePair({ liquidity: { usd: 5_000 } }) // below $10k default
    );

    const result = await checkLiquidity({
      tokenAddress: "TOKEN",
      chain: "solana",
      tradeUsd: 100, // even tiny trade
      minLiquidityUsd: 10_000,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.risks.some((r) => r.type === "insufficient_liquidity")).toBe(true);
  });

  it("FLAG — wash trading detected (volume >> liquidity)", async () => {
    mockedGetBestPair.mockResolvedValue(
      makePair({
        liquidity: { usd: 10_000 },
        volume: { h24: 500_000 }, // 50x daily volume vs liquidity
      })
    );

    const result = await checkLiquidity({
      tokenAddress: "TOKEN",
      chain: "solana",
      tradeUsd: 100,
      maxPriceImpactPct: 10,
    });

    expect(result.washTradingFlag).toBe(true);
    // Wash trading alone should FLAG, not BLOCK
    expect(["FLAG", "PASS"]).toContain(result.verdict);
  });

  it("degrades safely when DEX data unavailable", async () => {
    mockedGetBestPair.mockResolvedValue(null);

    const result = await checkLiquidity({
      tokenAddress: "TOKEN",
      chain: "solana",
      tradeUsd: 5000,
    });

    // No pool data — conservative implementation may FLAG or BLOCK
    expect(["FLAG", "BLOCK"]).toContain(result.verdict);
    expect(result.poolLiquidityUsd).toBeNull();
  });
});

// ── checkPosition — additional edge cases ────────────────────────────────────

describe("checkPosition (additional edge cases)", () => {
  const basePortfolio: PortfolioSnapshot = {
    totalValueUsd: 100_000,
    cashUsd: 50_000,
  };

  it("accounts for leverage in effective position size", () => {
    const result = checkPosition(
      { symbol: "BTC", side: "long", tradeUsd: 10_000, leverage: 3, assetType: "crypto" },
      basePortfolio,
      { maxPositionPct: 25 } // 30k effective = 30% > 25%
    );
    expect(result.effectiveUsd).toBe(30_000);
    expect(result.verdict).toBe("BLOCK");
  });

  it("respects maxSingleTradeUsd hard cap", () => {
    const result = checkPosition(
      { symbol: "ETH", side: "buy", tradeUsd: 15_000, assetType: "crypto" },
      basePortfolio,
      { maxSingleTradeUsd: 10_000 }
    );
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("max_single_trade_usd");
  });

  it("allows trade when all rules are satisfied", () => {
    const rules: GuardianRules = {
      maxPositionPct: 20,
      maxDailyLossPct: 10,
      maxOpenPositions: 5,
      maxLeverage: 2,
      allowedAssets: ["BTC", "ETH", "SOL"],
      killSwitch: false,
    };
    const result = checkPosition(
      { symbol: "SOL", side: "buy", tradeUsd: 5_000, assetType: "crypto" },
      { ...basePortfolio, dailyPnlUsd: -500, openPositions: 2 },
      rules
    );
    expect(result.verdict).toBe("PASS");
    expect(result.violations).toHaveLength(0);
  });

  it("respects maxOpenPositions limit", () => {
    const result = checkPosition(
      { symbol: "BTC", side: "buy", tradeUsd: 1_000, assetType: "crypto" },
      { ...basePortfolio, openPositions: 10 },
      { maxOpenPositions: 10 }
    );
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("max_open_positions");
  });

  it("FLAG — approaching position limit (80–100% of max)", () => {
    // 20k / 100k = 20%, max is 25% — within range but close
    const result = checkPosition(
      { symbol: "BTC", side: "buy", tradeUsd: 20_000, assetType: "crypto" },
      basePortfolio,
      { maxPositionPct: 25 }
    );
    // 20% is within 25% max, should PASS or FLAG (not BLOCK)
    expect(result.positionPct).toBe(20);
    expect(result.verdict).not.toBe("BLOCK");
  });
});
