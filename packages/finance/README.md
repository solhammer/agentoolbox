# @agentoolbox/finance

Finance protection toolkit for AI trading agents. Seven checks that sit between an agent's trading decision and execution — preventing the class of catastrophic failures documented in real incidents.

**Real incidents this prevents:**
- Lobstar Wilde (Feb 2026): AI agent sent 52,439,283 tokens instead of 52,439. One decimal error. $440k book → $40k realized.
- Claude Code GH#46828: user said "close it" → agent swept entire $1,446 spot balance to futures, placed 57 ghost grid orders unprompted.

---

## Install

```bash
npm install @agentoolbox/finance
# or: pnpm add @agentoolbox/finance
```

Or use via REST API (no install needed):

```bash
curl https://api.agent-toolbox.ai/v1/pricing
```

---

## Quick start — protect a trade in 3 lines

```typescript
import { checkDecimals, checkRug, checkLiquidity, checkPosition } from "@agentoolbox/finance";

// Before any trade — run the checks that matter for your asset
const decimals = await checkDecimals({ tokenAddress: mint, rawAmount, uiAmount, chain: "solana" });
const rug     = await checkRug({ address: mint, chain: "solana" });
const slippage = await checkLiquidity({ tokenAddress: mint, tradeUsd: 5000, chain: "solana" });

if ([decimals, rug, slippage].some(r => r.verdict === "BLOCK")) {
  throw new Error("Trade blocked: " + [decimals, rug, slippage].find(r => r.verdict === "BLOCK")?.risks[0]?.detail);
}
```

---

## Architecture — propose → validate → execute

The correct pattern for AI trading agents:

```
User/LLM proposes trade
      ↓
┌─────────────────────────────────────┐
│  1. checkDecimals()   < 10ms        │  ← raw amount sanity
│  2. checkPrice()      ~300ms        │  ← stale/hallucinated price
│  3. checkRug()        ~500ms        │  ← rug pull / token safety
│  4. checkLiquidity()  ~200ms        │  ← pool depth / slippage
│  5. checkPosition()   < 1ms         │  ← portfolio limits (non-overridable)
└─────────────────────────────────────┘
      ↓ only if all PASS
Execute transaction
```

Steps 1–4 run in parallel. Step 5 (`checkPosition`) is always the final gate and cannot be overridden by any earlier check.

---

## API reference

### `checkDecimals(input)` → `DecimalCheckResult`

Prevents the Lobstar-class decimal error. Fetches authoritative `decimals` from DexScreener and Solana RPC, then validates that `rawAmount ≈ round(uiAmount × 10^decimals)`.

```typescript
import { checkDecimals } from "@agentoolbox/finance";

const result = await checkDecimals({
  tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  rawAmount: "1000000",   // what you're about to send on-chain
  uiAmount: 1.0,          // what you intend (1 USDC)
  chain: "solana",
});

// result.verdict: "PASS" | "FLAG" | "BLOCK"
// result.authoritative_decimals: 6
// result.deviation_pct: 0
```

**Blocks when:** `abs(expectedRaw - actualRaw) / actualRaw > 0.01` (1% tolerance)

---

### `checkPrice(input)` → `PriceCheckResult`

Cross-validates a price against two independent live sources. Blocks if sources diverge >2% or data is stale.

```typescript
import { checkPrice } from "@agentoolbox/finance";

// Crypto — uses CoinGecko + DexScreener
const result = await checkPrice({
  symbol: "bitcoin",           // CoinGecko ID
  tokenAddress: "So1111...",   // optional: DEX address for second source
  assetType: "crypto",
  proposedPrice: 95000,        // your agent's claimed price (optional)
  maxAgeSeconds: 60,
  divergenceThresholdPct: 2,
});

// Stock — uses yahoo-finance2
const stockResult = await checkPrice({
  symbol: "AAPL",
  assetType: "stock",
  proposedPrice: 220,
  maxAgeSeconds: 3600,
});

// result.sources: [{ name, priceUsd, ageSeconds, available }]
// result.consensusPrice: number | null
// result.proposedPriceDeviation: number | null (% from consensus)
```

