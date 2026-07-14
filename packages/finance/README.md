# @agentoolbox/finance — Finance Protection Toolkit

Seven APIs that protect AI trading agents from the class of failures that have caused documented, real-world losses.

**Base URL:** `https://api.agent-toolbox.ai`  
**Pricing discovery:** `GET /v1/pricing`  
**Free tier:** 10 calls/IP — no auth required  
**Payment:** SOL micropayments — agents pay autonomously on-chain

---

## Why this exists

These failures happened before any transaction hit the chain:

| Incident | What happened | Root cause | Loss |
|---|---|---|---|
| Lobstar Wilde, Feb 2026, Solana | Agent sent 52,439,283 tokens instead of 52,439 | Confused raw on-chain integer with UI amount | $440k → $40k |
| Claude Code GH#46828, Apr 2026 | Agent swept entire $1,446 spot balance to futures when user said "close it" | No deterministic scope boundary | $1,446 + fees |

Both are preventable with a validate-before-execute pattern.

---

## Step 0 — Self-discovery

Call this first. It returns the service wallet address and per-endpoint rates so you can pay autonomously without hardcoding anything.

```bash
curl https://api.agent-toolbox.ai/v1/pricing
```

```json
{
  "wallet": "8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV",
  "network": "mainnet-beta",
  "endpoints": {
    "/v1/finance/units":          { "credits": 1, "sol": 0.0001 },
    "/v1/finance/price":          { "credits": 2, "sol": 0.0002 },
    "/v1/finance/symbol":         { "credits": 1, "sol": 0.0001 },
    "/v1/finance/token/risk":     { "credits": 3, "sol": 0.0003 },
    "/v1/finance/slippage":       { "credits": 2, "sol": 0.0002 },
    "/v1/finance/order/risk":     { "credits": 5, "sol": 0.0005 },
    "/v1/finance/position/check": { "credits": 1, "sol": 0.0001 }
  },
  "conversion": { "creditsPerSol": 10000 },
  "freeTier": { "calls": 10, "auth": false }
}
```

---

## Step 1 — Buy credits (autonomous SOL payment)

Send SOL to the service wallet. Use the transaction signature as your Bearer token.

```typescript
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const wallet = new PublicKey("8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV");
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

const tx = new Transaction().add(
  SystemProgram.transfer({ fromPubkey: agentKeypair.publicKey, toPubkey: wallet, lamports: 0.1 * LAMPORTS_PER_SOL })
);
const txSig = await sendAndConfirmTransaction(connection, tx, [agentKeypair]);
// txSig is now your Bearer token — use it on every subsequent call
```

**0.1 SOL = 1,000 credits = 200 order/risk checks**

---

## Decision guide — which check to call when

| Situation | Call | Reason |
|---|---|---|
| About to build a Solana transaction | `/v1/finance/units` first | Catches the $440k Lobstar decimal error |
| LLM gave you a price to trade at | `/v1/finance/price` | Validates against 2 live sources |
| Uncertain which token address to use | `/v1/finance/symbol` | USDC has 200+ imposters on Solana |
| Considering a new/unknown token | `/v1/finance/token/risk` | Rug pull + mint authority check |
| Trade size feels large | `/v1/finance/slippage` | Pool may not absorb your order |
| Pre-trade gate (run everything) | `/v1/finance/order/risk` | One call, all checks, composite verdict |
| Validating trade against portfolio rules | `/v1/finance/position/check` | Kill-switch + limits, no network calls |

**Recommended pipeline for Solana token trades:**

```
1. /v1/finance/units       — decimal sanity         < 10ms
2. /v1/finance/token/risk  — rug pull safety        ~500ms   ┐
3. /v1/finance/slippage    — pool depth             ~200ms   ├─ parallel
4. /v1/finance/price       — price validation       ~300ms   ┘
5. /v1/finance/position/check — deterministic gate  < 1ms   ← always last
```

Or use `/v1/finance/order/risk` to do steps 2–5 in a single call.

---

## Understanding verdicts

Every endpoint returns one of three verdicts:

| Verdict | Meaning | Agent action |
|---|---|---|
| `PASS` | No issues found — safe to proceed | Continue with the trade |
| `FLAG` | Potential issue — data is uncertain or borderline | Log the flag, proceed with caution or escalate |
| `BLOCK` | Confirmed problem — do not proceed | Reject the trade. Check `risks[].detail` for the reason |

When the verdict is `BLOCK`, the `risks` array contains the specific findings with `detail` fields explaining exactly what was wrong.

---

## API Reference

### `POST /v1/finance/units` — Decimal sanity check

**The Lobstar check.** Validates that your raw on-chain amount matches the intended human amount given the token's authoritative decimals.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/units \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "rawAmount": "52439000000",
    "uiAmount": 52439,
    "chain": "solana"
  }'
```

```json
{
  "verdict": "PASS",
  "authoritative_decimals": 6,
  "expected_raw": "52439000000",
  "actual_raw": "52439000000",
  "deviation_pct": 0,
  "risks": [],
  "latencyMs": 8
}
```

**What it blocks:** `rawAmount` deviates from `round(uiAmount × 10^decimals)` by more than 1%.

| Field | Type | Description |
|---|---|---|
| `tokenAddress` | string | Mint address (Solana) or contract address (EVM) |
| `rawAmount` | string | The integer amount as it will appear on-chain |
| `uiAmount` | number | The human-readable amount you intend to send |
| `chain` | string | `"solana"` · `"ethereum"` · `"bsc"` · `"polygon"` |

---

### `POST /v1/finance/price` — Cross-source price validation

Fetches the same asset from two independent live sources and blocks if they diverge or the data is stale.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/price \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "solana",
    "tokenAddress": "So11111111111111111111111111111111111111112",
    "assetType": "crypto",
    "proposedPrice": 180,
    "maxAgeSeconds": 60
  }'
```

```json
{
  "verdict": "BLOCK",
  "sources": [
    { "name": "coingecko",   "priceUsd": 148.32, "ageSeconds": 12, "available": true },
    { "name": "dexscreener", "priceUsd": 148.89, "ageSeconds": 4,  "available": true }
  ],
  "consensusPrice": 148.60,
  "proposedPriceDeviation": 21.1,
  "risks": [{ "type": "proposed_price_deviation", "severity": "critical", "detail": "Proposed $180.00 deviates 21.1% from consensus $148.60" }],
  "latencyMs": 287
}
```

**What it blocks:**
- Two sources diverge by more than `divergenceThresholdPct` (default 2%)
- Any source data is older than `maxAgeSeconds` (default 60s for crypto, 3600s for stocks)
- `proposedPrice` deviates >5% from consensus (BLOCK) or >2% (FLAG)

**Sources by asset type:**
- Crypto: CoinGecko + DexScreener
- Stock: yahoo-finance2 (single source → always FLAG or BLOCK)

---

### `POST /v1/finance/symbol` — Token/ticker identity resolver

Resolves a symbol to confirmed identity. Critical for crypto — symbols collide (USDC has 200+ imposters on Solana).

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/symbol \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "USDC",
    "assetType": "crypto",
    "chain": "solana"
  }'
```

```json
{
  "found": true,
  "ambiguous": true,
  "verdict": "FLAG",
  "matches": [
    { "symbol": "USDC", "name": "USD Coin", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "liquidity": 450000000 },
    { "symbol": "USDC", "name": "USDC (Wormhole)", "address": "HJiQv33nKujz9...bFQoCc", "liquidity": 2300 }
  ]
}
```

**Rule:** Always use token address, not symbol, for Solana. Use this endpoint to confirm the address maps to the expected name before trading.

---

### `POST /v1/finance/token/risk` — Rug pull scanner

One call to RugCheck.xyz + on-chain verification of mint/freeze authority. Blocks the most common rug pull indicators.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/token/risk \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    "chain": "solana",
    "maxRugScore": 60
  }'
```

