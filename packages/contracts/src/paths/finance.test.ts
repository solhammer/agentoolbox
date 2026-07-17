import { describe, it, expect } from "vitest";
import {
  FinanceUnitsResponse,
  FinancePriceResponse,
  FinanceSymbolResponse,
  FinanceTokenRiskResponse,
  FinanceSlippageResponse,
  FinanceOrderRiskResponse,
  FinancePositionCheckResponse,
} from "./finance.js";

describe("finance contracts", () => {
  // ── financeUnits ─────────────────────────────────────────────────────────

  it("FinanceUnitsResponse validates a real decimal-ok result", () => {
    const parsed = FinanceUnitsResponse.parse({
      verdict: "PASS",
      score: 0,
      risks: [],
      latencyMs: 42,
      authoritative_decimals: 6,
      expected_raw: "1000000",
      actual_raw: "1000000",
      deviation_pct: 0,
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.authoritative_decimals).toBe(6);
  });

  it("FinanceUnitsResponse validates a decimal-scaling error (BLOCK)", () => {
    const parsed = FinanceUnitsResponse.parse({
      verdict: "BLOCK",
      score: 100,
      risks: [
        {
          type: "decimal_scaling_error",
          severity: "critical",
          detail: "Raw amount deviates 100000.00% from expected.",
        },
      ],
      latencyMs: 38,
      authoritative_decimals: 6,
      expected_raw: "1000000",
      actual_raw: "1",
      deviation_pct: 999999,
    });
    expect(parsed.verdict).toBe("BLOCK");
  });

  // ── financePrice ─────────────────────────────────────────────────────────

  it("FinancePriceResponse validates a real price-ok result", () => {
    const parsed = FinancePriceResponse.parse({
      verdict: "PASS",
      score: 0,
      risks: [],
      latencyMs: 120,
      sources: [
        { name: "coingecko", priceUsd: 65000, ageSeconds: 10, available: true },
        { name: "dexscreener", priceUsd: 65100, ageSeconds: null, available: true },
      ],
      consensusPrice: 65050,
      proposedPriceDeviation: null,
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.sources).toHaveLength(2);
  });

  it("FinancePriceResponse validates a no-source BLOCK result", () => {
    const parsed = FinancePriceResponse.parse({
      verdict: "BLOCK",
      score: 100,
      risks: [
        { type: "no_price_source", severity: "critical", detail: "No price source available." },
      ],
      latencyMs: 80,
      sources: [],
      consensusPrice: null,
      proposedPriceDeviation: null,
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.consensusPrice).toBeNull();
  });

  // ── financeSymbol ─────────────────────────────────────────────────────────

  it("FinanceSymbolResponse validates an unambiguous PASS result", () => {
    const parsed = FinanceSymbolResponse.parse({
      found: true,
      matches: [{ symbol: "BTC", name: "Bitcoin" }],
      ambiguous: false,
      verdict: "PASS",
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.found).toBe(true);
  });

  it("FinanceSymbolResponse validates a not-found BLOCK result", () => {
    const parsed = FinanceSymbolResponse.parse({
      found: false,
      matches: [],
      ambiguous: false,
      verdict: "BLOCK",
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.found).toBe(false);
  });

  // ── financeTokenRisk ──────────────────────────────────────────────────────

  it("FinanceTokenRiskResponse validates a clean token PASS", () => {
    const parsed = FinanceTokenRiskResponse.parse({
      verdict: "PASS",
      score: 0,
      risks: [],
      latencyMs: 200,
      rugScore: 10,
      mintAuthorityActive: false,
      freezeAuthorityActive: false,
      lpLockedPct: 95,
      specificRisks: [],
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.rugScore).toBe(10);
  });

  it("FinanceTokenRiskResponse validates a BLOCK on mint authority", () => {
    const parsed = FinanceTokenRiskResponse.parse({
      verdict: "BLOCK",
      score: 90,
      risks: [
        {
          type: "mint_authority_active",
          severity: "critical",
          detail: "Mint authority is still active — supply can be inflated.",
        },
      ],
      latencyMs: 180,
      rugScore: 75,
      mintAuthorityActive: true,
      freezeAuthorityActive: false,
      lpLockedPct: null,
      specificRisks: ["mint_authority_active"],
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.mintAuthorityActive).toBe(true);
  });

  // ── financeSlippage ───────────────────────────────────────────────────────

  it("FinanceSlippageResponse validates a low-impact PASS result", () => {
    const parsed = FinanceSlippageResponse.parse({
      verdict: "PASS",
      score: 0,
      risks: [],
      latencyMs: 95,
      poolLiquidityUsd: 500000,
      estimatedPriceImpactPct: 0.4,
      volume24h: 1200000,
      washTradingFlag: false,
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.poolLiquidityUsd).toBe(500000);
  });

  it("FinanceSlippageResponse validates a no-liquidity BLOCK result", () => {
    const parsed = FinanceSlippageResponse.parse({
      verdict: "BLOCK",
      score: 100,
      risks: [
        { type: "no_liquidity_data", severity: "critical", detail: "No liquidity data." },
      ],
      latencyMs: 60,
      poolLiquidityUsd: null,
      estimatedPriceImpactPct: null,
      volume24h: null,
      washTradingFlag: false,
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.poolLiquidityUsd).toBeNull();
  });

  // ── financeOrderRisk ──────────────────────────────────────────────────────

  it("FinanceOrderRiskResponse validates a composite PASS result", () => {
    const parsed = FinanceOrderRiskResponse.parse({
      verdict: "PASS",
      overallScore: 0,
      checks: [
        { name: "price", verdict: "PASS", score: 0, risks: [], latencyMs: 110 },
        { name: "position", verdict: "PASS", score: 0, risks: [], latencyMs: 1 },
      ],
      blockedBy: null,
      latencyMs: 115,
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.checks).toHaveLength(2);
    expect(parsed.blockedBy).toBeNull();
  });

  it("FinanceOrderRiskResponse validates a rug-blocked result", () => {
    const parsed = FinanceOrderRiskResponse.parse({
      verdict: "BLOCK",
      overallScore: 90,
      checks: [
        {
          name: "rug",
          verdict: "BLOCK",
          score: 90,
          risks: [
            {
              type: "mint_authority_active",
              severity: "critical",
              detail: "Mint authority is still active.",
            },
          ],
          latencyMs: 200,
        },
        { name: "price", verdict: "PASS", score: 0, risks: [], latencyMs: 90 },
      ],
      blockedBy: "rug",
      latencyMs: 210,
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.blockedBy).toBe("rug");
  });

  // ── financePositionCheck ──────────────────────────────────────────────────

  it("FinancePositionCheckResponse validates a within-limits PASS result", () => {
    const parsed = FinancePositionCheckResponse.parse({
      verdict: "PASS",
      score: 0,
      risks: [],
      latencyMs: 1,
      effectiveUsd: 5000,
      positionPct: 5,
      violations: [],
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.effectiveUsd).toBe(5000);
  });

  it("FinancePositionCheckResponse validates a kill-switch BLOCK result", () => {
    const parsed = FinancePositionCheckResponse.parse({
      verdict: "BLOCK",
      score: 100,
      risks: [
        {
          type: "kill_switch",
          severity: "critical",
          detail: "Kill switch is engaged — all trades are blocked.",
        },
      ],
      latencyMs: 0,
      effectiveUsd: 10000,
      positionPct: 10,
      violations: ["kill_switch"],
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.violations).toContain("kill_switch");
  });
});
