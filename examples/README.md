# Agent Toolbox — Integration Examples

These examples show how to wire Agent Toolbox (https://api.agent-toolbox.ai) as a **pre-tool-call firewall** across different AI coding environments. Every integration follows the same pattern:

> Before an agent executes a shell command, fetches a URL, or runs a SQL query → call the relevant Agent Toolbox endpoint → check the verdict → block on `BLOCK`, surface the reason on `FLAG`, proceed on `PASS`.

Each call returns a JSON response with a `verdict` field and a tamper-evident `certificate.sha256` you can log for auditability.

## Free tier

10 calls per IP, no auth required. For production, pass a Solana tx signature as a Bearer token to load credits (0.0001 SOL / call; `GET /v1/pricing` for details).

---

## Integration map

| Directory | Environment | Endpoints used | Workflow gated |
|---|---|---|---|
| `claude-code-hook/` | Claude Code | `/v1/scan/command` | Shell commands (Bash tool) |
| `cursor-rule/` | Cursor | `scan_command`, `scan_url` (MCP) or REST | Shell commands + outbound URLs |
| `langchain-tool/` | LangChain (TypeScript) | `/v1/scan/command`, `/v1/scan/url`, `/v1/scan/sql` | Any agent tool call invoking shell, network, or DB |

---

## claude-code-hook

A Claude Code `PreToolUse` hook on the `Bash` tool. Before Claude executes any shell command, `gate.mjs` posts the command string to `/v1/scan/command`. If the verdict is `BLOCK`, the hook exits non-zero, Claude Code stops the action and surfaces the reason.

**Motivating incident:** a Claude Code agent made a $1,446 unauthorized sweep by executing unreviewed shell commands. This hook adds a deterministic gate before every `Bash` call.

→ See [`claude-code-hook/README.md`](claude-code-hook/README.md)

## cursor-rule

A Cursor rule (`.cursor/rules/agentoolbox.mdc`) that instructs the Cursor agent to check commands and URLs through Agent Toolbox MCP tools — or the REST API — before acting on them. Works even without the MCP server by falling back to `curl`.

→ See [`cursor-rule/README.md`](cursor-rule/README.md)

## langchain-tool

Three LangChain `DynamicStructuredTool` wrappers — `scanCommand`, `scanUrl`, and `scanSql` — that your agent can call before running shell commands, fetching external URLs, or executing SQL. Uses the public REST API via `fetch` (no additional dependencies beyond `langchain` and `zod`).

→ See [`langchain-tool/README.md`](langchain-tool/README.md)

---

## Running these examples

These examples live **outside** the pnpm workspace (no `pnpm install` at the root affects them). Each subdirectory is self-contained with its own `package.json` where applicable.

```bash
# LangChain tool
cd examples/langchain-tool
npm install
npx tsx example-agent.ts
```

For the Claude Code hook and Cursor rule, follow the per-directory READMEs — they require no install beyond a working Node.js runtime.
