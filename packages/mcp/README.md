# agentoolbox-mcp
MCP server for [agent-toolbox.ai](https://agent-toolbox.ai) — the quality layer for AI agents. Exposes code- and output-quality tools to Claude, Cursor, Warp, Cline, and any MCP-compatible client over **stdio**.
## Tools (15)
Core: `validate_imports`, `verify_output`, `distill_context`
Security & privacy: `scan_secrets`, `scan_injection`, `count_tokens`, `scan_vulnerabilities`, `scan_pii`
Finance: `finance_units`, `finance_price`, `finance_symbol`, `finance_token_risk`, `finance_slippage`, `finance_order_risk`, `finance_position_check`
Runs locally over stdio, in-process — **no API key or env vars** (free public data sources only).
## Install
No clone or build needed:
```json
{
  "mcpServers": {
    "agent-toolbox": { "command": "npx", "args": ["-y", "agentoolbox-mcp"] }
  }
}
```
Or build from source:
```bash
git clone https://github.com/solhammer/agentoolbox
cd agentoolbox
pnpm install
pnpm --filter "agentoolbox-mcp..." build   # builds the server + its workspace deps
```
This produces `packages/mcp/dist/index.js` (use `"command": "node"` with its absolute path).
## Configure your MCP client
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor**: `~/.cursor/mcp.json`
- **Warp**: Settings → Agents → MCP servers → Add
```json
{
  "mcpServers": {
    "agent-toolbox": {
      "command": "node",
      "args": ["/absolute/path/to/agentoolbox/packages/mcp/dist/index.js"]
    }
  }
}
```
Replace `/absolute/path/to/agentoolbox` with the path where you cloned the repo.
## More
The full REST API lives at [api.agent-toolbox.ai](https://api.agent-toolbox.ai); all 15 tools are exposed over MCP.
License: MIT.
