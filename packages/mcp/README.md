# @agentoolbox/mcp
MCP server for [agent-toolbox.ai](https://agent-toolbox.ai) — the quality layer for AI agents. Exposes code- and output-quality tools to Claude, Cursor, Warp, Cline, and any MCP-compatible client over **stdio**.
## Tools
| Tool | Description |
|---|---|
| `validate_imports` | Checks every import in AI-generated code against live registries (PyPI, npm, crates.io, Go). Flags hallucinated / "slopsquatting" package names before you install them. |
| `verify_output` | Hallucination firewall for any LLM output. Returns a `PASS` / `FLAG` / `BLOCK` verdict with a tamper-evident certificate (checks hallucinated packages, dead URLs, malformed DOI/arXiv IDs, numeric contradictions). |
| `distill_context` | Compresses conversation history to a target token budget while preserving the system prompt and most recent messages. |
Runs locally over stdio — **no agent-toolbox API key required**. (`validate_imports` queries public package registries.)
## Install
Not yet published to npm — install from source:
```bash
git clone https://github.com/solhammer/agentoolbox
cd agentoolbox
pnpm install
pnpm --filter "@agentoolbox/mcp..." build   # builds the server + its workspace deps
```
This produces `packages/mcp/dist/index.js`.
## Configure your MCP client
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor**: `~/.cursor/mcp.json`
- **Warp**: Settings → MCP → Add server
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
The full REST API (secret scanning, prompt-injection detection, CVE/vulnerability scanning, token counting, and the Finance Protection Toolkit) lives at [api.agent-toolbox.ai](https://api.agent-toolbox.ai). These three tools are what's exposed over MCP today.
License: MIT.
