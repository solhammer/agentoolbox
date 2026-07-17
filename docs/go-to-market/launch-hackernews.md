# Hacker News — Show HN

## Title

Show HN: Agentoolbox – 26 deterministic, offline pre-action gates for AI agents (REST/MCP)

---

## Body

We built Agentoolbox after watching agents do things that never should have happened: a trading agent
lost $440k to a single decimal-place error (the Lobstar incident), Claude Code made a $1,446
unauthorized sweep, and USENIX 2025 found that 19.7% of AI-generated package imports are
hallucinated — a vector called "slopsquatting."

The common thread: agents were allowed to act without a lightweight, trusted pre-check that ran
*before* the side effect.

Agentoolbox is 26 tools across 6 suites that sit between an agent's decision and the outside world.
Every call is:

- **Deterministic** — same input, same verdict, always. No LLM in the hot path.
- **Offline-capable** — logic runs without external network calls for most tools. No SSRF surface.
- **Auditable** — each response includes a tamper-evident SHA-256 certificate you can log and replay.

**Suites:**

| Suite | What it stops |
|---|---|
| Core | Import hallucinations, output verification, content distillation |
| Security | Secrets, prompt injection, PII, command injection, SSRF/URL |
| Finance | Unit/decimal errors, slippage, order risk, position sizing |
| Compliance & Health | Sanctions screening, Rx cross-checks |
| Agent/Infra/Legal | Tool-arg validation, infra plan risk, legal citation/deadline |
| Data & Validation | Identifier, schema, SQL safety |

**Surfaces:** REST API (`https://api.agent-toolbox.ai`), MCP server (`npx -y agentoolbox-mcp`,
stdio transport), TypeScript SDK (`agent-toolbox-sdk`).

**Pricing:** Solana micropayments — 0.0001 SOL per call (~$0.000015 at current rates). Free tier is
10 calls per IP with no auth. Pass a Solana tx signature as the Bearer token to load credits. All
prices are programmatically discoverable via `GET /v1/pricing`.

GitHub: https://github.com/solhammer/agentoolbox  
Docs: https://agent-toolbox.ai

Happy to answer questions about the determinism guarantee, the certificate format, or why we chose
Solana for micropayments.

---

## First Technical Comment (to post immediately after submission)

A few implementation details that didn't fit in the pitch:

**Determinism:** Every tool runs a defined algorithm — regex patterns, checksum comparisons,
rule-based classifiers — not a generative model. Given identical input bytes the output is
identical. This makes the verdict loggable, reproducible, and testable in CI.

**Why offline:** Most tools require no outbound network calls. This matters for two reasons: (1)
latency — a gate that adds 800 ms round-trip gets disabled by developers; (2) SSRF — if the gate
itself makes external requests it becomes an attack surface. The URL scanner is the one exception;
it performs controlled resolution with SSRF protections against the 169.254.169.254 metadata
endpoint and private ranges.

**The certificate:** Each API response includes a `certificate` object with:

```json
{
  "certificate": {
    "hash": "sha256:<hex>",
    "timestamp": "<ISO-8601>",
    "tool": "<endpoint>",
    "verdict": "PASS | FLAG | BLOCK"
  }
}
```

Hash input is the canonical JSON of `{tool, input_hash, verdict, timestamp}`. You store the
certificate alongside your audit log; if a verdict is ever disputed you can reproduce the hash from
the inputs and confirm nothing was tampered with.

**Free tier mechanics:** 10 calls per IP, no registration. This is intentional — we wanted zero
friction for evaluation. Once you need volume, send any Solana transaction to our deposit address
and pass the tx signature as `Authorization: Bearer <sig>`. Credits resolve on-chain; no account
creation required.

**MCP integration:** The stdio MCP server wraps all 26 tools so any MCP-compatible agent
(Claude Desktop, cursor, etc.) can call them natively. Schema validation is done on the server side
before the tool logic runs, so malformed agent calls get a structured error rather than a crash.
