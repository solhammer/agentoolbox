# agent-toolbox.ai — Launch Announcement Copy

Use these for posting across channels. Adjust tone per platform.

---

## Twitter / X Thread

**Tweet 1 (hook):**
19.7% of AI-generated packages don't exist.

We built a firewall for that.

agent-toolbox.ai — the quality layer for AI agents. Three APIs. No subscription. Pay per call in SOL. 🧵

**Tweet 2 (what it is):**
Three services:

🛡️ POST /v1/validate/imports — checks every import against PyPI/npm/crates.io/Go live. Catch hallucinated packages before they execute.

🔥 POST /v1/verify — PASS/FLAG/BLOCK with SHA-256 cert. URLs, citations, numeric contradictions.

✂️ POST /v1/distill — compress bloated agent contexts to a token budget.

**Tweet 3 (how agents pay):**
Agents pay autonomously in SOL. No signup. No invoice.

1. Send SOL to the service wallet
2. Use the tx signature as your Bearer token
3. GET /v1/pricing to self-discover rates

1 SOL = 10,000 calls. 0.0001 SOL each.

**Tweet 4 (MCP):**
Works as an MCP server for Claude Desktop, Warp, and Cursor.

Add it to your config. Your agent gets validate_imports, verify_output, distill_context — instantly.

**Tweet 5 (CTA):**
Try free (10 calls, no auth):

curl -X POST https://api.agent-toolbox.ai/v1/validate/imports \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"import numpy\nfrom ghostpkg import magic"}'

GitHub: github.com/solhammer/agentoolbox
Open source. Self-hostable.

---

## Hacker News — Show HN

**Title:** Show HN: agent-toolbox.ai – Hallucination firewall + package validator for AI agents, paid in SOL

**Text:**
I built a set of API services that AI agents can call to verify and improve their LLM outputs before they cause damage.

Three endpoints:
- POST /v1/validate/imports — checks every package import in AI-generated code against live registries (PyPI, npm, crates.io, Go). 19.7% of AI-generated packages don't exist (USENIX 2025).
- POST /v1/verify — hallucination firewall. Returns PASS/FLAG/BLOCK with a SHA-256 certificate. Checks packages, URLs, DOI/arXiv citations, and numeric contradictions.
- POST /v1/distill — compresses bloated agent context windows using TF-IDF importance scoring.

The interesting part: agents pay autonomously in SOL (Solana). They call GET /v1/pricing, send SOL to the service wallet, and use the transaction signature as a Bearer token. No signup, no invoices, no humans in the loop.

Works as an MCP server for Claude Desktop, Warp, and Cursor. Free tier: 10 calls/IP.

Live: https://api.agent-toolbox.ai  
Website: https://agent-toolbox.ai  
GitHub (open source): https://github.com/solhammer/agentoolbox

---

## Reddit — r/MachineLearning, r/LocalLLaMA, r/AIAgents

**Title:** I built a hallucination firewall for AI agents that accepts SOL micropayments

**Body:**
Been building AI agents and kept running into the same problems: hallucinated package names crashing code, bad URLs in citations, bloated contexts eating tokens.

Built agent-toolbox.ai — three API services specifically for agents:

**Package Validator** (`POST /v1/validate/imports`)
Checks every import against live registries before you run AI-generated code. 19.7% of AI packages are hallucinated according to USENIX 2025 research. Takes ~200ms.

**Hallucination Firewall** (`POST /v1/verify`)
Returns PASS/FLAG/BLOCK with a tamper-evident SHA-256 certificate. Detects hallucinated packages, dead URLs, malformed DOI/arXiv citations, and numeric contradictions.

**Context Distiller** (`POST /v1/distill`)
Compresses conversation history to a token budget using TF-IDF importance scoring. Keeps the system prompt and the most relevant content.

**The SOL payment model**
This is the part I found most interesting to build: agents discover pricing at `GET /v1/pricing`, send SOL to the service wallet, and use the transaction signature as a Bearer token. No human approval needed — fully autonomous.

Free tier: 10 calls/IP. Paid: 0.0001 SOL/call (about $0.015 at current prices).

Also works as an MCP server for Claude Desktop, Warp, and Cursor.

GitHub: https://github.com/solhammer/agentoolbox (MIT, self-hostable)
API: https://api.agent-toolbox.ai
Try it free: `curl -X POST https://api.agent-toolbox.ai/v1/validate/imports -H "Content-Type: application/json" -d '{"language":"python","code":"import numpy\nfrom ghostpkg import magic"}'`