```json
{
  "verdict": "BLOCK",
  "rugScore": 78,
  "mintAuthorityActive": true,
  "freezeAuthorityActive": false,
  "lpLockedPct": 0,
  "specificRisks": [
    "Mint authority is not renounced — token supply can be inflated",
    "No LP locked — liquidity can be withdrawn instantly"
  ],
  "risks": [
    { "type": "mint_authority_active", "severity": "critical", "detail": "Mint authority is not renounced" },
    { "type": "lp_not_locked",        "severity": "critical", "detail": "0% of LP is locked" }
  ],
  "latencyMs": 412
}
```

**What it blocks by default:**
- `mintAuthorityActive: true` — token creator can print unlimited supply
- `freezeAuthorityActive: true` — creator can freeze your tokens
- `rugScore > 60` — RugCheck's normalized risk score
- LP not locked (`lpLockedPct === 0` + `requireLpLocked: true`)

**Configurable thresholds:**

| Parameter | Default | Description |
|---|---|---|
| `maxRugScore` | 60 | Block above this score (0–100) |
| `requireLpLocked` | true | Block if LP not locked |
| `blockIfMintAuthority` | true | Block if mint authority active |
| `blockIfFreezeAuthority` | true | Block if freeze authority active |

---

### `POST /v1/finance/slippage` — Liquidity & slippage guard

Estimates price impact using DexScreener pool data. Prevents the thin-pool disaster where a large order drains the pool.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/slippage \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    "chain": "solana",
    "tradeUsd": 50000,
    "maxPriceImpactPct": 2
  }'
```

```json
{
  "verdict": "BLOCK",
  "poolLiquidityUsd": 45000,
  "estimatedPriceImpactPct": 222.2,
  "volume24h": 890000,
  "washTradingFlag": false,
  "risks": [
    { "type": "excessive_price_impact", "severity": "critical",
      "detail": "Estimated 222.2% price impact exceeds 2% threshold on $45,000 pool" }
  ],
  "latencyMs": 184
}
```

**Price impact formula:** `(tradeUsd / poolLiquidity) × 100 × 2`
This is the constant-product AMM approximation (x×y=k). For a $50k trade on a $45k pool: `(50000/45000) × 100 × 2 = 222%`.

**Wash trading detection:** FLAGS when `volume24h / poolLiquidityUsd > 10` (implausible ratio suggesting artificial volume).

---

### `POST /v1/finance/order/risk` — Full pre-trade gate

Runs all applicable checks in parallel and returns a single composite verdict. One call replaces steps 2–5 of the pipeline.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/order/risk \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    "assetType": "crypto",
    "side": "buy",
    "tradeUsd": 10000,
    "portfolioValueUsd": 50000,
    "chain": "solana"
  }'
```

```json
{
  "verdict": "BLOCK",
  "overallScore": 82,
  "blockedBy": "token/risk",
  "checks": [
    { "name": "token/risk", "verdict": "BLOCK", "score": 78, "risks": [{ "type": "mint_authority_active" }] },
    { "name": "slippage",   "verdict": "PASS",  "score": 8  },
    { "name": "price",      "verdict": "FLAG",  "score": 15 },
    { "name": "position",   "verdict": "PASS",  "score": 0  }
  ],
  "latencyMs": 521
}
```

**Verdict aggregation:** Worst check verdict wins. `blockedBy` names the check that caused the BLOCK. Agents should inspect `checks[].risks` for the specific reason.

---

### `POST /v1/finance/position/check` — Deterministic position guardian

The final non-overridable gate. No external API calls — pure arithmetic. Enforces hard rules on a proposed trade. This is the Claude Code GH#46828 fix.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/finance/position/check \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{
    "trade": {
      "symbol": "SOL",
      "side": "buy",
      "tradeUsd": 20000,
      "leverage": 1,
      "assetType": "crypto"
    },
    "portfolio": {
      "totalValueUsd": 50000,
      "cashUsd": 30000,
      "dailyPnlUsd": -6000,
      "openPositions": 3
    },
    "rules": {
      "maxPositionPct": 25,
      "maxDailyLossPct": 10,
      "maxOpenPositions": 10,
      "maxLeverage": 3,
      "allowedAssets": ["SOL", "BTC", "ETH"],
      "killSwitch": false,
      "maxSingleTradeUsd": 25000
    }
  }'