**Blocks when:** sources diverge >threshold, either source is stale, or proposedPrice deviates >5% from consensus

---

### `checkRug(input)` → `RugCheckResultExtended`

Rug pull scanner for Solana tokens. Calls RugCheck.xyz + verifies on-chain mint/freeze authority.

```typescript
import { checkRug } from "@agentoolbox/finance";

const result = await checkRug({
  address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  chain: "solana",
  // Optional overrides (defaults shown):
  maxRugScore: 60,             // block above this score
  requireLpLocked: true,        // block if LP not locked
  blockIfMintAuthority: true,   // block if mint authority active
  blockIfFreezeAuthority: true, // block if freeze authority active
});

// result.rugScore: number (0-100, higher = riskier)
// result.mintAuthorityActive: boolean
// result.freezeAuthorityActive: boolean
// result.lpLockedPct: number | null
// result.specificRisks: string[]
```

**Blocks when:** mint authority active, freeze authority active, rug score > maxRugScore, LP not locked

---

### `checkLiquidity(input)` → `LiquidityCheckResult`

Estimates price impact using DexScreener pool data. Prevents thin-pool disasters.

```typescript
import { checkLiquidity } from "@agentoolbox/finance";

const result = await checkLiquidity({
  tokenAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  chain: "solana",
  tradeUsd: 50000,
  maxPriceImpactPct: 2,   // block if impact > 2%
  minLiquidityUsd: 10000, // block if pool < $10k
});

// result.poolLiquidityUsd: number | null
// result.estimatedPriceImpactPct: number | null
// result.washTradingFlag: boolean
```

**Price impact formula:** `(tradeUsd / poolLiquidityUsd) × 100 × 2` (constant-product AMM approximation)

**Blocks when:** liquidity < minLiquidityUsd OR estimatedPriceImpactPct > maxPriceImpactPct

---

### `checkPosition(trade, portfolio, rules?)` → `PositionCheckResult`

Deterministic kill-switch. No external API calls. Pure arithmetic. The final non-overridable gate.

```typescript
import { checkPosition } from "@agentoolbox/finance";

const result = checkPosition(
  {
    symbol: "SOL",
    side: "buy",
    tradeUsd: 20000,
    leverage: 1,
    assetType: "crypto",
  },
  {
    totalValueUsd: 50000,
    cashUsd: 30000,
    dailyPnlUsd: -6000,        // today's P&L
    openPositions: 3,
    assetAllocation: { BTC: 15000, ETH: 5000 },
  },
  {
    maxPositionPct: 25,         // max 25% of portfolio per trade
    maxDailyLossPct: 10,        // halt if daily loss > 10%
    maxOpenPositions: 10,
    maxLeverage: 3,
    allowedAssets: ["SOL", "BTC", "ETH"],  // allowlist (omit to allow all)
    killSwitch: false,          // set to true to block ALL trades
    maxSingleTradeUsd: 30000,
  }
);

// result.verdict: "PASS" | "FLAG" | "BLOCK"
// result.violations: string[]  (human-readable reasons)
// result.effectiveUsd: number  (tradeUsd * leverage)
// result.positionPct: number | null
```

**Default rules when omitted:** maxPositionPct: 25, maxDailyLossPct: 10, maxOpenPositions: 10, maxLeverage: 3

---

## Full integration example

