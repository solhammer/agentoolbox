# agent-toolbox.ai

AI agent quality utility — hallucination firewall, import validator, context distiller.

A set of agent-callable REST + MCP services that verify and improve LLM outputs before they cause damage. Pay per call in SOL (Solana micropayments).

**Live:** [agent-toolbox.ai](https://agent-toolbox.ai) · **API:** `https://api.agent-toolbox.ai`

## Services

| Endpoint | What it does | Latency |
|---|---|---|
| `POST /v1/validate/imports` | Checks every import in AI-generated code against live registries (PyPI, npm, crates.io, Go). Catches hallucinated package names before they execute. | <200ms |
| `POST /v1/verify` | Hallucination firewall. Returns `PASS`, `FLAG`, or `BLOCK` with a tamper-evident SHA-256 certificate. Checks: packages, URLs, citations (DOI/arXiv), numeric contradictions, NLI consistency. | <500ms |
| `POST /v1/distill` | Compresses a conversation context to a target token budget using TF-IDF importance scoring. Pluggable LLMLingua-2 endpoint via `LLMLINGUA_URL`. | <50ms |

## Contents

- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
  - [API — Railway (recommended)](#api--railway-recommended)
  - [API — Docker](#api--docker)
  - [Website — Cloudflare Pages](#website--cloudflare-pages)
  - [DNS configuration](#dns-configuration)
- [API reference](#api-reference)
- [Authentication & payments](#authentication--sol-payments)
- [MCP integration](#use-as-an-mcp-tool-claude--warp--cursor)
- [SDK](#use-the-sdk)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)

---

## Local development

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# Install pnpm if needed
npm install -g pnpm@9

# Install dependencies
pnpm install

# Copy environment variables template
cp .env.example .env
# Edit .env and fill in at minimum SOL_SERVICE_WALLET

# Run the API server (hot-reload)
pnpm dev
# → http://localhost:3000

# Run tests
pnpm test

# Run the MCP server (stdio)
pnpm dev:mcp

# Preview the website locally
pnpm --filter @agentoolbox/web dev
# → http://localhost:4321
```

---

## Environment variables

Copy `.env.example` to `.env` for local development. In production, set these in your hosting platform's dashboard.

### Required

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on. Default: `3000`. |
| `SOL_SERVICE_WALLET` | Your Solana wallet public key. Agents send SOL here to buy credits. Generate one with `solana-keygen new` or any Solana wallet. |

### Optional — Solana RPC

| Variable | Description | Default |
|---|---|---|
| `SOL_RPC_URL` | Solana RPC endpoint for on-chain payment verification. The public endpoint is heavily rate-limited in production; use [Helius](https://helius.dev) (free: 100k req/day) or [QuickNode](https://quicknode.com). | `https://api.mainnet-beta.solana.com` |

### Optional — Persistence

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Redis connection URL. When set, the credit ledger is persisted across restarts and shared across multiple API instances. When unset, an in-memory Map is used (state lost on restart). Format: `redis://user:password@host:6379`. | in-memory |

### Optional — NLI hallucination detection

| Variable | Description | Default |
|---|---|---|
| `VECTARA_API_KEY` | API key for the [Vectara HHEM v2](https://vectara.com) factual consistency API. Enables Layer 5 of the hallucination firewall (NLI scoring for natural language outputs against source context). Without this, the firewall runs deterministic checks only. Free tier available. | disabled |

### Optional — Context distiller

| Variable | Description | Default |
|---|---|---|
| `LLMLINGUA_URL` | URL of a [LLMLingua-2](https://github.com/microsoft/LLMLingua) compatible compression endpoint. When set, the `/v1/distill` endpoint delegates to this service instead of the built-in TF-IDF scorer. Example: `http://localhost:8000/compress`. | TF-IDF scorer |

### Full `.env` example

```bash
# Server
PORT=3000
NODE_ENV=production

# Solana payments (required for paid tier)
SOL_SERVICE_WALLET=YourSolanaWalletPublicKeyHere
SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# Persistence
REDIS_URL=redis://default:password@redis.railway.internal:6379

# NLI layer
VECTARA_API_KEY=your-vectara-api-key

# Advanced distiller
LLMLINGUA_URL=http://llmlingua-service:8000/compress
```

---

## Deployment

### API — Railway (recommended)

Railway handles the Node.js server and Redis with minimal configuration.

**1. Push the repo to GitHub**

```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/agentoolbox.git
git push -u origin main
```

**2. Create a Railway project**

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repository. Railway detects the `Dockerfile` automatically.
3. Click **Add Service** → **Database** → **Redis** to provision a Redis instance.
4. Railway auto-sets `REDIS_URL` in your API service's environment.

**3. Set environment variables**

In the Railway dashboard → your API service → Variables:

```
SOL_SERVICE_WALLET=<your Solana wallet pubkey>
SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<helius-key>
VECTARA_API_KEY=<optional>
NODE_ENV=production
```

**4. Set a custom domain**

Railway dashboard → your service → Settings → Custom Domain → `api.agent-toolbox.ai`

Railway gives you a CNAME target (e.g. `api-service-abc123.up.railway.app`). Add it to Cloudflare DNS (see [DNS configuration](#dns-configuration)).

**5. Verify**

```bash
curl https://api.agent-toolbox.ai/health
# {"status":"ok","timestamp":"..."}
```

---

### API — Docker

For any VPS, Fly.io, Render, or self-hosted setup.

```bash
# Build
docker build -t agent-toolbox-api .

# Run (minimal)
docker run -p 3000:3000 \
  -e SOL_SERVICE_WALLET=YourWalletPubkey \
  -e NODE_ENV=production \
  agent-toolbox-api

# Run (full — with Redis and Vectara)
docker run -p 3000:3000 \
  -e SOL_SERVICE_WALLET=YourWalletPubkey \
  -e SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY \
  -e REDIS_URL=redis://your-redis-host:6379 \
  -e VECTARA_API_KEY=your-key \
  -e NODE_ENV=production \
  agent-toolbox-api
```

**Health check:** `GET /health` — returns `{"status":"ok"}` when ready.

#### Fly.io

```bash
fly launch --name agent-toolbox-api --dockerfile Dockerfile
fly secrets set SOL_SERVICE_WALLET=YourWalletPubkey
fly secrets set SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
fly deploy
```

---

### Website — Cloudflare Pages

The marketing website (`packages/web`) is already deployed to Cloudflare Pages.

```bash
# Build
pnpm --filter @agentoolbox/web build
# Output: packages/web/dist/

# Deploy
wrangler pages deploy packages/web/dist --project-name agent-toolbox-ai
```

Cloudflare Pages build settings (set in the dashboard if using Git integration):

| Setting | Value |
|---|---|
| Build command | `pnpm --filter @agentoolbox/web build` |
| Build output directory | `packages/web/dist` |
| Root directory | `/` (repo root) |
| Node.js version | `20` |

---

### DNS configuration

All DNS is managed through Cloudflare (account: `dan@solhammer.com`).

| Record | Type | Target | Notes |
|---|---|---|---|
| `agent-toolbox.ai` | CNAME | `agent-toolbox-ai.pages.dev` | Cloudflare Pages — auto-configured when you add custom domain in Pages dashboard |
| `api.agent-toolbox.ai` | CNAME | `<railway-cname>.up.railway.app` | API server — proxied through Cloudflare |
| `www.agent-toolbox.ai` | CNAME | `agent-toolbox-ai.pages.dev` | Redirect to root |

**To add `agent-toolbox.ai` as a custom domain in Cloudflare Pages:**
1. Cloudflare dashboard → Pages → `agent-toolbox-ai` → Custom domains → Add `agent-toolbox.ai`
2. Cloudflare handles the DNS automatically since the domain is already in the same account.

---

## API reference

### Base URL

- Production: `https://api.agent-toolbox.ai`
- Local: `http://localhost:3000`

### Authentication

See [Authentication & SOL Payments](#authentication--sol-payments).

### `POST /v1/validate/imports`

Validates all imports in AI-generated code against live package registries.

**Request:**

```json
{
  "language": "python",
  "code": "import numpy\nfrom superlogger import magic_log\nimport pandas",
  "timeoutMs": 5000
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `language` | `python` \| `javascript` \| `typescript` \| `rust` \| `go` | Yes | Programming language of the code snippet |
| `code` | string | Yes | AI-generated code to validate (max 100KB) |
| `timeoutMs` | number | No | Per-registry timeout in ms. Default: `5000` |

**Response:**

```json
{
  "language": "python",
  "valid": [{ "name": "numpy", "status": "valid", "registry": "pypi", "registryUrl": "..." }],
  "hallucinated": [{ "name": "superlogger", "status": "hallucinated", "registry": "pypi" }],
  "unknown": [],
  "totalImports": 3,
  "hallucinationRate": 0.33,
  "latencyMs": 142
}
```

---

### `POST /v1/verify`

Runs the hallucination firewall on any LLM output.

**Request:**

```json
{
  "outputType": "code",
  "llmResponse": "import numpy\nfrom ghostpkg import magic",
  "language": "python",
  "enforcementMode": "block",
  "sourceTexts": ["..."],
  "timeoutMs": 5000
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `outputType` | `code` \| `natural_language` \| `agent_action` \| `factual_claim` | Yes | Type of LLM output being verified |
| `llmResponse` | string | Yes | The LLM output to verify (max 200KB) |
| `language` | string | No | Required when `outputType` is `code` |
| `enforcementMode` | `block` \| `flag` \| `audit` | No | `block` (default): return BLOCK verdict. `flag`: downgrade BLOCK to FLAG. `audit`: log only. |
| `sourceTexts` | string[] | No | Retrieved context docs for NLI grounding check (requires `VECTARA_API_KEY`) |
| `timeoutMs` | number | No | Per-check timeout in ms. Default: `5000` |

**Response:**

```json
{
  "verdict": "BLOCK",
  "overallScore": 0.0,
  "claims": [
    {
      "text": "from ghostpkg import magic",
      "verdict": "BLOCK",
      "confidence": 0.95,
      "checkType": "hallucinated_package",
      "evidence": "Package \"ghostpkg\" not found in pypi",
      "suggestedFix": "Remove or replace \"ghostpkg\" with a real package."
    }
  ],
  "outputType": "code",
  "enforcementMode": "block",
  "latencyMs": 187,
  "certificate": "sha256:3a7f4c...",
  "importValidation": {
    "valid": ["numpy"],
    "hallucinated": ["ghostpkg"],
    "unknown": [],
    "hallucinationRate": 0.5
  }
}
```

**Verdict meanings:**
- `PASS` — no issues detected, safe to use
- `FLAG` — potential issues, review before use
- `BLOCK` — confirmed hallucination or bad content, do not use

**Check types:**

| `checkType` | Triggered by | Verdict |
|---|---|---|
| `hallucinated_package` | Import not found in registry | BLOCK |
| `unknown_package` | Registry check failed (timeout etc.) | FLAG |
| `url_not_found` | URL returns 404/410 | BLOCK |
| `url_unreachable` | URL times out | FLAG |
| `malformed_doi` | DOI doesn't match `10.NNNN/suffix` | FLAG |
| `malformed_arxiv_id` | arXiv ID doesn't match known format | FLAG |
| `numeric_contradiction` | Percentage >100% or contradictory language | FLAG |
| `low_nli_consistency` | Vectara HHEM score <0.5 vs source docs | FLAG/BLOCK |

---

### `POST /v1/distill`

Compresses a conversation context to a token budget.

**Request:**

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "targetTokens": 4000,
  "preserveSystemPrompt": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `messages` | Message[] | Yes | Conversation history (max 500 messages) |
| `targetTokens` | number | No | Target token budget. Default: `4000`. Max: `200000`. |
| `preserveSystemPrompt` | boolean | No | Always keep the system message. Default: `true`. |

**Response:**

```json
{
  "messages": [...],
  "originalCount": 48,
  "distilledCount": 12,
  "estimatedTokens": 3842,
  "compressionRatio": 0.25,
  "method": "tfidf_importance_v2"
}
```

---

### `GET /health`

Returns `200 OK` when the server is healthy. Used as the Docker/Railway health check endpoint.

```json
{ "status": "ok", "timestamp": "2026-07-13T20:00:00.000Z" }
```

---

### `GET /stats`

Returns aggregate credit ledger statistics (for monitoring).

```json
{ "keys": 142, "totalCalls": 8841 }
```

---

### Example: validate AI-generated Python imports

```bash
curl -X POST http://localhost:3000/v1/validate/imports \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "import numpy\nfrom superlogger import magic_log\nimport pandas"
  }'
```

Response:
```json
{
  "language": "python",
  "valid": [{ "name": "numpy", "status": "valid", "registry": "pypi" }],
  "hallucinated": [{ "name": "superlogger", "status": "hallucinated", "evidence": "Not found on PyPI" }],
  "totalImports": 3,
  "hallucinationRate": 0.33,
  "latencyMs": 142
}
```

### Example: run the hallucination firewall

```bash
curl -X POST http://localhost:3000/v1/verify \
  -H "Content-Type: application/json" \
  -d '{
    "outputType": "code",
    "language": "python",
    "llmResponse": "import numpy\nfrom ghostpkg import magic",
    "enforcementMode": "block"
  }'
```

Response:
```json
{
  "verdict": "BLOCK",
  "overallScore": 0,
  "claims": [{
    "text": "from ghostpkg import magic",
    "verdict": "BLOCK",
    "confidence": 0.95,
    "checkType": "hallucinated_package",
    "evidence": "Package \"ghostpkg\" not found in pypi",
    "suggestedFix": "Remove or replace \"ghostpkg\" with a real package."
  }],
  "certificate": "sha256:3a7f..."
}
```

## Authentication & SOL Payments

### Free tier

10 calls per IP address, no authentication required. All endpoints are available.

```bash
curl -X POST https://api.agent-toolbox.ai/v1/validate/imports \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"import numpy"}'
```

### Paid tier

Pass a `Bearer` token in the `Authorization` header. There are two token types:

**1. Solana transaction signature (credit purchase)**

Send SOL to `SOL_SERVICE_WALLET`, then pass the transaction signature as your Bearer token on the first call. The API verifies the tx on-chain and credits your account.

```
Pricing:
  /v1/validate/imports  → 1 credit  (0.001 SOL)
  /v1/verify            → 2 credits (0.002 SOL)
  /v1/distill           → 1 credit  (0.001 SOL)
```

```bash
# After sending SOL to the service wallet:
curl -X POST https://api.agent-toolbox.ai/v1/verify \
  -H "Authorization: Bearer <your-solana-tx-signature>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

The signature is verified once on-chain, credits are added to your account, and subsequent calls deduct from the balance.

**2. API key (subsequent calls)**

After your first call with a tx signature, use the same tx signature as a persistent API key. Credits are tracked by key in the Redis ledger.

### Error responses

| Status | Error | Meaning |
|---|---|---|
| `402` | `free_tier_exhausted` | 10 free calls used. Send SOL to get credits. |
| `402` | `insufficient_credits` | Account has no credits remaining. |
| `401` | `invalid_token` | Empty or malformed Bearer token. |

---

## Use as an MCP tool (Claude / Warp / Cursor)

Build the MCP server first:

```bash
pnpm --filter @agentoolbox/mcp build
```

Add to your MCP config:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

**Cursor** (`~/.cursor/mcp.json`): same format as above.

**Warp**: Settings → MCP → Add server → paste the same JSON block.

Available MCP tools:

| Tool | Description |
|---|---|
| `validate_imports` | Check every package import in AI-generated code against live registries |
| `verify_output` | Run the full hallucination firewall on any LLM response |
| `distill_context` | Compress a bloated conversation history to a token budget |

## Use the SDK

```typescript
import { AgentoolboxClient } from "@agentoolbox/sdk";

const client = new AgentoolboxClient({
  baseUrl: "https://api.agent-toolbox.ai",
  apiKey: "your-sol-auth-token", // optional for free tier (10 calls)
});

// Validate imports before running AI-generated code
const { hallucinated } = await client.validateImports({
  language: "python",
  code: generatedCode,
});

if (hallucinated.length > 0) {
  throw new Error(`Hallucinated packages: ${hallucinated.map(p => p.name).join(", ")}`);
}

// Run the full firewall
const result = await client.verify({
  outputType: "code",
  language: "python",
  llmResponse: generatedCode,
});

if (result.verdict === "BLOCK") {
  console.error("Blocked:", result.claims);
}

// Compress a bloated context
const { messages } = await client.distill({
  messages: conversationHistory,
  targetTokens: 4000,
});
```


## Project structure

```
agentoolbox/
├── packages/
│   ├── api/          Hono REST API server (the backend)
│   ├── firewall/     Hallucination firewall engine
│   ├── mcp/          MCP server — validate_imports, verify_output, distill_context
│   ├── payments/     Solana on-chain payment verification
│   ├── sdk/          TypeScript client SDK
│   ├── validator/    Package/import validator core
│   └── web/          Astro + Tailwind landing page (agent-toolbox.ai)
├── Dockerfile        Docker image for the API server
├── railway.toml      Railway deployment config
├── wrangler.toml     Cloudflare Pages config (website)
├── .env.example      Environment variable template
└── pnpm-workspace.yaml
```

## Running tests

```bash
pnpm test
```

## Roadmap

- **v1** ✅ Package validator, deterministic firewall (packages/URLs/DOI/numeric), sliding-window distiller, MCP server, SOL payment middleware
- **v2** ✅ NLI layer (Vectara HHEM), TF-IDF importance distiller, on-chain SOL payment verification, Redis credit ledger
- **v3** Agent trajectory auditor, cross-agent hallucination attribution, public hallucination leaderboard, LLMLingua-2 managed service
