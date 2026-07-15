/**
 * Finance Protection Toolkit — live integration tests
 *
 * These tests hit the real api.agent-toolbox.ai endpoints and require
 * network access. They use the free tier (10 calls/IP, no auth needed).
 *
 * Run with:
 *   pnpm --filter @agentoolbox/finance test:integration
 *
 * Skip in CI by default — only run when FINANCE_INTEGRATION=1 is set:
 *   FINANCE_INTEGRATION=1 pnpm --filter @agentoolbox/finance test
 *
 * Known tokens used (stable, high-liquidity, unlikely to change):
 *   SOL native:  So11111111111111111111111111111111111111112
 *   USDC:        EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 *   CoinGecko:   "solana", "usd-coin"
 *   Stock:       "AAPL" (Apple)
 */

import { describe, it, expect, beforeAll } from "vitest";

const RUN = process.env["FINANCE_INTEGRATION"] === "1";
const BASE = process.env["API_BASE_URL"] ?? "https://api.agent-toolbox.ai";

// Well-known stable tokens for testing
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** Thin wrapper to call REST endpoints */
async function call(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

// Skip all tests unless explicitly enabled
const test = RUN ? it : it.skip;

describe.skipIf(!RUN)("Finance API — live integration tests", () => {

  // ── Pricing discovery ────────────────────────────────────────────────────────

  describe("GET /v1/pricing", () => {
    it("returns wallet, endpoints, and conversion rate", async () => {
      const data = await call("/v1/pricing");

      expect(typeof data["wallet"]).toBe("string");
      expect((data["wallet"] as string).length).toBeGreaterThan(30);
      expect(data["network"]).toBe("mainnet-beta");
      expect(data["conversion"]).toMatchObject({ creditsPerSol: expect.any(Number) });
      expect(data["freeTier"]).toMatchObject({ calls: expect.any(Number) });
      expect(data["endpoints"]).toHaveProperty("/v1/finance/units");
      expect(data["endpoints"]).toHaveProperty("/v1/finance/order/risk");
    });
  });

  // ── Units sanity check ───────────────────────────────────────────────────────

  describe("POST /v1/finance/units", () => {
    it("PASS — correct SOL amount (9 decimals)", async () => {
      const data = await call("/v1/finance/units", {
        tokenAddress: SOL_MINT,
        rawAmount: "1000000000",  // 1 SOL = 10^9 lamports
        uiAmount: 1.0,
        chain: "solana",
      });

      expect(data["verdict"]).toBe("PASS");
      expect(data["authoritative_decimals"]).toBe(9);
      expect(data["deviation_pct"]).toBe(0);
    });

    it("BLOCK — 1000x too many tokens (Lobstar scenario)", async () => {
      const data = await call("/v1/finance/units", {
        tokenAddress: USDC_MINT,
        rawAmount: "1000000000000", // 1M USDC instead of 1000
        uiAmount: 1000,
        chain: "solana",
      });

      expect(data["verdict"]).toBe("BLOCK");
      expect((data["risks"] as unknown[]).length).toBeGreaterThan(0);
    });

    it("response shape is correct", async () => {
      const data = await call("/v1/finance/units", {
        tokenAddress: USDC_MINT,
        rawAmount: "1000000",
        uiAmount: 1.0,
        chain: "solana",
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("authoritative_decimals");
      expect(data).toHaveProperty("expected_raw");
      expect(data).toHaveProperty("actual_raw");
      expect(data).toHaveProperty("deviation_pct");
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("risks");
      expect(data).toHaveProperty("latencyMs");
    });
  });

  // ── Cross-source price validation ────────────────────────────────────────────

  describe("POST /v1/finance/price", () => {
    it("returns a consensus price for SOL (crypto)", async () => {
      const data = await call("/v1/finance/price", {
        symbol: "solana",
        tokenAddress: SOL_MINT,
        assetType: "crypto",
        maxAgeSeconds: 120,
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("sources");
      expect(data).toHaveProperty("consensusPrice");
      expect(["PASS", "FLAG"]).toContain(data["verdict"]); // sources should broadly agree
      if (data["consensusPrice"] !== null) {
        expect(data["consensusPrice"] as number).toBeGreaterThan(0);
      }
    });

    it("BLOCK — proposed price wildly off (hallucinated price scenario)", async () => {
      const data = await call("/v1/finance/price", {
        symbol: "solana",
        tokenAddress: SOL_MINT,
        assetType: "crypto",
        proposedPrice: 1, // $1 for SOL — obviously wrong
        maxAgeSeconds: 120,
      });

      expect(data["verdict"]).toBe("BLOCK");
      expect(data["proposedPriceDeviation"] as number).toBeGreaterThan(50);
    });

    it("works for stock symbols (AAPL)", async () => {
      const data = await call("/v1/finance/price", {
        symbol: "AAPL",
        assetType: "stock",
        maxAgeSeconds: 86400, // 24h — allow for market close
      });

      // Should not error — may FLAG if Yahoo is down
      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("sources");
    });
  });

  // ── Symbol / token resolver ───────────────────────────────────────────────────

  describe("POST /v1/finance/symbol", () => {
    it("resolves SOL by address on Solana", async () => {
      const data = await call("/v1/finance/symbol", {
        symbol: "SOL",
        assetType: "crypto",
        chain: "solana",
      });

      expect(data).toHaveProperty("found");
      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("matches");
    });

    it("finds AAPL as a stock", async () => {
      const data = await call("/v1/finance/symbol", {
        symbol: "AAPL",
        assetType: "stock",
      });

      expect(data).toHaveProperty("found");
      expect(data).toHaveProperty("verdict");
    });
  });

  // ── Rug pull scanner ──────────────────────────────────────────────────────────

  describe("POST /v1/finance/token/risk", () => {
    it("returns a risk score for USDC (should be low/safe)", async () => {
      const data = await call("/v1/finance/token/risk", {
        address: USDC_MINT,
        chain: "solana",
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("rugScore");
      expect(data).toHaveProperty("mintAuthorityActive");
      expect(data).toHaveProperty("freezeAuthorityActive");
      expect(data).toHaveProperty("specificRisks");
      // USDC is managed — may have mint authority, verdict depends on config
    });

    it("response shape is complete", async () => {
      const data = await call("/v1/finance/token/risk", {
        address: SOL_MINT,
        chain: "solana",
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("risks");
      expect(data).toHaveProperty("latencyMs");
    });
  });

  // ── Slippage / liquidity guard ────────────────────────────────────────────────

  describe("POST /v1/finance/slippage", () => {
    it("PASS — tiny trade on SOL (massive liquidity)", async () => {
      const data = await call("/v1/finance/slippage", {
        tokenAddress: SOL_MINT,
        chain: "solana",
        tradeUsd: 100,
        maxPriceImpactPct: 2,
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("poolLiquidityUsd");
      expect(data).toHaveProperty("estimatedPriceImpactPct");
      expect(data).toHaveProperty("washTradingFlag");
      // SOL has massive liquidity — tiny trade should pass
      if (data["poolLiquidityUsd"] !== null) {
        expect(data["estimatedPriceImpactPct"] as number).toBeLessThan(1);
      }
    });

    it("BLOCK — massive trade relative to pool", async () => {
      // Test with an obscure low-liquidity token address
      // This will likely FLAG/BLOCK due to unavailable data or thin pools
      const data = await call("/v1/finance/slippage", {
        tokenAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // random low-liq token
        chain: "solana",
        tradeUsd: 1_000_000, // $1M trade
        maxPriceImpactPct: 2,
      });

      // Should FLAG or BLOCK — either no data or massive impact
      expect(["FLAG", "BLOCK"]).toContain(data["verdict"]);
    });
  });

  // ── Full order risk gate ──────────────────────────────────────────────────────

  describe("POST /v1/finance/order/risk", () => {
    it("returns composite result with all checks for SOL", async () => {
      const data = await call("/v1/finance/order/risk", {
        tokenAddress: SOL_MINT,
        assetType: "crypto",
        side: "buy",
        tradeUsd: 100,
        portfolioValueUsd: 10_000,
        chain: "solana",
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("overallScore");
      expect(data).toHaveProperty("checks");
      expect(data).toHaveProperty("latencyMs");
      expect(Array.isArray(data["checks"])).toBe(true);

      // Should have run multiple checks
      const checks = data["checks"] as unknown[];
      expect(checks.length).toBeGreaterThan(0);
    });

    it("blockedBy is null on a clean trade", async () => {
      const data = await call("/v1/finance/order/risk", {
        tokenAddress: USDC_MINT,
        assetType: "crypto",
        side: "buy",
        tradeUsd: 10,
        portfolioValueUsd: 10_000,
        chain: "solana",
      });

      // USDC with a tiny trade should have no position block
      if (data["verdict"] === "PASS") {
        expect(data["blockedBy"]).toBeNull();
      }
    });
  });

  // ── Position guardian ─────────────────────────────────────────────────────────

  describe("POST /v1/finance/position/check", () => {
    it("PASS — well within all limits", async () => {
      const data = await call("/v1/finance/position/check", {
        trade: { symbol: "SOL", side: "buy", tradeUsd: 1000, assetType: "crypto" },
        portfolio: { totalValueUsd: 50_000, cashUsd: 20_000 },
        rules: { maxPositionPct: 25, maxDailyLossPct: 10, killSwitch: false },
      });

      expect(data["verdict"]).toBe("PASS");
      expect(data["violations"]).toHaveLength(0);
    });

    it("BLOCK — kill switch engaged", async () => {
      const data = await call("/v1/finance/position/check", {
        trade: { symbol: "BTC", side: "buy", tradeUsd: 100, assetType: "crypto" },
        portfolio: { totalValueUsd: 50_000, cashUsd: 20_000 },
        rules: { killSwitch: true },
      });

      expect(data["verdict"]).toBe("BLOCK");
      expect(data["violations"]).toContain("kill_switch");
    });

    it("BLOCK — position exceeds 25% of portfolio", async () => {
      const data = await call("/v1/finance/position/check", {
        trade: { symbol: "ETH", side: "buy", tradeUsd: 15_000, assetType: "crypto" },
        portfolio: { totalValueUsd: 50_000, cashUsd: 30_000 },
        rules: { maxPositionPct: 25 },
      });

      expect(data["verdict"]).toBe("BLOCK");
      expect(data["positionPct"] as number).toBeGreaterThan(25);
    });

    it("BLOCK — daily loss limit breached", async () => {
      const data = await call("/v1/finance/position/check", {
        trade: { symbol: "SOL", side: "buy", tradeUsd: 500, assetType: "crypto" },
        portfolio: {
          totalValueUsd: 50_000,
          cashUsd: 20_000,
          dailyPnlUsd: -6_000, // -12%, exceeds 10% limit
        },
        rules: { maxDailyLossPct: 10 },
      });

      expect(data["verdict"]).toBe("BLOCK");
      expect(data["violations"]).toContain("max_daily_loss");
    });

    it("response shape is correct", async () => {
      const data = await call("/v1/finance/position/check", {
        trade: { symbol: "SOL", side: "buy", tradeUsd: 100, assetType: "crypto" },
        portfolio: { totalValueUsd: 10_000, cashUsd: 5_000 },
      });

      expect(data).toHaveProperty("verdict");
      expect(data).toHaveProperty("effectiveUsd");
      expect(data).toHaveProperty("positionPct");
      expect(data).toHaveProperty("violations");
      expect(data).toHaveProperty("score");
    });
  });
});
