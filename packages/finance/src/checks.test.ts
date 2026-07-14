import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DexScreener provider so checkDecimals resolves decimals without a
// network call (and never falls through to the Solana RPC path).
vi.mock("./providers/dexscreener.js", () => ({
  getBestPair: vi.fn(),
}));

import { getBestPair } from "./providers/dexscreener.js";
import { checkDecimals } from "./checks/decimals.js";
import { checkPosition } from "./checks/position.js";
import type { TradeProposal, PortfolioSnapshot, GuardianRules } from "./checks/position.js";

const mockedGetBestPair = vi.mocked(getBestPair);

const TOKEN = "So11111111111111111111111111111111111111112";

function pairWithDecimals(address: string, decimals: number) {
  return {
    chainId: "solana",
    dexId: "raydium",
    pairAddress: "pair123",
    baseToken: { address, name: "Test", symbol: "TST", decimals },
    quoteToken: { address: "USDC", name: "USD Coin", symbol: "USDC" },
    liquidity: { usd: 1_000_000 },
  } as unknown as Awaited<ReturnType<typeof getBestPair>>;
}

describe("checkDecimals", () => {
  beforeEach(() => {
    mockedGetBestPair.mockReset();
  });

  it("passes a correctly-scaled amount", async () => {
    mockedGetBestPair.mockResolvedValue(pairWithDecimals(TOKEN, 6));
    const result = await checkDecimals({
      tokenAddress: TOKEN,
      rawAmount: "100000000", // 100 * 10^6
      uiAmount: 100,
      chain: "solana",
    });
    expect(result.verdict).toBe("PASS");
    expect(result.authoritative_decimals).toBe(6);
    expect(result.expected_raw).toBe("100000000");
  });

  it("blocks a 1000x mis-scaled amount", async () => {
    mockedGetBestPair.mockResolvedValue(pairWithDecimals(TOKEN, 6));
    const result = await checkDecimals({
      tokenAddress: TOKEN,
      rawAmount: "100000000000", // 1000x too large
      uiAmount: 100,
      chain: "solana",
    });
    expect(result.verdict).toBe("BLOCK");
    expect(result.risks.some((r) => r.type === "decimal_scaling_error")).toBe(true);
  });

  it("flags when decimals cannot be resolved", async () => {
    mockedGetBestPair.mockResolvedValue(null);
    const result = await checkDecimals({
      tokenAddress: "0xabc",
      rawAmount: "12345",
      uiAmount: 1,
      chain: "ethereum", // non-solana => no RPC fallback
    });
    expect(result.verdict).toBe("FLAG");
    expect(result.authoritative_decimals).toBeNull();
  });
});

describe("checkPosition", () => {
  const trade: TradeProposal = {
    symbol: "BTC",
    side: "buy",
    tradeUsd: 1000,
    assetType: "crypto",
  };
  const portfolio: PortfolioSnapshot = {
    totalValueUsd: 10000,
    cashUsd: 5000,
  };

  it("passes a within-limits trade", () => {
    const result = checkPosition(trade, portfolio);
    expect(result.verdict).toBe("PASS");
    expect(result.violations).toHaveLength(0);
    expect(result.positionPct).toBe(10);
  });

  it("blocks an over-limit position", () => {
    // 5000 / 10000 = 50% > default 25%
    const result = checkPosition({ ...trade, tradeUsd: 5000 }, portfolio);
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("max_position_pct");
  });

  it("blocks all trades when the kill switch is engaged", () => {
    const rules: GuardianRules = { killSwitch: true };
    const result = checkPosition(trade, portfolio, rules);
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("kill_switch");
  });

  it("blocks trades on disallowed assets", () => {
    const rules: GuardianRules = { allowedAssets: ["ETH", "SOL"] };
    const result = checkPosition(trade, portfolio, rules);
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("asset_not_allowed");
  });

  it("blocks when daily loss exceeds the limit", () => {
    const result = checkPosition(trade, { ...portfolio, dailyPnlUsd: -1500 });
    // -1500 / 10000 = 15% loss > default 10%
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("max_daily_loss");
  });

  it("blocks when leverage exceeds the max", () => {
    const result = checkPosition({ ...trade, leverage: 5 }, portfolio);
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations).toContain("max_leverage");
    expect(result.effectiveUsd).toBe(5000);
  });
});