---

## LinkedIn

Built and launched agent-toolbox.ai this week — an API utility designed specifically for AI agents to verify their own outputs before causing damage in production.

The problem: "vibe-coding" with AI generates hallucinated package names (19.7% of AI imports don't exist per USENIX 2025), dead URLs in citations, and bloated context windows. None of the existing tools are callable by agents themselves in a lightweight, per-call model.

Our solution: three REST endpoints + MCP server. Agents call them inline in their pipeline:
• Package validator — live registry checks against PyPI, npm, crates.io, Go
• Hallucination firewall — PASS/FLAG/BLOCK verdict with SHA-256 certificate  
• Context distiller — TF-IDF-based compression to a token budget

The payment model is the most novel part: agents pay autonomously in SOL (Solana). They query pricing, send a micropayment, and use the transaction signature as their API key. No subscription, no invoices.

Live now: agent-toolbox.ai | Free tier: 10 calls/IP

---

## Product Hunt — Launch Description

**Tagline:** The quality layer every AI agent needs

**Description:**
AI agents that write code, generate content, and make decisions need a quality check before their outputs reach production. agent-toolbox.ai is a set of API services built specifically for agents to call inline in their pipelines.

**Three services:**
- **Package Validator** — checks every import in AI-generated code against live registries (PyPI, npm, crates.io, Go) to catch hallucinated package names. Addresses the USENIX 2025 finding that 19.7% of AI-generated packages don't exist.
- **Hallucination Firewall** — returns PASS, FLAG, or BLOCK for any LLM output. Checks packages, URLs, DOI/arXiv citations, and numeric contradictions. Every verdict is SHA-256 signed.
- **Context Distiller** — compresses bloated agent context windows to a token budget using TF-IDF importance scoring.

**How it works:**
Agents call `GET /v1/pricing` to discover the service wallet and rates, send SOL to buy credits, and use the transaction signature as a Bearer token. Fully autonomous — no human approval needed.

Works as an MCP server for Claude Desktop, Warp, and Cursor. Open source on GitHub (MIT). Self-hostable.

**First 10 calls free, no signup.**

---

## Directories to submit to

- https://theresanaiforthat.com/submit
- https://aitoolsdirectory.com/submit
- https://futuretools.io/submit-a-tool
- https://toolify.ai/submit
- https://alternativeto.net/software/add/
- https://github.com/topics/ai-agents (auto-indexed via repo topics ✅)
- https://mcp.so (for MCP server listing)
- Solana ecosystem directories (solana.com/ecosystem)

---

## Finance Protection Toolkit — Launch Announcement

### Twitter / X Thread

**Tweet 1 (hook):**
An AI agent sent 52,439,283 tokens instead of 52,439.

That's a $440k book value. It realized $40k.

The cause: one decimal error. Zero pre-trade checks.

We built 7 new APIs to prevent exactly this. 🧵

**Tweet 2 (what we built):**
Introducing the agent-toolbox.ai Finance Protection Toolkit:

🔢 Units sanity check — validate raw vs UI amounts before any tx
📊 Cross-source price validator — CoinGecko + DexScreener consensus
🔍 Symbol resolver — USDC has 200+ imposters on Solana alone
☠️ Rug pull scanner — mint authority + LP lock + RugCheck score
🏊 Liquidity guard — slippage estimate before you drain the pool
⚖️ Order risk scorer — runs all checks, worst verdict wins
🛡️ Position guardian — kill-switch + limits, zero API calls

**Tweet 3 (the Claude Code incident):**
It's not just crypto.

Claude Code GH#46828: agent misread "close it" → swept its entire $1,446 spot balance spot→futures unprompted. 57 ghost grid orders. Fee bleed.

That's what happens when there's no deterministic position limit layer.

Our Guardian does that check in <1ms. Pure arithmetic.

**Tweet 4 (how agents use it):**
All 7 endpoints are agent-callable REST APIs.

Discovery (agents call this first):
curl https://api.agent-toolbox.ai/v1/pricing

Returns wallet + rate card. Agent sends SOL → uses tx sig as Bearer token.

0.0001–0.0002 SOL/call. Free tier: 10 calls/IP.

**Tweet 5 (CTA):**
Full docs: https://agent-toolbox.ai
GitHub (MIT): https://github.com/solhammer/agentoolbox
npm: npm install agent-toolbox-sdk

---

### Hacker News — Show HN

**Title:** Show HN: 7 REST APIs protecting AI trading agents from decimal errors, rug pulls, and hallucinated prices

**Body:**
Two real incidents motivated this:

1. Lobstar Wilde (Feb 2026, Solana): agent sent 52,439,283 tokens instead of 52,439 — confused raw on-chain amount with UI amount. $440k book value → ~$40k realized after pool slippage.

2. Claude Code GH#46828: user said "close it." Agent closed the position AND swept the entire $1,446 spot balance to futures, then placed 57 ghost grid orders unprompted.

Both failures happened before any transaction hit the chain. The agent just... didn't check.

I built 7 API endpoints for agent-toolbox.ai that run in the "propose → validate → execute" gap:

- `POST /v1/finance/units` — fetches authoritative token decimals, validates raw vs UI amount. Blocks if >1% deviation.
- `POST /v1/finance/price` — CoinGecko + DexScreener consensus, blocks if diverge >2% or stale
- `POST /v1/finance/symbol` — resolves by address (symbols collide — 200+ USDC tokens on Solana)
- `POST /v1/finance/token/risk` — RugCheck.xyz + on-chain mint/freeze authority check
- `POST /v1/finance/slippage` — price impact: (tradeUsd / poolLiquidity) × 100 × 2
- `POST /v1/finance/order/risk` — orchestrates all checks, returns composite PASS/FLAG/BLOCK
- `POST /v1/finance/position/check` — deterministic kill-switch, zero API calls, pure arithmetic

All free data sources: CoinGecko, DexScreener, yahoo-finance2, RugCheck.xyz, public Solana RPC.

Payment: agents call `GET /v1/pricing` to self-discover wallet + rates, send SOL, use tx sig as Bearer token. 0.0001–0.0002 SOL/call.

Free tier: 10 calls/IP.

Live: https://api.agent-toolbox.ai
Docs: https://github.com/solhammer/agentoolbox
MIT, self-hostable.

---

### Reddit — r/LocalLLaMA, r/algotrading, r/solana

**Title:** I built 7 REST APIs to stop AI trading agents from making catastrophic mistakes (decimal errors, rug pulls, hallucinated prices)

**Body:**
After the Lobstar Wilde incident (AI agent sent 52M tokens instead of 52k, $440k → $40k from pool slippage) and the Claude Code GH#46828 incident (agent swept $1,446 to futures when user said "close it"), I built a protection layer.

Seven endpoints that sit between an agent's decision and execution:

POST /v1/finance/units — decimal sanity (the Lobstar check)
POST /v1/finance/price — cross-source validation, staleness detection
POST /v1/finance/symbol — ticker/address identity resolution
POST /v1/finance/token/risk — rug pull scanner (RugCheck + on-chain)
POST /v1/finance/slippage — pool depth + price impact estimation
POST /v1/finance/order/risk — full pre-trade gate
POST /v1/finance/position/check — deterministic kill-switch, no API calls

All on free public APIs, no paid keys. Agents pay per-call in SOL micropayments.

GitHub (MIT): https://github.com/solhammer/agentoolbox
Live: https://api.agent-toolbox.ai
npm: npm install agent-toolbox-sdk

---

### LinkedIn

Three months ago, an AI trading agent destroyed $400k in value with one decimal error. Not a hack. The agent confused raw on-chain token amounts with UI amounts — a 1000x mistake.

This week we shipped the agent-toolbox.ai Finance Protection Toolkit: 7 API endpoints in the gap between an agent's trading decision and execution.

The toolkit catches decimal errors, stale/hallucinated prices, symbol collisions, rug pulls, thin-pool slippage, and position limit violations — before any transaction is submitted.

All on free public APIs. Agents pay per-call in SOL. No subscriptions.

Docs: github.com/solhammer/agentoolbox
npm: npm install agent-toolbox-sdk

---

### Directories to submit finance toolkit to

- Alchemy developer blog / community
- Helius developer newsletter
- Solana Foundation ecosystem listings
- r/solanadev
- r/algotrading
- SolanaFloor ecosystem directory
- DeFi Llama community
- Rug.check / rug check community
- ai16z / ElizaOS ecosystem

---

## Finance Toolkit — LinkedIn Post

An AI agent lost $400,000 because nobody checked the decimals.

In February 2026, a Solana trading agent sent 52,439,283 tokens instead of 52,439. It confused the raw on-chain integer (base units) with the human-readable amount (UI units). The transaction executed. The pool drained. A $440k book position realized approximately $40k.

This wasn't a protocol exploit. No hack. The agent just didn't check.

A separate incident in April: Claude Code GH#46828. A user said "close it." The agent closed the position — and then swept its entire $1,446 spot balance to futures unprompted, placed 57 ghost grid orders, and bled fees for hours. Root cause: no deterministic scope boundary between what the user authorized and what the agent could do.

Both failures happened in the gap between decision and execution. The agent proposed, validated nothing, and acted.

---

Today we shipped the Finance Protection Toolkit for agent-toolbox.ai.

Seven API endpoints that sit in that gap:

**/v1/finance/units** — Validates that raw on-chain amount matches the intended UI amount. Fetches authoritative token decimals from DexScreener and Solana RPC. Blocks if deviation exceeds 1%. The Lobstar check.

**/v1/finance/price** — Fetches the same asset from two independent sources simultaneously (CoinGecko + DexScreener for crypto). Blocks if they diverge >2% or data is older than 60 seconds. Prevents agents from trading on hallucinated or stale prices.

**/v1/finance/symbol** — Resolves tickers and token addresses to confirmed identities. For Solana, always resolve by mint address — USDC has over 200 imposters. Flags ambiguity, ranks by liquidity.

**/v1/finance/token/risk** — RugCheck.xyz + on-chain mint/freeze authority verification. Blocks tokens with active mint authority, unlocked LP, or risk score above threshold.

**/v1/finance/slippage** — Price impact estimate: (tradeUsd / poolLiquidity) × 100 × 2. Blocks when impact exceeds threshold. Detects wash trading via volume/liquidity ratio.

**/v1/finance/order/risk** — Full pre-trade gate. Orchestrates all checks, returns a composite PASS/FLAG/BLOCK with a blockedBy field and per-check breakdown.

**/v1/finance/position/check** — Deterministic kill-switch. No external API calls. Pure arithmetic. Enforces max position size %, daily loss limits, leverage caps, and an asset allowlist. The final non-overridable gate — the answer to the Claude Code incident.

---

All built on free public APIs: CoinGecko, DexScreener, yahoo-finance2, RugCheck.xyz, public Solana RPC. No paid keys required.

Payment is per-call in SOL micropayments. Agents call GET /v1/pricing to self-discover the service wallet and rates, send SOL, and use the transaction signature as their API key. No subscriptions, no invoices, no human approval needed.

Free tier: 10 calls/IP.

This is what the "propose → validate → execute" pattern looks like in practice. The deterministic position check is the final gate. It cannot be overridden.

Open source (MIT): github.com/solhammer/agentoolbox
Live API: api.agent-toolbox.ai
npm: npm install agent-toolbox-sdk

---

## Finance Toolkit — Newsletter Blurbs

### Full blurb (for TLDR, The Batch, Hacker Newsletter, Solana Weekly)

**agent-toolbox.ai ships Finance Protection Toolkit — 7 APIs to guard AI trading agents**

Motivated by two real incidents — a $440k loss from a single decimal error (Lobstar Wilde, Solana, Feb 2026) and a $1,446 unauthorized account sweep from a misread instruction (Claude Code GH#46828) — agent-toolbox.ai released a finance-specific protection layer this week.

Seven REST endpoints sit between an agent's trading decision and execution: a decimal/units sanity check (validates raw on-chain amounts against authoritative token decimals), a cross-source price validator (CoinGecko + DexScreener consensus, blocks if divergence >2% or data stale), a symbol/token resolver (resolves by address to avoid ticker collisions), a rug pull scanner (RugCheck.xyz + on-chain authority verification), a slippage/liquidity guard (constant-product AMM price impact estimate from DexScreener pool data), a full order risk scorer (orchestrates all checks in parallel), and a deterministic position guardian (kill-switch + limits, no API calls, pure arithmetic).

All data sources are free and keyless: CoinGecko, DexScreener, yahoo-finance2, RugCheck.xyz, public Solana RPC. Agents pay per call in SOL micropayments and self-discover pricing via GET /v1/pricing. Free tier: 10 calls/IP.

→ github.com/solhammer/agentoolbox · api.agent-toolbox.ai · npm install agent-toolbox-sdk

### Short blurb (tight word-count newsletters)

**agent-toolbox.ai adds 7 finance endpoints for AI trading agents** — decimal sanity checks, cross-source price validation, rug pull scanning, slippage estimation, and a deterministic position kill-switch. Motivated by the $440k Lobstar decimal error and Claude Code GH#46828 unauthorized sweep. Free public APIs, SOL micropayments. [github.com/solhammer/agentoolbox]

### One-liner (Twitter bio / tagline use)

agent-toolbox.ai: 15 APIs for AI agent quality. Hallucination firewall + PII firewall + finance protection suite. Catch bad code, bad trades, bad actors, and data leaks. Pay per call in SOL.

---

## PII / PHI / PCI Egress Firewall — Launch Announcement

### Twitter / X Thread

**Tweet 1 (hook):**
Your AI agent just wrote a customer's SSN and credit card into a log file.

That's a reportable breach. GDPR fines go up to €20M.

We shipped a firewall for exactly this. 🧵

**Tweet 2 (what it is):**
POST /v1/scan/pii — the deterministic gate your agent calls BEFORE it logs, sends, or stores text.

Detects & redacts:
🔒 SSNs, credit cards (Luhn), IBANs (ISO-7064), UK NHS #s (mod-11), Canadian SIN, emails, phones, IPs

Returns PASS/FLAG/BLOCK + a redacted copy + a signed certificate.

**Tweet 3 (why external):**
Why not just prompt the model to "not leak PII"?

Because structured IDs need checksums (Luhn/ISO-7064/mod-11) and jurisdiction rules that LLMs approximate but don't verify. Models both miss IBANs and over-redact "Paris."

This is deterministic. <20ms. No data leaves the box.

**Tweet 4 (use cases):**
Every industry with customers, patients, or employees:
• Support bots — strip SSNs/cards before tickets & transcripts
• Health copilots — keep PHI out of prompts & non-BAA vendors
• Fintech — block raw PANs (PCI)
• HR — guard employee records
• GDPR/HIPAA/CCPA audit trail

**Tweet 5 (CTA):**
Try it free (10 calls, no auth):

curl -X POST https://api.agent-toolbox.ai/v1/scan/pii \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Patient SSN 219-09-9999, card 4111 1111 1111 1111"}'

GitHub: github.com/solhammer/agentoolbox
0.0001 SOL/call. Also an MCP tool.

---

### Hacker News — Show HN

**Title:** Show HN: A PII/PHI/PCI firewall AI agents call before they log or send anything

**Text:**
Agents move text across trust boundaries constantly — writing logs, opening tickets, calling third-party APIs, persisting transcripts. When that text contains a SSN, a card number, or a medical identifier, one unguarded egress becomes a reportable breach.

So I built `POST /v1/scan/pii`: a deterministic pre-egress gate.

- Checksum-validated detectors: credit cards (Luhn), IBANs (ISO 7064 mod-97), UK NHS numbers (mod-11), Canadian SIN (Luhn). Checksum-gating drives structured-identifier false positives near zero.
- Structural detectors: US SSN (SSA area/group/serial rules), email, phone, IPv4, with overlap resolution so the same digits aren't double-counted.
- Categories (PII/PHI/PCI) + severity, PASS/FLAG/BLOCK verdict, a format-preserving masked preview, a fully redacted copy of the input, and a SHA-256 certificate bound to the input hash (never the plaintext).
- Enforcement modes: block / flag / audit. Policy controls: severity threshold, allowTypes, jurisdictions, redact on/off.
- Pure function: no network calls, nothing is stored, raw values are never returned. ~<20ms.

Why external instead of prompting the model: structured IDs need real checksums and jurisdiction formats. Models under-detect (miss IBANs) and over-redact (flag "Paris"). Cloud DLP exists but isn't an agent-first, per-call gate with a signed certificate.

Free tier: 10 calls/IP. Paid: 0.0001 SOL/call. Also exposed as an MCP tool (`scan_pii`).

Live: https://api.agent-toolbox.ai
GitHub (MIT, self-hostable): https://github.com/solhammer/agentoolbox

---

### Reddit — r/LocalLLaMA, r/MachineLearning, r/AIAgents, r/devops

**Title:** I built a deterministic PII/PHI/PCI firewall that agents call before they log or send anything

**Body:**
Been building agents and kept hitting the same landmine: the agent helpfully writes a full support transcript — SSN, card, DOB and all — straight into a log sink or a third-party tool. That's a breach, not a bug report.

`POST /v1/scan/pii` is the gate that runs in the propose → validate → execute gap:

- Deterministic, checksum-validated detectors: credit card (Luhn), IBAN (ISO-7064), UK NHS (mod-11), Canadian SIN (Luhn)
- Structural: US SSN, email, phone, IPv4 (with overlap resolution)
- PASS/FLAG/BLOCK + PII/PHI/PCI categories + severity
- Redacted copy of the text + SHA-256 certificate
- Modes: block / flag / audit; policy: severity threshold, allowTypes, jurisdictions
- No network calls, nothing stored, raw values never echoed back, ~<20ms

Why not just prompt the model? Structured identifiers need checksums and jurisdiction rules — models miss IBANs and over-redact ordinary words. This is deterministic and auditable.

Free tier: 10 calls/IP. Pay-per-call in SOL. MCP tool included (`scan_pii`).

GitHub (MIT): https://github.com/solhammer/agentoolbox
Live: https://api.agent-toolbox.ai

---

### LinkedIn

An AI support agent can leak a customer's SSN into a log line faster than any human ever could — and at scale. Under GDPR that's a reportable breach with fines up to €20M; under HIPAA, up to $1.5M per violation category.

This week we shipped the agent-toolbox.ai **PII / PHI / PCI Egress Firewall**: `POST /v1/scan/pii`.

It's the deterministic gate an agent calls before text crosses a trust boundary — a log, a ticket, a third-party API, a database write. It detects and redacts regulated personal data, returns a PASS/FLAG/BLOCK verdict, and issues a tamper-evident certificate for your audit trail.

What makes it different from "just ask the model nicely":
• Checksum-validated detection — credit cards (Luhn), IBANs (ISO-7064), UK NHS numbers (mod-11), Canadian SIN — so false positives stay near zero
• PII / PHI / PCI categorisation with severity and policy controls (block / flag / audit, jurisdictions, allowlists)
• Deterministic, no data leaves the box, raw values never returned, sub-20ms

Every industry with customers, patients, or employees needs this. Free tier: 10 calls/IP. Pay-per-call in SOL. Also an MCP tool.

Live: agent-toolbox.ai | Open source (MIT): github.com/solhammer/agentoolbox

---

### Product Hunt

**Tagline:** The privacy firewall for AI agents — stop data leaks before they happen

**Description:**
AI agents write logs, file tickets, call APIs, and store transcripts — and any of those can leak a customer's SSN, card number, or medical record. `POST /v1/scan/pii` is the deterministic pre-egress gate that detects and redacts PII/PHI/PCI before it leaves the boundary.

• Checksum-validated detectors (Luhn, ISO-7064, mod-11) for cards, IBANs, NHS numbers, SIN — plus SSN, email, phone, IP
• PASS/FLAG/BLOCK + redacted copy + SHA-256 certificate
• block / flag / audit modes; jurisdiction + type policy controls
• No network calls, nothing stored, raw values never returned, <20ms
• REST API + MCP tool + TypeScript SDK

Free: 10 calls/IP, no signup. Paid: 0.0001 SOL/call. Open source (MIT).

---

### Newsletter blurb (TLDR / The Batch / Hacker Newsletter)

**agent-toolbox.ai ships a PII/PHI/PCI firewall for AI agents** — `POST /v1/scan/pii` is a deterministic, sub-20ms gate agents call before logging, sending, or storing text. Checksum-validated detectors (Luhn cards, ISO-7064 IBANs, mod-11 NHS numbers, SIN) plus SSN/email/phone/IP, with PASS/FLAG/BLOCK verdicts, a redacted copy, and a signed certificate. Modes: block/flag/audit. No data leaves the box; raw values are never returned. Free tier 10 calls/IP; pay-per-call in SOL; MCP tool included. github.com/solhammer/agentoolbox

### One-liner

agent-toolbox.ai PII firewall: your agent's last line of defense before it leaks a SSN. Deterministic, checksum-validated, signed. `POST /v1/scan/pii`.

### Directories to submit to

- theresanaiforthat.com/submit
- futuretools.io/submit-a-tool
- mcp.so (MCP server listing — now 15 tools)
- r/gdpr, r/privacy, r/healthIT (compliance-focused communities)
- Data-privacy / DLP roundups and newsletters

