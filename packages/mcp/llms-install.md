# Installing the agent-toolbox MCP server (guide for coding agents)
The MCP server is published to npm as `agent-toolbox-mcp` and communicates over **stdio**. It requires **no API key or environment variables**. The quickest install is `npx -y agent-toolbox-mcp`; you can also build from source in this pnpm monorepo.
## Steps
1. Clone and build the server (and its workspace dependencies):
   ```bash
   git clone https://github.com/solhammer/agentoolbox
   cd agentoolbox
   pnpm install
   pnpm --filter "agent-toolbox-mcp..." build
   ```
2. The built entrypoint is `packages/mcp/dist/index.js`.
3. Add this to the MCP client configuration, replacing `<ABSOLUTE_PATH_TO_REPO>` with the absolute path of the clone:
   ```json
   {
     "mcpServers": {
       "agent-toolbox": {
         "command": "node",
         "args": ["<ABSOLUTE_PATH_TO_REPO>/packages/mcp/dist/index.js"]
       }
     }
   }
   ```
4. Verify: the server prints `agent-toolbox.ai MCP server running on stdio` to stderr on startup.
## Tools exposed
All 15: `validate_imports`, `verify_output`, `distill_context`, `scan_secrets`, `scan_injection`, `count_tokens`, `scan_vulnerabilities`, `scan_pii`, `finance_units`, `finance_price`, `finance_symbol`, `finance_token_risk`, `finance_slippage`, `finance_order_risk`, `finance_position_check`.
