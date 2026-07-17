# Publishing agentoolbox-mcp to the MCP Registry

The [MCP Registry](https://registry.modelcontextprotocol.io) hosts metadata for the `io.github.solhammer/agent-toolbox` server. Publishing is done with the official `mcp-publisher` CLI.

## Prerequisites

1. The npm package `agentoolbox-mcp` must already be published at the matching version (`0.1.3` or whatever version is in `server.json`).  
   Version in `packages/mcp/package.json`, `packages/mcp/server.json`, and the npm publish must all match.
2. `package.json` must contain `"mcpName": "io.github.solhammer/agent-toolbox"` — this is how the registry verifies npm package ownership.  
   `mcpName` **must** exactly match the `name` field in `server.json`.
3. A GitHub account with access to the `solhammer` organization (the registry uses `io.github.solhammer/*` namespace via GitHub OAuth).

## Install mcp-publisher

```bash
# macOS/Linux
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/

# Homebrew
brew install mcp-publisher
```

## Publish

From the repo root or `packages/mcp/`:

```bash
# 1. Authenticate via GitHub (io.github.solhammer/* namespace requires GitHub auth)
mcp-publisher login github
#   → opens device-flow URL; paste the printed code at https://github.com/login/device

# 2. Publish server.json to the registry
mcp-publisher publish
#   → reads packages/mcp/server.json and pushes metadata to registry.modelcontextprotocol.io
```

Run `mcp-publisher publish` from the directory that contains `server.json`, or pass the path explicitly.

## Verify

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.solhammer/agent-toolbox"
```

## Notes

- Each version string must be unique. Republishing the same version will fail.
- Update both `package.json` (for `npm publish`) and `server.json` versions together.
- `mcp-publisher init` can regenerate a `server.json` template from `package.json` if needed.
- Authentication tokens are stored locally by the CLI; run `mcp-publisher logout` to clear them.
