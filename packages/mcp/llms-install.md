# Installing the agent-toolbox MCP server (guide for coding agents)
This repository is a pnpm monorepo. The MCP server is the `@agentoolbox/mcp` package and communicates over **stdio**. It requires **no API key or environment variables**.
## Steps
1. Clone and build the server (and its workspace dependencies):
   ```bash
   git clone https://github.com/solhammer/agentoolbox
   cd agentoolbox
   pnpm install
   pnpm --filter "@agentoolbox/mcp..." build
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
`validate_imports`, `verify_output`, `distill_context`.
