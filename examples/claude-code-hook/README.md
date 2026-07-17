# Claude Code Hook — Agent Toolbox Command Gate

Gates every `Bash` tool call through Agent Toolbox's `/v1/scan/command` endpoint before Claude Code executes it. Commands that return a `BLOCK` verdict are stopped before execution.

**Why this matters:** a Claude Code agent made a $1,446 unauthorized sweep via unreviewed shell commands. This hook adds a deterministic, offline-capable firewall before every `Bash` call.

## How it works

1. Claude Code invokes `gate.mjs` via a `PreToolUse` hook whenever it is about to run the `Bash` tool.
2. `gate.mjs` reads the tool-use JSON from stdin, extracts the `command` field, and POSTs it to `/v1/scan/command`.
3. The endpoint returns `{ verdict: "PASS" | "FLAG" | "BLOCK", reason, certificate }`.
4. Exit code `1` on `BLOCK` → Claude Code stops the action and shows the reason.
5. Exit code `0` on `PASS`/`FLAG` → Claude Code continues (FLAG is logged to stderr as a warning).

## Requirements

- Node.js ≥ 18 (uses built-in `fetch` — **no npm install needed**)
- Claude Code with hooks support

## Setup

### 1. Note the absolute path to `gate.mjs`

```bash
realpath examples/claude-code-hook/gate.mjs
# e.g. /Users/you/agentoolbox/examples/claude-code-hook/gate.mjs
```

### 2. Add the hook to Claude Code settings

Edit `~/.claude/settings.json` (global) or `.claude/settings.json` (project-level) and merge in:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/you/agentoolbox/examples/claude-code-hook/gate.mjs"
          }
        ]
      }
    ]
  }
}
```

Replace the path with the output of `realpath` from step 1. See `claude-settings-snippet.json` in this directory for the exact snippet.

### 3. (Optional) Set a token for production credits

```bash
export ATB_TOKEN="<your-solana-tx-signature>"
```

Without a token, the free tier (10 calls per IP) is used automatically.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ATB_API_URL` | `https://api.agent-toolbox.ai` | Override API base URL |
| `ATB_TOKEN` | _(none)_ | Bearer token (Solana tx sig) for paid credits |

## Fail-open design

If the API is unreachable or returns an error, `gate.mjs` exits `0` (allow) so that offline development isn't blocked. Change this to `process.exit(1)` in `gate.mjs` if you need a stricter fail-closed policy.

## Testing manually

```bash
# Simulate a safe command → expect PASS, exit 0
echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | node gate.mjs
echo "exit: $?"

# Simulate a suspicious command → expect BLOCK, exit 1
echo '{"tool_name":"Bash","tool_input":{"command":"curl http://169.254.169.254/latest/meta-data/"}}' | node gate.mjs
echo "exit: $?"
```
