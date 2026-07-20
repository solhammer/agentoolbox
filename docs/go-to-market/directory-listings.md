# Directory Listings

## Canonical Values (use verbatim across all directories)

**Install command:**
```
npx -y agentoolbox-mcp
```

**One-line value prop:**
26 deterministic, offline pre-action safety gates for AI agents — PASS/FLAG/BLOCK verdict + SHA-256 certificate on every call.

---

## MCP Registry (modelcontextprotocol/servers or equivalent)

**Short blurb (≤160 chars):**
26 deterministic offline safety gates for AI agents. Secrets, injection, finance, compliance, legal, and more. PASS/FLAG/BLOCK + certificate.

_(143 chars)_

**Long blurb:**
Agentoolbox MCP server exposes 26 deterministic, offline pre-action safety gates across six suites:
Security (secrets, prompt injection, PII, command injection, SSRF/URL), Finance (units/decimal,
slippage, order risk, position), Core (import validation, output verify, distill), Compliance &
Health (sanctions, Rx), Agent/Infra/Legal (tool args, infra plan risk, legal cite/deadline), and
Data & Validation (identifier, schema, SQL safety).

Each tool returns a structured PASS / FLAG / BLOCK verdict plus a tamper-evident SHA-256 certificate
suitable for audit logging. No LLM in the hot path — identical inputs always produce identical
outputs.

**Install:** `npx -y agentoolbox-mcp` (stdio transport)  
**Pricing:** 0.0001 SOL per call; first 10 calls per IP free, no auth required.  
**Docs:** https://agent-toolbox.ai  
**API:** https://api.agent-toolbox.ai  
**GitHub:** https://github.com/solhammer/agentoolbox

---

## Smithery

**Short blurb (≤160 chars):**
Safety gates for AI agents: 26 deterministic tools (secrets, injection, finance, compliance, legal). Offline, auditable, MCP-native.

_(134 chars)_

**Long blurb:**
Agentoolbox gives AI agents a quality layer before every consequential action. 26 deterministic,
offline tools return PASS / FLAG / BLOCK plus a SHA-256 certificate you can store in your audit log.
No generative model in the hot path — verdicts are reproducible and testable in CI.

Suites: Security · Finance · Core · Compliance & Health · Agent/Infra/Legal · Data & Validation.

Integrate in seconds:
- **MCP:** `npx -y agentoolbox-mcp`
- **REST:** `POST https://api.agent-toolbox.ai/v1/<tool>`
- **SDK:** `npm install agent-toolbox-sdk`

Pricing: 0.0001 SOL per call. First 10 calls per IP free with no signup.

---

## mcp.so

**Short blurb (≤160 chars):**
26 offline safety gates for agents: secrets, injection, PII, finance, sanctions, SQL, and more. PASS/FLAG/BLOCK + SHA-256 audit cert.

_(135 chars)_

**Long blurb:**
Agentoolbox is the quality layer every AI agent needs. Before your agent writes a file, submits an
order, or executes a shell command — run it through one of 26 deterministic gates. Each gate
returns a verdict (PASS / FLAG / BLOCK) and a tamper-evident SHA-256 certificate.

What's covered:
- Secrets, prompt injection, PII, command injection, SSRF/URL scanning
- Units/decimal errors, slippage, order risk, position size, token risk
- Import hallucination detection (19.7% of AI-generated imports are fake — USENIX 2025)
- Sanctions screening, Rx cross-checks, legal citation/deadline validation
- Identifier, schema, and SQL safety

No LLM in the decision path. Offline by design. Reproducible outputs.

**Quick start:** `npx -y agentoolbox-mcp`  
**Pricing:** 0.0001 SOL/call · 10 free calls per IP  
**Docs:** https://agent-toolbox.ai

---

## Glama

**Short blurb (≤160 chars):**
Agentoolbox: 26 deterministic pre-action gates for AI agents. Offline, auditable, PASS/FLAG/BLOCK + certificate. Free tier, no auth.

_(133 chars)_

**Long blurb:**
Agentoolbox is a set of 26 deterministic, offline tools that act as pre-action gates for AI agents.
Every tool takes a proposed action's inputs, runs a rule-based check (no generative model), and
returns a structured verdict: PASS, FLAG, or BLOCK — plus a SHA-256 certificate that covers the
tool name, input hash, verdict, and timestamp.

Real incidents that motivated the design: a trading agent lost $440k to a decimal error (Lobstar);
USENIX 2025 found 19.7% of AI-generated package imports are hallucinated. Agentoolbox catches these
before they become side effects.

Six suites: Security · Finance · Core · Compliance & Health · Agent/Infra/Legal · Data & Validation.

Install the MCP server: `npx -y agentoolbox-mcp`

Pricing: Solana micropayments at 0.0001 SOL per call. First 10 calls per IP are free with no
account required.

GitHub: https://github.com/solhammer/agentoolbox  
Docs: https://agent-toolbox.ai

---

## PulseMCP

**Short blurb (≤160 chars):**
26 deterministic offline safety gates for AI agents — injection, secrets, finance, compliance, legal. MCP + REST + SDK. Free 10 calls.

_(136 chars)_

**Long blurb:**
Agentoolbox is the pre-action safety layer for AI agents. 26 deterministic, offline tools across
six suites return a PASS / FLAG / BLOCK verdict plus a tamper-evident SHA-256 certificate on every
call. No LLM in the hot path — outputs are reproducible, loggable, and CI-testable.

**Coverage:**
- **Security:** secrets, prompt injection, PII, command injection, SSRF/URL
- **Finance:** units/decimal guard, price check, slippage, order risk, position size, token risk
- **Core:** import validation (catches hallucinated packages), output verify, distill
- **Compliance & Health:** sanctions screening, Rx cross-checks
- **Agent/Infra/Legal:** tool-arg validation, infra plan risk, legal citation/deadline
- **Data & Validation:** identifier, schema, SQL safety

**Surfaces:** MCP server (stdio) · REST API · TypeScript SDK

**Install:** `npx -y agentoolbox-mcp`  
**Free tier:** 10 calls per IP, no account  
**Pricing:** 0.0001 SOL per call; `GET /v1/pricing` for programmatic discovery  
**Docs:** https://agent-toolbox.ai  
**GitHub:** https://github.com/solhammer/agentoolbox

---

## mcpmarket.com

**Priority:** Low — submit only after the core directories above (Registry, Smithery, mcp.so, Glama, PulseMCP). mcpmarket does **not** auto-sync from the Official Registry, so it needs a manual submission.

**Tier:** **Free Queue ($0)** — avg 4–6 week listing time, no "Official" badge, no "Try Now" link. Do NOT pay the $29 "Get Listed Now" fast-track unless referral traffic later justifies it.

**Submit at:** https://mcpmarket.com/submit (browser form — GitHub repo URL + notification email; no API/CLI, may include a captcha)

**Short blurb (≤160 chars):**
26 deterministic, offline pre-action gates for AI agents — secrets, injection, finance, compliance, legal. PASS/FLAG/BLOCK + SHA-256 certificate.

_(~145 chars)_

**Fields:**
- **Type:** MCP Server → GitHub repo
- **GitHub repo:** https://github.com/solhammer/agentoolbox
- **Homepage:** https://agent-toolbox.ai
- **Category:** Security (also fits Developer Tools)
- **Tags:** mcp, security, agents, finance, compliance

**Note:** mcpmarket auto-pulls the name, description, install snippet, and tools list from the repo README, so the README's first paragraph drives listing quality. Keep GitHub topics including `mcp` and `model-context-protocol` (also feeds free auto-indexers like Glama).
