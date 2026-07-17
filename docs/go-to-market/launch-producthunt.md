# Product Hunt — Launch

## Product Name

Agentoolbox

## Tagline (≤60 chars)

26 deterministic safety gates for AI agents

_(55 chars)_

## Description

AI agents fail in predictable ways: hallucinated package imports that install malicious packages,
decimal errors that move the wrong amount of money, prompt injection that hijacks tool calls, secrets
leaked in logs. Agentoolbox is a set of 26 deterministic, offline pre-action gates that sit between
an agent's decision and the outside world.

Every tool returns a structured PASS / FLAG / BLOCK verdict plus a SHA-256 certificate you can log
and audit. No LLM in the hot path — same input always produces the same output.

**Six suites:**
- **Core** — import validation, output verification, content distillation
- **Security** — secrets, prompt injection, PII, command injection, SSRF/URL scanning
- **Finance** — unit/decimal guards, slippage, order risk, position checks
- **Compliance & Health** — sanctions screening, Rx cross-checks
- **Agent/Infra/Legal** — tool-arg validation, infra plan risk, legal citations/deadlines
- **Data & Validation** — identifier, schema, SQL safety

**Three ways to integrate:**
1. REST API — `POST https://api.agent-toolbox.ai/v1/<tool>`
2. MCP server — `npx -y agentoolbox-mcp` (stdio, works with Claude Desktop, Cursor, etc.)
3. TypeScript SDK — `npm install agent-toolbox-sdk`

**Pricing:** 0.0001 SOL per call via Solana micropayments. Free tier: 10 calls per IP, no signup.

---

## Maker's First Comment

Hey Product Hunt! Founder here.

The proximate cause for building this: a trading agent lost $440k because it confused a price-per-
unit with a total-lot price (the Lobstar incident). The fix was exactly one pre-action check — a
units-and-magnitude gate that would have caught the decimal error before the order was submitted.
That gate took us a day to write. Generalizing it to cover the other predictable agent failure modes
took a few months.

A few things I'm especially happy about:

**The MCP server** is the fastest integration path. If you're running any MCP-compatible client you
can add all 26 tools in one command: `npx -y agentoolbox-mcp`. No config file changes needed beyond
adding the server entry. Each tool is exposed with a full JSON Schema so the agent sees exactly what
arguments are valid.

**The certificate** is useful beyond compliance. Because the hash covers `{tool, input_hash, verdict,
timestamp}`, you can use it to build an immutable audit trail of what an agent was *allowed* to do.
That's useful for debugging regressions ("why did the agent do X last Tuesday?") and for demonstrating
to users that safety checks actually ran.

**No account required for 10 calls.** We made this intentional — eval friction kills adoption. Send
a real Solana transaction when you want more.

Try the free tier at https://agent-toolbox.ai, read the API docs, or star us on GitHub at
https://github.com/solhammer/agentoolbox. Genuinely happy to answer technical questions here.

---

## Suggested Topics / Tags

- Artificial Intelligence
- Developer Tools
- APIs
- Security
- Open Source
- TypeScript
- Productivity

---

## Gallery / Media Notes

- Hero: diagram showing agent → Agentoolbox gate → PASS/FLAG/BLOCK → action
- Screenshot 1: MCP tool list in Claude Desktop showing all 26 tools
- Screenshot 2: Example API response with certificate object
- Screenshot 3: Free tier / pricing endpoint JSON response