```typescript
import {
  checkDecimals, checkPrice, checkRug,
  checkLiquidity, checkPosition,
  type GuardianRules, type PortfolioSnapshot
} from "@agentoolbox/finance";

const PORTFOLIO: PortfolioSnapshot = {
  totalValueUsd: 50000,
  cashUsd: 20000,
  dailyPnlUsd: -1200,
  openPositions: 2,
};

const RULES: GuardianRules = {
  maxPositionPct: 20,
  maxDailyLossPct: 8,
  maxLeverage: 2,
  killSwitch: false,
};

async function validateTrade(params: {
  tokenMint: string;
  rawAmount: string;
  uiAmount: number;
  tradeUsd: number;
  chain: "solana";
}) {
  const { tokenMint, rawAmount, uiAmount, tradeUsd, chain } = params;

  // Run data-integrity checks in parallel (fastest first)
  const [decimals, price, rug, liquidity] = await Promise.all([
    checkDecimals({ tokenAddress: tokenMint, rawAmount, uiAmount, chain }),
    checkPrice({ tokenAddress: tokenMint, assetType: "crypto" }),
    checkRug({ address: tokenMint, chain }),
    checkLiquidity({ tokenAddress: tokenMint, tradeUsd, chain }),
  ]);

  const checks = { decimals, price, rug, liquidity };

  // Find any blocker
  const blocker = Object.entries(checks).find(([, r]) => r.verdict === "BLOCK");
  if (blocker) {
    const [name, result] = blocker;
    throw new Error(`Trade BLOCKED at ${name}: ${result.risks[0]?.detail ?? "unknown reason"}`);
  }

  // Final gate — deterministic, no API calls
  const position = checkPosition(
    { symbol: tokenMint, side: "buy", tradeUsd, assetType: "crypto" },
    PORTFOLIO,
    RULES
  );

  if (position.verdict === "BLOCK") {
    throw new Error(`Trade BLOCKED by position limits: ${position.violations.join(", ")}`);
  }

  // Log flags even if we proceed
  const flagged = Object.entries(checks).filter(([, r]) => r.verdict === "FLAG");
  if (flagged.length > 0) {
    console.warn("Trade flags:", flagged.map(([name]) => name).join(", "));
  }

  return { passed: true, checks, position };
}
```

---

## Using via REST API (no install)

All checks are available as REST endpoints on `api.agent-toolbox.ai`. This is the recommended approach for non-TypeScript agents or when running in constrained environments.

**Discover pricing first:**

```bash
curl https://api.agent-toolbox.ai/v1/pricing
```

**Run the full order risk check:**

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/order/risk \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "assetType": "crypto",
    "side": "buy",
    "tradeUsd": 5000,
    "portfolioValueUsd": 50000,
    "chain": "solana"
  }'
```

**Response:**

```json
{
  "verdict": "PASS",
  "overallScore": 12,
  "blockedBy": null,
  "checks": [
    { "name": "token/risk", "verdict": "PASS", "score": 8  },
    { "name": "slippage",   "verdict": "PASS", "score": 4  },
    { "name": "price",      "verdict": "PASS", "score": 0  },
    { "name": "position",   "verdict": "PASS", "score": 0  }
  ],
  "latencyMs": 312
}
```

**Authentication:** Pass a Solana transaction signature as `Authorization: Bearer <tx-sig>` after buying credits. Free tier: 10 calls/IP with no auth.

**REST endpoints:**

| Endpoint | Equivalent function | Credits |
|---|---|---|
| `POST /v1/finance/units` | `checkDecimals()` | 1 |
| `POST /v1/finance/price` | `checkPrice()` | 2 |
| `POST /v1/finance/symbol` | (symbol resolver) | 1 |
| `POST /v1/finance/token/risk` | `checkRug()` | 3 |
| `POST /v1/finance/slippage` | `checkLiquidity()` | 2 |
| `POST /v1/finance/order/risk` | all combined | 5 |
| `POST /v1/finance/position/check` | `checkPosition()` | 1 |

---

## Data sources

All free, no API key required:

| Source | Used for | Rate limit |
|---|---|---|
| [CoinGecko](https://coingecko.com) | Crypto prices | ~30 req/min |
| [DexScreener](https://dexscreener.com) | DEX pairs, pool liquidity, token addresses | 300 req/min |
| [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) | Stock prices | Unlimited (unofficial) |
| [RugCheck.xyz](https://rugcheck.xyz) | Solana token safety scores | 1 req/sec |
| Solana public RPC | On-chain token decimals and authority | ~100 req/10s |

Optional paid upgrades: Helius (higher Solana RPC rate limits), Alpha Vantage (stock data), GoPlus (EVM token security).

---

## License

MIT — part of [agent-toolbox.ai](https://agent-toolbox.ai)

GitHub: [solhammer/agentoolbox](https://github.com/solhammer/agentoolbox)
