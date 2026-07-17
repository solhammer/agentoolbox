# LangChain Tool — Agent Toolbox Pre-Action Gates

Three `DynamicStructuredTool` wrappers that add Agent Toolbox's deterministic security gates to any LangChain agent:

| Tool | Gates | REST endpoint |
|---|---|---|
| `scanCommandTool` | Shell commands before execution | `POST /v1/scan/command` |
| `scanUrlTool` | Outbound URLs before fetch | `POST /v1/scan/url` |
| `scanSqlTool` | SQL queries before execution | `POST /v1/scan/sql` |

Each tool returns a `PASS` or `FLAG` observation to the agent, or **throws an error on `BLOCK`** so the agent cannot proceed with the rejected action.

## Why

- **Shell:** a Claude Code agent made a $1,446 unauthorized sweep via unreviewed shell commands. `scan_command` adds a deterministic gate before any exec.
- **URL:** SSRF to `169.254.169.254` (cloud metadata endpoint) is one of the most common agent exploit vectors. `scan_url` blocks it outright.
- **SQL:** injection patterns and destructive statements (`DROP TABLE`, `TRUNCATE`, etc.) are caught before they reach the database.

Every verdict is backed by a tamper-evident `certificate.sha256` for auditability.

## Install

This example is outside the monorepo workspace — install dependencies locally:

```bash
cd examples/langchain-tool
npm install
```

No API key is required for the free tier (10 calls/IP). Set `ATB_TOKEN` for production.

## Usage

### 1. Import into your agent

```typescript
import { scanCommandTool, scanUrlTool, scanSqlTool } from "./tool.js";
import { createToolCallingAgent } from "langchain/agents";

const tools = [
  scanCommandTool,
  scanUrlTool,
  scanSqlTool,
  // ...your other tools
];

const agent = createToolCallingAgent({ llm, tools, prompt });
```

Your system prompt should instruct the agent to call these tools before the corresponding actions. Example addition to your system prompt:

```
Before executing any shell command, call scan_command with the exact command string.
Before fetching any URL, call scan_url with the full URL.
Before running any SQL query, call scan_sql with the exact query.
If any tool returns a BLOCK, do not proceed with the action.
```

### 2. Run the demo

```bash
npm run example
# or
npx tsx example-agent.ts
```

The demo exercises each tool against safe and risky inputs, printing the verdict without needing an LLM.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ATB_API_URL` | `https://api.agent-toolbox.ai` | Override API base URL |
| `ATB_TOKEN` | _(none)_ | Bearer token (Solana tx sig) for paid credits; free tier used if unset |

## How BLOCK works

When a gate returns `BLOCK`, the tool throws an `Error`. LangChain surfaces this as a tool error observation, which the agent sees as a failed tool call. A well-prompted agent will then report the block reason to the user instead of retrying with the same action.

If you want stricter behavior (e.g. terminate the agent run on any BLOCK), wrap the `AgentExecutor` with a custom callback that inspects tool errors.

## Pricing

- Free tier: 10 calls/IP with no auth.
- Paid: 0.0001 SOL per call (1 credit). `GET /v1/pricing` for programmatic discovery.
- Load credits by passing a Solana tx signature as `ATB_TOKEN`.
