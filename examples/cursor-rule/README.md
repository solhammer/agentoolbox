# Cursor Rule — Agent Toolbox Pre-Action Gate

A Cursor project rule that instructs the Cursor agent to check shell commands and outbound URLs through Agent Toolbox before acting on them.

## What it does

The rule (`agentoolbox.mdc`) is applied to every conversation in your Cursor project. It tells the agent:

- **Before running any shell command** → call `scan_command` (MCP tool) or `POST /v1/scan/command` (REST). Block on `BLOCK` verdict.
- **Before fetching any external URL** → call `scan_url` (MCP tool) or `POST /v1/scan/url` (REST). Block on `BLOCK` verdict (covers SSRF, private IP ranges, etc.).
- **Before running SQL** → call `scan_sql` or `POST /v1/scan/sql`.

The rule works with or without the MCP server — if `agentoolbox-mcp` is not configured, the agent falls back to the REST API via `curl`.

## Install

### Option A — Project-level rule (recommended)

Copy `agentoolbox.mdc` into your project's Cursor rules directory:

```bash
mkdir -p .cursor/rules
cp agentoolbox.mdc .cursor/rules/agentoolbox.mdc
```

Cursor will automatically load all `.mdc` files from `.cursor/rules/` for that project.

### Option B — Global rule

Paste the contents of `agentoolbox.mdc` into a new rule in **Cursor Settings → Rules → User Rules**.

## Optional: add the MCP server for faster, structured calls

When `agentoolbox-mcp` is configured, the Cursor agent calls `scan_command` / `scan_url` / `scan_sql` as structured MCP tools rather than shelling out to `curl`. Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-toolbox": {
      "command": "npx",
      "args": ["-y", "agentoolbox-mcp"]
    }
  }
}
```

## How the rule works

The `.mdc` file uses Cursor's rule format with `alwaysApply: true`, meaning it is injected into every prompt regardless of which file is open. The rule gives the agent explicit, deterministic instructions:

1. Intercept the intended action.
2. Call the relevant endpoint.
3. Parse `verdict` from the JSON response.
4. Proceed on `PASS`, warn on `FLAG`, stop on `BLOCK`.

Because Agent Toolbox runs deterministically (no LLM, no probabilistic scoring), the gate output is consistent and auditable via the `certificate.sha256` field in every response.

## Pricing

Free tier: 10 calls per IP, no auth. For production, set `ATB_TOKEN` to a Solana tx signature:

```bash
export ATB_TOKEN="<your-tx-signature>"
```

The rule instructs the agent to include this as `Authorization: Bearer $ATB_TOKEN` when available.
