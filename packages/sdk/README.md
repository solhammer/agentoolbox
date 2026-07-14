# agent-toolbox-sdk

TypeScript SDK for [agent-toolbox.ai](https://agent-toolbox.ai) — the quality layer for AI agents.

Seven services callable by any agent. Pay per call in SOL. Free tier: 10 calls/IP.

## Install

```bash
npm install agent-toolbox-sdk
# or: pnpm add agent-toolbox-sdk
```

## Quick start

```typescript
import { AgentoolboxClient } from "agent-toolbox-sdk";

const client = new AgentoolboxClient({
  baseUrl: "https://api.agent-toolbox.ai",
  // apiKey: "your-solana-tx-signature"  // omit for free tier
});

// Validate imports in AI-generated code
const { hallucinated } = await client.validateImports({
  language: "python",
  code: "import numpy\nfrom superlogger import magic_log",
});
// hallucinated → [{ name: "superlogger", status: "hallucinated" }]

// Full hallucination firewall
const result = await client.verify({
  outputType: "code",
  language: "python",
  llmResponse: generatedCode,
  enforcementMode: "block",
});
// result.verdict → "BLOCK" | "FLAG" | "PASS"
// result.certificate → "sha256:..."
```

## Services

| Method | Endpoint | What it does |
|---|---|---|
| `validateImports()` | `POST /v1/validate/imports` | Catches hallucinated package names against PyPI/npm/crates.io/Go |
| `verify()` | `POST /v1/verify` | PASS/FLAG/BLOCK firewall — packages, URLs, citations, contradictions |
| `distill()` | `POST /v1/distill` | Compresses conversation context to a token budget |
| `scanSecrets()` | `POST /v1/scan/secrets` | Detects hardcoded credentials in code (10 patterns, redacted) |
| `scanInjection()` | `POST /v1/scan/injection` | Detects prompt injection in user input |
| `countTokens()` | `POST /v1/tokens/count` | BPE token counting + cost estimation for GPT-4/Claude/Gemini |
| `scanVulnerabilities()` | `POST /v1/scan/vulnerabilities` | Checks packages against OSV/CVE database |

## Authentication

**Free tier:** 10 calls/IP, no auth needed.

**Paid tier (SOL micropayments):**
1. Send SOL to the service wallet (see `GET /v1/pricing` for the address)
2. Use the transaction signature as your API key

```typescript
// Discover pricing + wallet first
const pricing = await fetch("https://api.agent-toolbox.ai/v1/pricing").then(r => r.json());

// After sending SOL to pricing.wallet:
const client = new AgentoolboxClient({
  baseUrl: "https://api.agent-toolbox.ai",
  apiKey: "<your-solana-transaction-signature>",
});
```

**1 SOL = 10,000 credits · 0.0001 SOL per call**

## Full example

```typescript
import { AgentoolboxClient } from "agent-toolbox-sdk";

const client = new AgentoolboxClient({ baseUrl: "https://api.agent-toolbox.ai" });
const code = `import requests\nfrom ghostpkg import magic\nAPI_KEY="sk-abc123..."`;

// Step 1: scan for secrets
const { safe, findings } = await client.scanSecrets({ code }) as any;
if (!safe) throw new Error(`Secrets: ${findings.map((f: any) => f.type).join(", ")}`);

// Step 2: validate imports
const { hallucinated } = await client.validateImports({ language: "python", code });
if (hallucinated.length > 0) throw new Error(`Hallucinated: ${hallucinated.map(p => p.name)}`);

// Step 3: full firewall
const result = await client.verify({ outputType: "code", language: "python", llmResponse: code });
if (result.verdict === "BLOCK") throw new Error("Blocked: " + result.claims[0]?.evidence);
```

## Links

- **API:** [api.agent-toolbox.ai](https://api.agent-toolbox.ai)
- **Docs:** [github.com/solhammer/agentoolbox](https://github.com/solhammer/agentoolbox)
- **Website:** [agent-toolbox.ai](https://agent-toolbox.ai)
- **Issues:** [github.com/solhammer/agentoolbox/issues](https://github.com/solhammer/agentoolbox/issues)

## License

MIT
