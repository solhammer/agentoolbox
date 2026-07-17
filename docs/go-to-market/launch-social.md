# Social Launch Copy

---

## X / Twitter — Launch Thread

**Post 1 (anchor)**

We built Agentoolbox: 26 deterministic, offline pre-action gates for AI agents.

PASS / FLAG / BLOCK verdict + SHA-256 certificate on every call. No LLM in the hot path. Free tier,
no auth.

REST API · MCP server · TypeScript SDK

🧵

---

**Post 2 (the problem)**

Three incidents that defined the design:

• A trading agent lost $440k to a single decimal error (Lobstar)
• A Claude Code agent made a $1,446 unauthorized sweep
• USENIX 2025: 19.7% of AI-generated package imports are hallucinated ("slopsquatting")

All three were preventable with a pre-action check. None required an LLM to catch.

---

**Post 3 (the solution)**

Each Agentoolbox tool runs between the agent's decision and the side effect.

Input → deterministic rule-based check → verdict → act (or don't).

Same input, same verdict, always. You can test this in CI. You can log it. You can audit it.

---

**Post 4 (the certificate)**

Every response includes a tamper-evident certificate:

```json
{
  "certificate": {
    "hash": "sha256:3f2a...",
    "timestamp": "2025-07-17T03:00:00Z",
    "tool": "/v1/finance/units",
    "verdict": "BLOCK"
  }
}
```

Hash covers: tool + input hash + verdict + timestamp.

Store it next to your audit log. Reproduce it later to prove the check ran.

---

**Post 5 (the 6 suites)**

26 tools across 6 suites:

🔒 Security — secrets, injection, PII, command, SSRF/URL
💰 Finance — decimal errors, slippage, order risk, position
⚖️ Compliance — sanctions, Rx cross-checks
🛠 Core — import validation, output verify, distill
🏗 Agent/Infra/Legal — tool args, infra plan, cite, deadline
✅ Data — identifier, schema, SQL safety

---

**Post 6 (MCP)**

The fastest path: add all 26 tools to Claude Desktop, Cursor, or any MCP-compatible client with one
command:

`npx -y agentoolbox-mcp`

stdio transport, full JSON Schema per tool, structured errors on bad args.

No config changes beyond the server entry.

---

**Post 7 (pricing)**

Pricing: 0.0001 SOL per call (~$0.000015). Some tools cost 2–5 credits.

Free tier: 10 calls per IP, no account, no signup.

To load credits: send any Solana tx → pass the signature as `Authorization: Bearer <sig>`. No
account creation. Prices via `GET /v1/pricing`.

---

**Post 8 (CTA)**

Try it:

API: https://api.agent-toolbox.ai
MCP: `npx -y agentoolbox-mcp`
SDK: `npm install agent-toolbox-sdk`
Docs + free tier: https://agent-toolbox.ai
GitHub: https://github.com/solhammer/agentoolbox

What tool would you add to the set?

---

## Reddit — r/LocalLLaMA

**Title:** Agentoolbox — 26 deterministic pre-action gates for AI agents (MCP + REST, offline, free tier)

**Body:**

Built something I wish had existed before: a set of 26 deterministic, offline tools that sit between
a local agent's decision and the outside world. Every tool returns PASS / FLAG / BLOCK plus a
SHA-256 certificate. No generative model in the hot path.

**Why this exists:** Three incidents drove the design.

1. A trading agent lost $440k to a single decimal error (the Lobstar incident). One units-and-magnitude
   check would have caught it.
2. A Claude Code agent made a $1,446 unauthorized sweep. A pre-action finance gate would have flagged it.
3. USENIX 2025 found 19.7% of AI-generated package imports are hallucinated ("slopsquatting"). The
   `/v1/validate/imports` tool catches these before they're installed.

**Six suites:**

| Suite | Tools include |
|---|---|
| Core | Import validation, output verify, distill |
| Security | Secrets, prompt injection, PII, command injection, SSRF/URL |
| Finance | Units/decimal guard, slippage, order risk, position check |
| Compliance | Sanctions screening, Rx cross-check |
| Agent/Infra/Legal | Tool-arg validation, infra plan risk, legal cite/deadline |
| Data | Identifier, schema, SQL safety |

**Local LLM angle:** Because the gates are deterministic (no LLM in the path), they work the same
regardless of which model you're running locally. Output is reproducible, testable in CI, and doesn't
add model inference latency. The SSRF protections in `/v1/scan/url` are specifically designed for
local agent environments where the metadata endpoint (169.254.169.254) is reachable.

**Three integration paths:**
- REST API: `POST https://api.agent-toolbox.ai/v1/<tool>`
- MCP: `npx -y agentoolbox-mcp` (stdio, works with Open WebUI tool calls, LM Studio, Continue, etc.)
- TypeScript SDK: `npm install agent-toolbox-sdk`

**Pricing:** 0.0001 SOL per call. Free tier is 10 calls per IP with no auth. Full pricing via
`GET /v1/pricing`.

GitHub: https://github.com/solhammer/agentoolbox
Docs: https://agent-toolbox.ai

Happy to answer questions about the determinism approach or the certificate format.

---

## Reddit — r/mcp

**Title:** Agentoolbox MCP server — 26 safety gate tools for agents (deterministic, offline, free)

**Body:**

Just launched an MCP server that exposes 26 deterministic pre-action safety gates. Install in one
command:

```
npx -y agentoolbox-mcp
```

stdio transport. All 26 tools available immediately to any MCP-compatible client (Claude Desktop,
Cursor, Continue, etc.).

**What the tools do:** Each tool sits between an agent's decision and an external action. It returns
PASS / FLAG / BLOCK plus a SHA-256 certificate. No LLM in the path — deterministic, reproducible,
testable.

**Six suites (26 tools total):**

- **Core:** `/v1/validate/imports`, `/v1/verify`, `/v1/distill`
- **Security:** `/v1/scan/secrets`, `/v1/scan/injection`, `/v1/tokens/count`, `/v1/scan/vulnerabilities`,
  `/v1/scan/pii`, `/v1/scan/command`, `/v1/scan/url`
- **Finance:** `/v1/finance/units`, `/v1/finance/price`, `/v1/finance/symbol`,
  `/v1/finance/token/risk`, `/v1/finance/slippage`, `/v1/finance/order/risk`,
  `/v1/finance/position/check`
- **Compliance & Health:** `/v1/compliance/sanctions`, `/v1/health/rx-check`
- **Agent/Infra/Legal:** `/v1/agent/tool-args`, `/v1/infra/plan/risk`, `/v1/legal/cite`,
  `/v1/legal/deadline`
- **Data & Validation:** `/v1/validate/identifier`, `/v1/validate/schema`, `/v1/scan/sql`

**Example use case with MCP:** Before your agent calls `execute_command`, route the command string
through `/v1/scan/command` first. If verdict is BLOCK, the agent never issues the shell call. If
FLAG, the agent can ask for user confirmation. If PASS, proceed. The certificate in the response is
your audit record.

**Pricing:** 0.0001 SOL per call. First 10 calls per IP are free with no auth.

Full tool schemas and docs: https://agent-toolbox.ai  
GitHub: https://github.com/solhammer/agentoolbox