```

```json
{
  "verdict": "BLOCK",
  "effectiveUsd": 20000,
  "positionPct": 40.0,
  "violations": [
    "max_position_pct",
    "max_daily_loss"
  ],
  "risks": [
    { "type": "max_position_pct", "severity": "critical",
      "detail": "Position 40.0% exceeds maximum 25%" },
    { "type": "max_daily_loss",  "severity": "critical",
      "detail": "Daily loss $6,000 (12.0%) exceeds maximum 10%" }
  ],
  "score": 75,
  "latencyMs": 0
}
```

**Default rules (when `rules` is omitted):**

| Rule | Default |
|---|---|
| `maxPositionPct` | 25% of portfolio |
| `maxDailyLossPct` | 10% |
| `maxOpenPositions` | 10 |
| `maxLeverage` | 3× |
| `allowedAssets` | all (no restriction) |
| `killSwitch` | false |
| `maxSingleTradeUsd` | unlimited |

**Set `killSwitch: true` to block ALL trades immediately** — useful for emergency halt or end-of-session cleanup.

---

## Error handling

| HTTP | `error` | Action |
|---|---|---|
| `402` | `free_tier_exhausted` | Send SOL to wallet, use tx sig as Bearer |
| `402` | `insufficient_credits` | Top up by sending more SOL |
| `401` | `invalid_token` | Malformed Bearer token |
| `400` | validation error | Fix the request body |
| `5xx` | server error | Retry with exponential backoff |

All errors return `{ "error": "<code>", "message": "<detail>" }`.

---

## Data sources — all free, no API key required

| Source | Endpoints | Rate limit |
|---|---|---|
| [CoinGecko](https://coingecko.com) | `/v1/finance/price` (crypto primary) | ~30 req/min |
| [DexScreener](https://dexscreener.com) | `/v1/finance/price`, `/v1/finance/slippage`, `/v1/finance/symbol` | 300 req/min |
| [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) | `/v1/finance/price` (stocks) | Unlimited (unofficial) |
| [RugCheck.xyz](https://rugcheck.xyz) | `/v1/finance/token/risk` | 1 req/sec |
| Solana public RPC | `/v1/finance/units`, `/v1/finance/token/risk` | ~100 req/10s |

Optional upgrades for higher rate limits: set `SOL_RPC_URL` (Helius/QuickNode) and `VECTARA_API_KEY` on the server.

---

## TypeScript / JavaScript integration

```bash
npm install agent-toolbox-sdk
```

```typescript
import { AgentoolboxClient } from "agent-toolbox-sdk";

const client = new AgentoolboxClient({
  baseUrl: "https://api.agent-toolbox.ai",
  apiKey: txSignature,  // Solana tx sig from your credit purchase
});

// Pre-trade pipeline
const order = await client.scanVulnerabilities({ packages: [], language: "python" }); // unused here
const risk = await fetch("https://api.agent-toolbox.ai/v1/finance/order/risk", {
  method: "POST",
  headers: { "Authorization": `Bearer ${txSignature}`, "Content-Type": "application/json" },
  body: JSON.stringify({ tokenAddress: mint, assetType: "crypto", side: "buy", tradeUsd, chain: "solana" }),
}).then(r => r.json());

if (risk.verdict === "BLOCK") {
  throw new Error(`Trade blocked by ${risk.blockedBy}: ${risk.checks.find(c => c.verdict === "BLOCK")?.risks[0]?.detail}`);
}
```

Full TypeScript library (direct imports, no API calls for `checkPosition`):
```bash
npm install @agentoolbox/finance
```

See the [TypeScript integration guide](README.md#full-integration-example) for direct function imports.

---

## Self-hosting

```bash
git clone https://github.com/solhammer/agentoolbox
cd agentoolbox && cp .env.example .env && pnpm install && pnpm dev
# Finance endpoints available at http://localhost:3000/v1/finance/*
```

Set `SOL_SERVICE_WALLET` in `.env` to your own Solana wallet address to receive payments.

MIT license · [agent-toolbox.ai](https://agent-toolbox.ai) · [solhammer/agentoolbox](https://github.com/solhammer/agentoolbox)
