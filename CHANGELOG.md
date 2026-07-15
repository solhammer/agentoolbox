# Changelog

All notable changes to agent-toolbox.ai are documented here.


## [1.3.0] — 2026-07-14 — Full MCP coverage + shared core

### Added
- MCP server now exposes all 15 endpoints (was 3): added `scan_secrets`, `scan_injection`, `count_tokens`, `scan_vulnerabilities`, `scan_pii`, and the seven `finance_*` tools. `distill_context` now uses the shared TF-IDF distiller.
- New package `@agentoolbox/core` — shared secret/injection/vulnerability scanners, token counter, and context distiller (moved out of the API so the API and MCP share one implementation).
- `@agentoolbox/finance` now exports `resolveSymbol()` and `checkOrder()` (extracted from the API routes) so the symbol and order-risk gates are reusable in-process.

### Fixed
- `@agentoolbox/finance` build failed under `exactOptionalPropertyTypes` (fetch `body: undefined` in the integration test).
- MCP ESM bundle crashed at startup (`Dynamic require of "buffer"`) once Solana deps were bundled — added a `createRequire` banner to the tsup config.

### Changed
- The API imports the scanners/counter/distiller from `@agentoolbox/core`, and `finance-routes` delegates symbol/order to the finance library. No API response shapes changed.

---


## [1.2.0] — 2026-07-14 — Privacy Egress Firewall

### Added — PII/PHI/PCI egress firewall (1 new endpoint)

`POST /v1/scan/pii` — deterministic detection + redaction of regulated personal data before an agent logs it, sends it to a third party, or persists it. Returns PASS/FLAG/BLOCK, masked entities, a redacted copy of the input, and a SHA-256 certificate. Credits: 1.

**New package: `@agentoolbox/privacy`**
- `scanPii()` — the egress firewall (pure function, no network calls, no state)
- Checksum-validated detectors: credit card (Luhn), IBAN (ISO 7064 mod-97), UK NHS (mod-11), Canadian SIN (Luhn), US SSN (SSA structural rules), plus email, phone, and IPv4
- Policy controls: `mode` (block/flag/audit), `blockSeverityAtOrAbove`, `allowTypes`, `jurisdictions`, `redact`
- Never returns raw values — masked previews + redacted text only

**Also**
- SDK: `client.scanPii()` + `Pii*` types
- MCP: new `scan_pii` tool
- Spec: `packages/privacy/SPEC.md`

---


## [1.0.4] — 2026-07-14

### Changed
- agent-toolbox-sdk bumped to 1.0.4
- See git log for detailed changes

---


## [1.0.2] — 2026-07-14

### Changed
- agent-toolbox-sdk bumped to 1.0.2
- See git log for detailed changes

---

---

## [1.1.0] — 2026-07-14 — Finance Protection Toolkit

### Added — Finance Protection (7 new endpoints)

Seven REST APIs protecting AI trading agents from documented, real-world failure modes.

**Research motivation:**
- Lobstar Wilde (Feb 2026, Solana): agent sent 52,439,283 tokens instead of 52,439 due to decimal confusion. $440k book → $40k realized after pool slippage.
- Claude Code GH#46828 (Apr 2026): agent swept $1,446 spot balance to futures when user said "close it". 57 ghost grid orders placed unprompted.

**New endpoints:**

| Endpoint | What it prevents | Credits |
|---|---|---|
| `POST /v1/finance/units` | Decimal/units errors — validates raw on-chain amount vs UI amount | 1 |
| `POST /v1/finance/price` | Stale and hallucinated prices — cross-validates CoinGecko + DexScreener | 2 |
| `POST /v1/finance/symbol` | Wrong ticker/token — resolves symbols to confirmed addresses (USDC has 200+ imposters) | 1 |
| `POST /v1/finance/token/risk` | Rug pulls — RugCheck.xyz score + mint/freeze authority check | 3 |
| `POST /v1/finance/slippage` | Thin-pool slippage — price impact estimation from DexScreener pool data | 2 |
| `POST /v1/finance/order/risk` | Full pre-trade gate — runs all checks, worst verdict wins | 5 |
| `POST /v1/finance/position/check` | Position limits + kill-switch — deterministic, no API calls | 1 |

**New package: `@agentoolbox/finance`**
- `checkDecimals()` — decimal/units sanity
- `checkPrice()` — cross-source price validation (CoinGecko + DexScreener for crypto; yahoo-finance2 for stocks)
- `checkRug()` — Solana rug pull scanner (RugCheck.xyz + on-chain)
- `checkLiquidity()` — pool depth + slippage estimation
- `checkPosition()` — deterministic position limits + kill-switch

**Data sources (all free, no API key required):**
- CoinGecko (~30 req/min)
- DexScreener (300 req/min)
- yahoo-finance2 (unlimited, unofficial)
- RugCheck.xyz (1 req/sec)
- Solana public RPC (~100 req/10s)

**Tests:** 34 unit tests (mocked providers) + 30 live integration tests (skipped by default in CI)

**Documentation:**
- `packages/finance/README.md` — agent-facing guide: self-discovery, payment flow, decision guide, full API reference with curl examples
- Root `README.md` — developer integration guide with propose→validate→execute architecture diagram

---

## [1.0.1] — 2026-07-14

### Changed
- SDK package renamed from `@agentoolbox/sdk` to `agent-toolbox-sdk` for npm publishing
- Published `agent-toolbox-sdk@1.0.0` to npm registry

### Added
- 4 new security endpoints: `POST /v1/scan/secrets`, `POST /v1/scan/injection`, `POST /v1/tokens/count`, `POST /v1/scan/vulnerabilities`
- Admin dashboard deployed to Cloudflare Pages (`admin.agent-toolbox.ai`)
- Admin API: `/admin/overview`, `/admin/requests`, `/admin/ledger`, `/admin/hallucinations`, `/admin/health`, `/admin/stream` (SSE)
- GitHub Actions CI/CD: automated test + deploy on every push to main
- Moltbook agent registered (@agenttoolbox)

### Fixed
- GitHub Actions: removed explicit pnpm version (package.json `packageManager` field takes precedence)
- GitHub Actions: replaced `cloudflare/wrangler-action` with `npx wrangler` (pnpm workspace conflict)

---

## [1.0.0] — 2026-07-13 — Initial release

### Added

**Core quality services (3 endpoints):**
- `POST /v1/validate/imports` — Package/import validator (PyPI, npm, crates.io, Go)
- `POST /v1/verify` — Hallucination firewall (PASS/FLAG/BLOCK with SHA-256 certificate)
- `POST /v1/distill` — Context distiller (TF-IDF importance scoring)

**Security services (4 endpoints, v1.0.1):**
- `POST /v1/scan/secrets` — Credential detector (10 patterns, redacted output)
- `POST /v1/scan/injection` — Prompt injection detector
- `POST /v1/tokens/count` — BPE token counter + cost estimator
- `POST /v1/scan/vulnerabilities` — OSV/CVE package checker

**Infrastructure:**
- Hono REST API (Railway + Docker)
- Solana on-chain payment verification (`@solana/web3.js`)
- Redis credit ledger (`ioredis`)
- Cloudflare Pages: website + admin dashboard
- MCP server: `validate_imports`, `verify_output`, `distill_context`
- TypeScript SDK (`agent-toolbox-sdk` on npm)
- Example agent demo (`examples/agent-demo/`)

**Payments:**
- Service wallet: `8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV`
- Rate: 0.0001 SOL/credit · 1 SOL = 10,000 credits
- Autonomous discovery: `GET /v1/pricing`
