# agent-toolbox.ai

The quality layer for AI agents. Three API services that verify and improve LLM outputs before they cause damage — callable by any agent, paid autonomously in SOL.

**API:** `https://api.agent-toolbox.ai`  
**Website:** [agent-toolbox.ai](https://agent-toolbox.ai)  
**GitHub:** [solhammer/agentoolbox](https://github.com/solhammer/agentoolbox)

---

## What it does

| Service | Endpoint | What it catches |
|---|---|---|
| **Package Validator** | `POST /v1/validate/imports` | Hallucinated package names in AI-generated code — checked live against PyPI, npm, crates.io, and Go |
| **Hallucination Firewall** | `POST /v1/verify` | Bad packages, dead URLs, malformed citations (DOI/arXiv), numeric contradictions. Returns `PASS`, `FLAG`, or `BLOCK` with a SHA-256 certificate |
| **Context Distiller** | `POST /v1/distill` | Bloated agent context windows — compressed to a token budget using TF-IDF importance scoring |

---

## Quick start (30 seconds)

No signup. No API key. First 10 calls per IP are free.

### Validate AI-generated imports

```bash
curl -X POST https://api.agent-toolbox.ai/v1/validate/imports \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "import numpy\nfrom superlogger import magic_log\nimport pandas"
  }'
```

```json
{
  "valid": [{ "name": "numpy" }, { "name": "pandas" }],
  "hallucinated": [{ "name": "superlogger", "evidence": "Not found on PyPI" }],
  "hallucinationRate": 0.33,
  "latencyMs": 187
}
```

### Run the hallucination firewall

```bash
curl -X POST https://api.agent-toolbox.ai/v1/verify \
  -H "Content-Type: application/json" \
  -d '{
    "outputType": "code",
    "language": "python",
    "llmResponse": "import numpy\nfrom ghostpkg import magic",
    "enforcementMode": "block"
  }'
```

```json
{
  "verdict": "BLOCK",
  "overallScore": 0,
  "claims": [{
    "text": "from ghostpkg import magic",
    "verdict": "BLOCK",
    "confidence": 0.95,
    "checkType": "hallucinated_package",
    "suggestedFix": "Remove or replace \"ghostpkg\" with a real package."
  }],
  "certificate": "sha256:1cea7cf6..."
}
```

### Discover pricing programmatically

```bash
curl https://api.agent-toolbox.ai/v1/pricing
```

```json
{
  "wallet": "8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV",
  "endpoints": {
    "/v1/validate/imports": { "sol": 0.0001 },
    "/v1/verify":           { "sol": 0.0002 },
    "/v1/distill":          { "sol": 0.0001 }
  },
  "conversion": { "creditsPerSol": 10000 },
  "freeTier": { "calls": 10 }
}
```

---

## API reference

### `POST /v1/validate/imports`

Checks every import in AI-generated code against live package registries in parallel.

**Supported languages:** `python` · `javascript` · `typescript` · `rust` · `go`

**Request:**
```json
{
  "language": "python",
  "code": "import numpy\nfrom ghostpkg import magic",
  "timeoutMs": 5000
}
```

**Response:**
```json
{
  "language": "python",
  "valid":        [{ "name": "numpy", "status": "valid", "registry": "pypi" }],
  "hallucinated": [{ "name": "ghostpkg", "status": "hallucinated", "registry": "pypi" }],
  "unknown":      [],
  "totalImports": 2,
  "hallucinationRate": 0.5,
  "latencyMs": 142
}
```

---

### `POST /v1/verify`

Runs the full hallucination firewall. All check layers run in parallel.

**Request:**
```json
{
  "outputType": "code",
  "llmResponse": "...",
  "language": "python",
  "enforcementMode": "block",
  "sourceTexts": ["optional retrieved context for NLI grounding"],
  "timeoutMs": 5000
}
```

| Field | Values | Default |
|---|---|---|
| `outputType` | `code` `natural_language` `agent_action` `factual_claim` | required |
| `enforcementMode` | `block` `flag` `audit` | `block` |
| `language` | Required when `outputType` is `code` | — |
| `sourceTexts` | Docs to ground against (enables NLI layer) | — |

**Response:**
```json
{
  "verdict": "BLOCK",
  "overallScore": 0.0,
  "claims": [{
    "text": "from ghostpkg import magic",
    "verdict": "BLOCK",
    "confidence": 0.95,
    "checkType": "hallucinated_package",
    "evidence": "Package \"ghostpkg\" not found in pypi",
    "suggestedFix": "Remove or replace \"ghostpkg\" with a real package."
  }],
  "certificate": "sha256:...",
  "latencyMs": 187
}
```

**Verdict meanings:**
- `PASS` — no issues detected
- `FLAG` — potential issue, review before use
- `BLOCK` — confirmed problem, do not use

**Check types:**

| `checkType` | What it caught |
|---|---|
| `hallucinated_package` | Import not found in live registry |
| `url_not_found` | URL returns 404/410 |
| `url_unreachable` | URL request timed out |
| `malformed_doi` | DOI does not match `10.NNNN/suffix` format |
| `malformed_arxiv_id` | arXiv ID does not match `YYMM.NNNNN` or `cat/NNNNNNN` |
| `numeric_contradiction` | Percentage over 100% or contradictory increase/decrease language |
| `low_nli_consistency` | Vectara HHEM score below threshold vs. source context |

---

### `POST /v1/distill`

Compresses a conversation context to a target token budget. Keeps the system prompt, deduplicates consecutive messages, retains the most important content.

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

## Authentication & SOL payments

### Free tier

10 calls per IP address. No auth, no signup required.

### Paid tier — SOL micropayments

Agents pay autonomously on-chain. No subscription, no invoices, no human approval required.

**Pricing:**

| Endpoint | SOL per call | ~USD |
|---|---|---|
| `/v1/validate/imports` | 0.0001 SOL | ~$0.015 |
| `/v1/verify` | 0.0002 SOL | ~$0.030 |
| `/v1/distill` | 0.0001 SOL | ~$0.015 |

**1 SOL = 10,000 credits**

**Service wallet (Solana mainnet):**
```
8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV
```

### Payment flow

**1. Send SOL to the service wallet**

```bash
# Solana CLI
solana transfer 8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV 0.1 --allow-unfunded-recipient
# 0.1 SOL = 1,000 credits = 1,000 validation calls (or 500 firewall checks)
```

Any Solana wallet works — Phantom, Solflare, CLI, or programmatically via SDK.

**2. Use the transaction signature as your Bearer token on the first call**

```bash
TX_SIG="5abc...your-solana-transaction-signature"

curl -X POST https://api.agent-toolbox.ai/v1/validate/imports \
  -H "Authorization: Bearer $TX_SIG" \
  -H "Content-Type: application/json" \
  -d '{ "language": "python", "code": "import numpy" }'
```

The service verifies the transaction on-chain and credits your account instantly.

**3. Use the same signature as your API key on all subsequent calls**

Credits are deducted automatically. The tx signature acts as a persistent API key tied to your credit balance.

**4. Top up by sending more SOL**

Send another transaction to the service wallet and pass the new tx signature once to load more credits.

### Autonomous agent payment (TypeScript)

```typescript
import {
  Connection, Keypair, SystemProgram,
  Transaction, sendAndConfirmTransaction, PublicKey, LAMPORTS_PER_SOL
} from "@solana/web3.js";

const SERVICE_WALLET = new PublicKey("8qXedRydihKEETqU64UXtG2sYZaUhwR4HBFz4Suu27CV");

async function buyCredits(agentKeypair: Keypair, solAmount = 0.1): Promise<string> {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agentKeypair.publicKey,
      toPubkey: SERVICE_WALLET,
      lamports: solAmount * LAMPORTS_PER_SOL,
    })
  );
  return sendAndConfirmTransaction(connection, tx, [agentKeypair]);
}

// Agent self-onboards: discover pricing, pay, start calling
const pricing = await fetch("https://api.agent-toolbox.ai/v1/pricing").then(r => r.json());
const txSig = await buyCredits(myKeypair); // 0.1 SOL = 1,000 credits

const result = await fetch("https://api.agent-toolbox.ai/v1/verify", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${txSig}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    outputType: "code",
    language: "python",
    llmResponse: generatedCode,
  }),
}).then(r => r.json());

if (result.verdict === "BLOCK") {
  // Reject the LLM output and regenerate
}
```

### Error responses

| HTTP | `error` field | Meaning |
|---|---|---|
| `402` | `free_tier_exhausted` | 10 free calls used — send SOL to continue |
| `402` | `insufficient_credits` | Balance empty — send more SOL |
| `401` | `invalid_token` | Empty or malformed Bearer token |

---

## MCP integration

Add to your MCP config to give Claude, Warp, or Cursor three quality tools:

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

Build first:
```bash
git clone https://github.com/solhammer/agentoolbox
cd agentoolbox && pnpm install && pnpm --filter @agentoolbox/mcp build
```

**Warp:** Settings → MCP → Add server → paste the same JSON.  
**Cursor:** `~/.cursor/mcp.json` → same format.

**Tools exposed:**

| Tool | When to use |
|---|---|
| `validate_imports` | Before executing any AI-generated code |
| `verify_output` | Before accepting any LLM response in a critical step |
| `distill_context` | When your context window is getting expensive |

---

## TypeScript SDK

```bash
npm install @agentoolbox/sdk
# or: pnpm add @agentoolbox/sdk
```

```typescript
import { AgentoolboxClient } from "@agentoolbox/sdk";

const client = new AgentoolboxClient({
  baseUrl: "https://api.agent-toolbox.ai",
  apiKey: process.env.AGENTOOLBOX_API_KEY, // your tx signature — omit for free tier
});

// 1. Validate imports before running generated code
const { hallucinated } = await client.validateImports({
  language: "python",
  code: generatedCode,
});
if (hallucinated.length > 0) {
  throw new Error(`Hallucinated: ${hallucinated.map(p => p.name).join(", ")}`);
}

// 2. Verify any LLM output
const result = await client.verify({
  outputType: "natural_language",
  llmResponse: llmOutput,
  enforcementMode: "block",
});
if (result.verdict === "BLOCK") {
  console.error("Blocked:", result.claims.map(c => c.evidence));
}

// 3. Compress context before a long LLM call
const { messages, compressionRatio } = await client.distill({
  messages: conversationHistory,
  targetTokens: 4000,
});
console.log(`Context compressed ${(1 - compressionRatio) * 100}%`);
```

---

## Self-hosting

The full stack is open source under MIT.

```bash
git clone https://github.com/solhammer/agentoolbox
cd agentoolbox
cp .env.example .env
pnpm install
pnpm dev   # → http://localhost:3000
```

**Required env vars:**

| Variable | Description |
|---|---|
| `SOL_SERVICE_WALLET` | Your Solana wallet public key — agents send SOL here |
| `ADMIN_API_KEY` | Secret key for the `/admin/*` monitoring routes |

**Optional:**

| Variable | Enables |
|---|---|
| `REDIS_URL` | Persistent credit ledger (otherwise in-memory) |
| `VECTARA_API_KEY` | NLI hallucination layer (HHEM v2) |
| `SOL_RPC_URL` | Custom Solana RPC (default: public mainnet) |
| `LLMLINGUA_URL` | LLMLingua-2 compression service |

See the [deployment guide](https://github.com/solhammer/agentoolbox#deployment) for Railway, Docker, and Cloudflare Pages instructions.
