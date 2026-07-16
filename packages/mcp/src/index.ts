#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateImports } from "@agentoolbox/validator";
import { runFirewall } from "@agentoolbox/firewall";
import { scanPii, type PiiPolicy } from "@agentoolbox/privacy";
import { screenSanctions, type SanctionsInput } from "@agentoolbox/compliance";
import { rxCheck, type RxCheckInput } from "@agentoolbox/health";
import { checkToolArgs } from "@agentoolbox/agent";
import { checkInfraPlan } from "@agentoolbox/infra";
import { checkCitation, computeDeadline } from "@agentoolbox/legal";
import { validateIdentifier } from "@agentoolbox/identity";
import { validateSchema } from "@agentoolbox/schema";
import { scanSql } from "@agentoolbox/sqlguard";
import { scanCommand } from "@agentoolbox/cmdguard";
import { scanUrl } from "@agentoolbox/netguard";
import {
  scanSecrets,
  detectPromptInjection,
  scanVulnerabilities,
  countTokens,
  countMessageTokens,
  distillContext,
  type ModelFamily,
} from "@agentoolbox/core";
import {
  checkDecimals,
  checkPrice,
  resolveSymbol,
  checkRug,
  checkLiquidity,
  checkOrder,
  checkPosition,
  type Chain,
  type TradeProposal,
  type PortfolioSnapshot,
  type GuardianRules,
} from "@agentoolbox/finance";

const server = new Server(
  { name: "agent-toolbox", version: "0.1.0", description: "AI agent quality tools from agent-toolbox.ai" },
  { capabilities: { tools: {} } }
);

const LANGUAGE_ENUM = ["python", "javascript", "typescript", "rust", "go"];
const CHAIN_ENUM = ["solana", "ethereum", "bsc", "polygon", "base", "arbitrum"];
const MODEL_ENUM = ["gpt-4", "gpt-3.5", "claude", "gemini", "generic"];

/** Wrap a JSON-serialisable result as an MCP text content response. */
function json(result: unknown, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── Core quality ──────────────────────────────────────────────────────────
    {
      name: "validate_imports",
      description:
        "Validates all imports/packages in AI-generated code against live registries (PyPI, npm, crates.io, Go). Returns lists of valid, hallucinated, and unknown packages. Use this before executing any AI-generated code to catch hallucinated package names ('slopsquatting').",
      inputSchema: {
        type: "object",
        properties: {
          language: { type: "string", enum: LANGUAGE_ENUM, description: "The programming language of the code snippet." },
          code: { type: "string", description: "The AI-generated code to validate." },
          timeoutMs: { type: "number", description: "Registry request timeout in ms (default: 5000)." },
        },
        required: ["language", "code"],
      },
    },
    {
      name: "verify_output",
      description:
        "Runs the hallucination firewall on an LLM output. Checks for hallucinated packages (code), invalid URLs, malformed citations (DOI/arXiv), and numeric contradictions. Returns PASS, FLAG, or BLOCK verdict with a tamper-evident certificate. Use this before accepting any LLM response in a critical pipeline.",
      inputSchema: {
        type: "object",
        properties: {
          outputType: { type: "string", enum: ["code", "natural_language", "agent_action", "factual_claim"], description: "The type of LLM output being verified." },
          llmResponse: { type: "string", description: "The LLM output to verify." },
          language: { type: "string", enum: LANGUAGE_ENUM, description: "Required when outputType is 'code'." },
          enforcementMode: { type: "string", enum: ["block", "flag", "audit"], description: "'block' returns BLOCK verdict on failures (default). 'flag' downgrades BLOCK to FLAG. 'audit' logs only." },
          timeoutMs: { type: "number", description: "Per-check timeout in ms (default: 5000)." },
        },
        required: ["outputType", "llmResponse"],
      },
    },
    {
      name: "distill_context",
      description:
        "Compresses a conversation context to fit within a target token budget using TF-IDF importance scoring. Use this when your context window is getting large to reduce token costs while preserving the most important content. Keeps system prompts and the most recent messages.",
      inputSchema: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            description: "The conversation messages to distill.",
            items: {
              type: "object",
              properties: { role: { type: "string" }, content: { type: "string" } },
              required: ["role", "content"],
            },
          },
          targetTokens: { type: "number", description: "Desired output token budget (default: 4000)." },
          preserveSystemPrompt: { type: "boolean", description: "Always keep the system prompt (default: true)." },
        },
        required: ["messages"],
      },
    },
    // ── Security ──────────────────────────────────────────────────────────────
    {
      name: "scan_secrets",
      description:
        "Detects hardcoded secrets and credentials (AWS/GitHub/OpenAI/Anthropic keys, private keys, DB connection strings, passwords) in code before it is committed or executed. Matches are redacted — the raw secret is never returned. Returns findings with type, severity, and line number.",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "The code to scan for secrets." },
          filename: { type: "string", description: "Optional filename, echoed back." },
        },
        required: ["code"],
      },
    },
    {
      name: "scan_injection",
      description:
        "Detects prompt-injection attacks (instruction overrides, role hijacking, jailbreaks, data exfiltration, encoding tricks) in user-supplied input. Call this before passing any untrusted input to an LLM. Returns a risk band (safe/suspicious/injection), a score, and matched patterns.",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string", description: "The user input to screen." },
          context: { type: "string", description: "Optional context label, echoed back." },
        },
        required: ["input"],
      },
    },
    {
      name: "count_tokens",
      description:
        "Approximate token count and cost estimate for a string or a chat-formatted messages array. Use before an LLM call to budget cost and check context-window fit. Supports gpt-4, gpt-3.5, claude, gemini, and generic.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to count (provide this or messages)." },
          messages: {
            type: "array",
            description: "Chat messages to count (provide this or text).",
            items: {
              type: "object",
              properties: { role: { type: "string" }, content: { type: "string" } },
              required: ["role", "content"],
            },
          },
          model: { type: "string", enum: MODEL_ENUM, description: "Model family for cost/context (default: generic)." },
        },
      },
    },
    {
      name: "scan_vulnerabilities",
      description:
        "Checks package names against the OSV (Open Source Vulnerabilities) database and returns CVEs/GHSAs affecting them. Use after validating imports to catch known-vulnerable dependencies before installing.",
      inputSchema: {
        type: "object",
        properties: {
          packages: { type: "array", items: { type: "string" }, description: "Package names to check." },
          language: { type: "string", enum: LANGUAGE_ENUM, description: "Language → ecosystem (python→PyPI, js/ts→npm, rust→crates.io, go→Go)." },
          timeoutMs: { type: "number", description: "OSV request timeout in ms (default: 8000)." },
        },
        required: ["packages", "language"],
      },
    },
    {
      name: "scan_pii",
      description:
        "Detects and redacts PII/PHI/PCI (SSNs, credit cards, IBANs, UK NHS numbers, emails, phone numbers, IPs) in text before it is logged, sent to a third party, or persisted. Uses deterministic checksum validation (Luhn, ISO-7064, mod-11). Returns PASS/FLAG/BLOCK, a redacted copy of the text, and a signed certificate. Call this before any egress of user or record data.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text to scan for personal data." },
          filename: { type: "string", description: "Optional source identifier, echoed back." },
          policy: {
            type: "object",
            description: "Optional enforcement policy.",
            properties: {
              mode: { type: "string", enum: ["block", "flag", "audit"], description: "'block' returns the raw verdict (default). 'flag' downgrades BLOCK to FLAG. 'audit' never blocks (log-only)." },
              blockSeverityAtOrAbove: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Minimum severity that yields BLOCK (default: high)." },
              allowTypes: { type: "array", items: { type: "string" }, description: "Detector types to ignore (e.g. ['ip_address'])." },
              jurisdictions: { type: "array", items: { type: "string" }, description: "Restrict jurisdiction-specific detectors (e.g. ['US','UK','CA'])." },
              redact: { type: "boolean", description: "Return a redacted copy of the text (default: true)." },
            },
          },
        },
        required: ["text"],
      },
    },
    // ── Finance protection ──────────────────────────────────────────────────────
    {
      name: "finance_units",
      description:
        "Validates that a raw on-chain token amount matches the intended human (UI) amount given the token's authoritative decimals. Catches the catastrophic decimal-scaling error (e.g. sending 1000x too many tokens). Call before building any transfer transaction.",
      inputSchema: {
        type: "object",
        properties: {
          tokenAddress: { type: "string", description: "Mint (Solana) or contract (EVM) address." },
          rawAmount: { type: "string", description: "The integer amount as it will appear on-chain." },
          uiAmount: { type: "number", description: "The human-readable amount intended." },
          chain: { type: "string", enum: CHAIN_ENUM, description: "Chain the token lives on." },
          timeoutMs: { type: "number", description: "Lookup timeout in ms (default: 5000)." },
        },
        required: ["tokenAddress", "rawAmount", "uiAmount", "chain"],
      },
    },
    {
      name: "finance_price",
      description:
        "Cross-validates an asset price against two independent live sources (CoinGecko + DexScreener for crypto, yahoo-finance2 for stocks). Blocks stale or divergent data and flags a proposed price that deviates from consensus. Provide symbol or tokenAddress.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Asset symbol / CoinGecko id (e.g. 'solana', 'AAPL')." },
          tokenAddress: { type: "string", description: "Token address (crypto)." },
          assetType: { type: "string", enum: ["crypto", "stock", "forex"], description: "Asset type." },
          proposedPrice: { type: "number", description: "Optional price to validate against consensus." },
          maxAgeSeconds: { type: "number", description: "Max acceptable data age (default: 60 crypto / 3600 stock)." },
          divergenceThresholdPct: { type: "number", description: "Max allowed divergence between sources (default: 2)." },
        },
        required: ["assetType"],
      },
    },
    {
      name: "finance_symbol",
      description:
        "Resolves a ticker symbol or token to a confirmed identity and flags ambiguity. For crypto, prefer resolving by address — symbols collide (USDC has 200+ imposters on Solana). Returns matches ranked by liquidity plus a verdict.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Symbol / ticker to resolve." },
          assetType: { type: "string", enum: ["crypto", "stock"], description: "Asset type." },
          expectedName: { type: "string", description: "Optional expected name to confirm identity." },
          chain: { type: "string", description: "Optional chain filter for crypto." },
        },
        required: ["symbol", "assetType"],
      },
    },
    {
      name: "finance_token_risk",
      description:
        "Rug-pull scanner for Solana tokens: RugCheck.xyz score plus on-chain mint/freeze authority verification. Blocks tokens with active mint authority, unlocked LP, or a risk score above threshold.",
      inputSchema: {
        type: "object",
        properties: {
          address: { type: "string", description: "Token mint address." },
          chain: { type: "string", enum: CHAIN_ENUM, description: "Chain (Solana supported for full checks)." },
          maxRugScore: { type: "number", description: "Block above this score, 0–100 (default: 60)." },
          requireLpLocked: { type: "boolean", description: "Block if LP not locked (default: true)." },
          blockIfMintAuthority: { type: "boolean", description: "Block if mint authority active (default: true)." },
          blockIfFreezeAuthority: { type: "boolean", description: "Block if freeze authority active (default: true)." },
        },
        required: ["address", "chain"],
      },
    },
    {
      name: "finance_slippage",
      description:
        "Estimates price impact for a trade using DexScreener pool liquidity (constant-product AMM approximation). Prevents draining a thin pool. Flags implausible volume/liquidity ratios (wash trading).",
      inputSchema: {
        type: "object",
        properties: {
          tokenAddress: { type: "string", description: "Token address." },
          chain: { type: "string", description: "Chain the pool lives on." },
          tradeUsd: { type: "number", description: "Trade size in USD." },
          maxPriceImpactPct: { type: "number", description: "Max acceptable price impact % (default: 2)." },
          minLiquidityUsd: { type: "number", description: "Minimum acceptable pool liquidity in USD." },
        },
        required: ["tokenAddress", "chain", "tradeUsd"],
      },
    },
    {
      name: "finance_order_risk",
      description:
        "Full pre-trade gate. Runs token risk, slippage, price validation, and position limits in parallel and returns a composite PASS/FLAG/BLOCK with the check that blocked it. One call replaces the individual finance checks.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Asset symbol (stocks or crypto)." },
          tokenAddress: { type: "string", description: "Token address (enables rug + slippage checks)." },
          assetType: { type: "string", enum: ["crypto", "stock"], description: "Asset type." },
          side: { type: "string", enum: ["buy", "sell"], description: "Trade side." },
          tradeUsd: { type: "number", description: "Trade size in USD." },
          portfolioValueUsd: { type: "number", description: "Portfolio value (enables position-limit check)." },
          chain: { type: "string", description: "Chain for crypto (default: solana)." },
          leverage: { type: "number", description: "Leverage multiplier (default: 1)." },
        },
        required: ["assetType", "side", "tradeUsd"],
      },
    },
    {
      name: "finance_position_check",
      description:
        "Deterministic position-limit and kill-switch gate — no external calls, pure arithmetic. Enforces max position size %, daily-loss limits, leverage caps, open-position count, and an asset allowlist. The final non-overridable gate before executing a trade.",
      inputSchema: {
        type: "object",
        properties: {
          trade: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              side: { type: "string", enum: ["buy", "sell", "long", "short"] },
              tradeUsd: { type: "number" },
              leverage: { type: "number" },
              assetType: { type: "string", enum: ["crypto", "stock", "forex"] },
            },
            required: ["symbol", "side", "tradeUsd", "assetType"],
          },
          portfolio: {
            type: "object",
            properties: {
              totalValueUsd: { type: "number" },
              cashUsd: { type: "number" },
              dailyPnlUsd: { type: "number" },
              openPositions: { type: "number" },
              assetAllocation: { type: "object" },
            },
            required: ["totalValueUsd", "cashUsd"],
          },
          rules: {
            type: "object",
            properties: {
              maxPositionPct: { type: "number" },
              maxDailyLossPct: { type: "number" },
              maxOpenPositions: { type: "number" },
              maxLeverage: { type: "number" },
              allowedAssets: { type: "array", items: { type: "string" } },
              killSwitch: { type: "boolean" },
              maxSingleTradeUsd: { type: "number" },
            },
          },
        },
        required: ["trade", "portfolio"],
      },
    },
    // ── Compliance ──────────────────────────────────────────────────────────────
    {
      name: "screen_sanctions",
      description:
        "Screens one or more party names (people, companies, vessels) against bundled OFAC sanctions lists (SDN + Consolidated) using deterministic exact, alias, and fuzzy matching. Returns PASS/FLAG/BLOCK with matched records and a signed certificate. Call before onboarding, paying, shipping to, or contracting with any counterparty.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "A single party name to screen." },
          names: { type: "array", items: { type: "string" }, description: "Multiple names to screen in one call." },
          minScore: { type: "number", description: "Fuzzy reporting floor 0..1 (default 0.85)." },
          lists: { type: "array", items: { type: "string" }, description: "Restrict to source lists (e.g. ['OFAC-SDN'])." },
          entityTypes: { type: "array", items: { type: "string", enum: ["individual", "entity", "vessel", "aircraft", "unknown"] }, description: "Restrict to these entity types." },
          fuzzy: { type: "boolean", description: "Enable fuzzy matching (default true)." },
        },
      },
    },
    // ── Health ──────────────────────────────────────────────────────────────────
    {
      name: "rx_check",
      description:
        "Medication safety gate: deterministic unit-confusion, overdose, and drug-drug interaction checks for a list of medications. Returns PASS/FLAG/BLOCK findings with a signed certificate. Informational only — not medical advice. Call before an agent finalizes any medication list, prescription, or dosing instruction.",
      inputSchema: {
        type: "object",
        properties: {
          medications: {
            type: "array",
            description: "Medications to evaluate.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Drug name (generic or brand)." },
                dose: { type: "number", description: "Dose per administration." },
                unit: { type: "string", description: "Dose unit (e.g. 'mg', 'mcg', 'ml')." },
                route: { type: "string", description: "Route of administration (informational)." },
                frequencyPerDay: { type: "number", description: "Administrations per day." },
              },
              required: ["name"],
            },
          },
          patient: {
            type: "object",
            properties: {
              weightKg: { type: "number", description: "Patient weight in kg (weight-based dosing)." },
              ageYears: { type: "number", description: "Patient age in years." },
            },
          },
          policy: {
            type: "object",
            properties: {
              blockSeverityAtOrAbove: { type: "string", enum: ["moderate", "major", "contraindicated"], description: "Minimum severity that yields BLOCK (default: major)." },
            },
          },
        },
        required: ["medications"],
      },
    },
    // ── Agent (tool-args) ─────────────────────────────────────────────────
    {
      name: "check_tool_args",
      description:
        "Validates a proposed tool/function call's arguments against a caller-supplied schema and policy: types, required fields, enums, numeric ranges, string length/pattern, null-safety, unknown args, unit-coercion (dollars-vs-cents), and cross-field rules. Deterministic and offline. Returns PASS/FLAG/BLOCK with violations. Call before executing a tool call involving money, quantities, or destructive effects.",
      inputSchema: {
        type: "object",
        properties: {
          tool: { type: "string", description: "Optional name of the tool being called." },
          args: { type: "object", description: "The proposed argument map to validate." },
          schema: {
            type: "object",
            description: "Validation schema.",
            properties: {
              fields: { type: "object", description: "Map of fieldName -> FieldSpec { type, required, nullable, enum, min, max, minLength, maxLength, pattern, unit }." },
              allowUnknown: { type: "boolean", description: "Allow args not declared in fields (default false)." },
              rules: { type: "array", description: "Cross-field rules { op, left, right, message }.", items: { type: "object" } },
            },
            required: ["fields"],
          },
          policy: {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["block", "flag", "audit"] },
              blockSeverityAtOrAbove: { type: "string", enum: ["low", "medium", "high", "critical"] },
            },
          },
        },
        required: ["args", "schema"],
      },
    },
    // ── Infra (IaC risk) ───────────────────────────────────────────────
    {
      name: "check_infra_plan",
      description:
        "Static blast-radius / risk analysis of infrastructure-as-code against a bundled CIS/OPA-style ruleset. Accepts a Terraform plan JSON (terraform show -json), an AWS IAM policy JSON, or a Kubernetes manifest JSON. Flags public exposure, IAM wildcards, destroy/replace of stateful resources, privileged pods, and more. Deterministic and offline (no cloud credentials). Returns PASS/FLAG/BLOCK with findings.",
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["terraform", "iam", "k8s"], description: "Document format." },
          document: { type: "object", description: "The already-parsed JSON document to analyze." },
          policy: {
            type: "object",
            properties: {
              blockSeverityAtOrAbove: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Minimum severity that yields BLOCK (default: high)." },
            },
          },
        },
        required: ["format", "document"],
      },
    },
    // ── Legal ────────────────────────────────────────────────────────
    {
      name: "check_citation",
      description:
        "Validates US case-law citations (volume / reporter / page / year) against a bundled table of reporter abbreviations, flags malformed or implausible citations, and — when source text is supplied — checks quote fidelity to catch fabricated quotes. Deterministic and offline. Returns PASS/FLAG/BLOCK. Call before an agent presents a legal citation or quotation.",
      inputSchema: {
        type: "object",
        properties: {
          citation: { type: "string", description: "A single citation string, e.g. '347 U.S. 483 (1954)'." },
          citations: { type: "array", items: { type: "string" }, description: "Multiple citations to validate." },
          sourceText: { type: "string", description: "Optional source text to check a quote against." },
          quote: { type: "string", description: "Optional quote to locate within sourceText." },
        },
      },
    },
    {
      name: "compute_deadline",
      description:
        "Computes a legal deadline by counting court days (skipping weekends and US federal holidays) or calendar days from a start date, forwards or backwards. Deterministic and offline. Returns the resolved date and what was skipped. Use for filing deadlines and statute-of-limitations math.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date, ISO 8601 (YYYY-MM-DD)." },
          days: { type: "number", description: "Number of days to count (>= 0)." },
          mode: { type: "string", enum: ["court", "calendar"], description: "court skips weekends+holidays; calendar counts all days (default calendar)." },
          direction: { type: "string", enum: ["after", "before"], description: "Count forward or backward (default after)." },
          jurisdiction: { type: "string", description: "Reserved; the US federal calendar is used." },
        },
        required: ["start", "days"],
      },
    },
    // ── Wave 3: deterministic validators ────────────────────────────────────
    {
      name: "validate_identifier",
      description:
        "Validates structured identifiers (IBAN, ABA routing, SWIFT/BIC, credit card, EIN, EU VAT, VIN, NPI, US SSN, Ethereum/Solana address) via deterministic checksums and format rules. Auto-detects the type when not given. Card and SSN values are masked. Returns PASS/FLAG/BLOCK. Call before an agent stores, pays to, or transacts against an identifier.",
      inputSchema: {
        type: "object",
        properties: {
          value: { type: "string", description: "A single identifier to validate." },
          values: { type: "array", items: { type: "string" }, description: "Multiple identifiers to validate." },
          type: { type: "string", enum: ["iban", "aba_routing", "swift_bic", "credit_card", "ein", "vat_eu", "vin", "npi", "ssn", "eth_address", "sol_address"], description: "Identifier type; omit to auto-detect." },
          types: { type: "array", items: { type: "string", enum: ["iban", "aba_routing", "swift_bic", "credit_card", "ein", "vat_eu", "vin", "npi", "ssn", "eth_address", "sol_address"] }, description: "Restrict auto-detection to these types." },
        },
      },
    },
    {
      name: "validate_schema",
      description:
        "Validates a JSON value against a caller-supplied JSON Schema (Draft-07 subset), deterministically and offline. Use to gate an LLM's or a tool's structured output before acting on it. Returns PASS/FLAG/BLOCK with per-error JSON paths.",
      inputSchema: {
        type: "object",
        properties: {
          data: { description: "The JSON value to validate (any type)." },
          schema: { type: "object", description: "JSON Schema (Draft-07 subset) to validate against." },
          policy: { type: "object", properties: { mode: { type: "string", enum: ["block", "flag", "audit"] } } },
        },
        required: ["schema"],
      },
    },
    {
      name: "scan_sql",
      description:
        "Scans SQL for dangerous patterns before execution — DELETE/UPDATE without WHERE, DROP/TRUNCATE, tautologies (WHERE 1=1), stacked statements, UNION-based injection, and privilege changes. Comment- and string-literal-aware; no database connection. Returns PASS/FLAG/BLOCK with findings.",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "The SQL to scan." },
          dialect: { type: "string", enum: ["postgres", "mysql", "sqlite", "tsql", "generic"], description: "SQL dialect (default generic)." },
          policy: {
            type: "object",
            properties: {
              allowDdl: { type: "boolean" },
              allowUnboundedWrites: { type: "boolean" },
              maxStatements: { type: "number" },
              blockSeverityAtOrAbove: { type: "string", enum: ["low", "medium", "high", "critical"] },
            },
          },
        },
        required: ["sql"],
      },
    },
    // ── Wave 4: execution & egress gates ─────────────────────────────────────
    {
      name: "scan_command",
      description:
        "Scans a shell command for dangerous / destructive patterns before execution — rm -rf /, curl|sh remote-exec, dd/mkfs raw disk writes, fork bombs, chmod 777, privilege escalation, force-push to protected branches, kubectl/docker destroys, firewall/security disables, and data exfiltration. Quote- and substitution-aware (content inside quotes never triggers). Deterministic and offline — never executes the command. Returns PASS/FLAG/BLOCK with findings. Call before an agent runs any shell command.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command line to scan." },
          shell: { type: "string", enum: ["bash", "sh", "zsh", "powershell", "generic"], description: "Target shell (default generic)." },
          policy: {
            type: "object",
            properties: {
              blockSeverityAtOrAbove: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Minimum severity that yields BLOCK (default: high)." },
              allow: { type: "array", items: { type: "string" }, description: "Rule IDs to suppress (e.g. ['CMD-PRIVILEGE-ESCALATION'])." },
              protectedRefs: { type: "array", items: { type: "string" }, description: "Git refs treated as protected (default ['main','master'])." },
              maxSegments: { type: "number", description: "Max pipeline segments before CMD-TOO-MANY-SEGMENTS (default 50)." },
            },
          },
        },
        required: ["command"],
      },
    },
    {
      name: "scan_url",
      description:
        "Scans a URL / host for SSRF and egress-policy violations before an outbound request or browser navigation — cloud instance-metadata endpoints (169.254.169.254), private/loopback/link-local targets, decimal/octal/hex IP obfuscation, denied schemes (file:, gopher:), credentials-in-URL, punycode/homograph hosts, and allow/deny-list + port policy. Deterministic and offline by default; optional DNS resolution detects DNS-rebinding when resolve=true. Returns PASS/FLAG/BLOCK with findings. Call before an agent fetches a URL.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to scan." },
          policy: {
            type: "object",
            properties: {
              allowSchemes: { type: "array", items: { type: "string" }, description: "Allowed URL schemes (default ['http','https'])." },
              allowHosts: { type: "array", items: { type: "string" }, description: "If set, host must be in this allowlist." },
              denyHosts: { type: "array", items: { type: "string" }, description: "Hosts that are always blocked." },
              denyPrivate: { type: "boolean", description: "Block RFC-1918 private targets (default true)." },
              allowedPorts: { type: "array", items: { type: "number" }, description: "If set, only these explicit ports are allowed." },
              resolve: { type: "boolean", description: "Resolve DNS and flag rebinding to private/metadata IPs (default false; the only networked option)." },
              blockSeverityAtOrAbove: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Minimum severity that yields BLOCK (default: high)." },
            },
          },
        },
        required: ["url"],
      },
    },
  ],
}));

// ── Tool call handler ─────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "validate_imports": {
        const { language, code, timeoutMs } = args as {
          language: "python" | "javascript" | "typescript" | "rust" | "go";
          code: string;
          timeoutMs?: number;
        };
        const result = await validateImports({
          language,
          code,
          ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        });
        return json(result);
      }

      case "verify_output": {
        const { outputType, llmResponse, language, enforcementMode, timeoutMs } =
          args as {
            outputType: "code" | "natural_language" | "agent_action" | "factual_claim";
            llmResponse: string;
            language?: "python" | "javascript" | "typescript" | "rust" | "go";
            enforcementMode?: "block" | "flag" | "audit";
            timeoutMs?: number;
          };
        const result = await runFirewall({
          outputType,
          llmResponse,
          ...(language !== undefined ? { language } : {}),
          ...(enforcementMode !== undefined ? { enforcementMode } : {}),
          ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "distill_context": {
        const { messages, targetTokens = 4000, preserveSystemPrompt = true } =
          args as {
            messages: Array<{ role: string; content: string }>;
            targetTokens?: number;
            preserveSystemPrompt?: boolean;
          };
        const result = await distillContext({ messages, targetTokens, preserveSystemPrompt });
        return json(result);
      }

      case "scan_secrets": {
        const { code } = args as { code: string; filename?: string };
        const findings = scanSecrets(code);
        const result = {
          findings,
          totalFindings: findings.length,
          critical: findings.filter((f) => f.severity === "critical").length,
          high: findings.filter((f) => f.severity === "high").length,
          safe: findings.length === 0,
          ...(typeof (args as { filename?: string }).filename === "string"
            ? { filename: (args as { filename?: string }).filename }
            : {}),
        };
        return json(result, !result.safe);
      }

      case "scan_injection": {
        const { input, context } = args as { input: string; context?: string };
        const result = detectPromptInjection(input);
        return json(
          { ...result, ...(context !== undefined ? { context } : {}) },
          result.risk === "injection"
        );
      }

      case "count_tokens": {
        const { text, messages, model = "generic" } = args as {
          text?: string;
          messages?: Array<{ role: string; content: string }>;
          model?: ModelFamily;
        };
        if ((!messages || messages.length === 0) && (text === undefined || text === "")) {
          return json({ error: "Provide either text or messages." }, true);
        }
        const result = messages
          ? countMessageTokens(messages, model)
          : countTokens(text ?? "", model);
        return json(result);
      }

      case "scan_vulnerabilities": {
        const { packages, language, timeoutMs } = args as {
          packages: string[];
          language: string;
          timeoutMs?: number;
        };
        const result = await scanVulnerabilities(packages, language, timeoutMs);
        return json(result, !result.safe);
      }

      case "scan_pii": {
        const { text, filename, policy } = args as {
          text: string;
          filename?: string;
          policy?: PiiPolicy;
        };
        const result = scanPii({
          text,
          ...(filename !== undefined ? { filename } : {}),
          ...(policy !== undefined ? { policy } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_units": {
        const { tokenAddress, rawAmount, uiAmount, chain, timeoutMs } = args as {
          tokenAddress: string;
          rawAmount: string;
          uiAmount: number;
          chain: string;
          timeoutMs?: number;
        };
        const result = await checkDecimals({
          tokenAddress,
          rawAmount,
          uiAmount,
          chain: chain as Chain,
          ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_price": {
        const { symbol, tokenAddress, assetType, proposedPrice, maxAgeSeconds, divergenceThresholdPct } =
          args as {
            symbol?: string;
            tokenAddress?: string;
            assetType: "crypto" | "stock" | "forex";
            proposedPrice?: number;
            maxAgeSeconds?: number;
            divergenceThresholdPct?: number;
          };
        const result = await checkPrice({
          assetType,
          ...(symbol !== undefined ? { symbol } : {}),
          ...(tokenAddress !== undefined ? { tokenAddress } : {}),
          ...(proposedPrice !== undefined ? { proposedPrice } : {}),
          ...(maxAgeSeconds !== undefined ? { maxAgeSeconds } : {}),
          ...(divergenceThresholdPct !== undefined ? { divergenceThresholdPct } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_symbol": {
        const { symbol, assetType, expectedName, chain } = args as {
          symbol: string;
          assetType: "crypto" | "stock";
          expectedName?: string;
          chain?: string;
        };
        const result = await resolveSymbol({
          symbol,
          assetType,
          ...(expectedName !== undefined ? { expectedName } : {}),
          ...(chain !== undefined ? { chain } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_token_risk": {
        const { address, chain, maxRugScore, requireLpLocked, blockIfMintAuthority, blockIfFreezeAuthority } =
          args as {
            address: string;
            chain: string;
            maxRugScore?: number;
            requireLpLocked?: boolean;
            blockIfMintAuthority?: boolean;
            blockIfFreezeAuthority?: boolean;
          };
        const result = await checkRug({
          address,
          chain: chain as Chain,
          ...(maxRugScore !== undefined ? { maxRugScore } : {}),
          ...(requireLpLocked !== undefined ? { requireLpLocked } : {}),
          ...(blockIfMintAuthority !== undefined ? { blockIfMintAuthority } : {}),
          ...(blockIfFreezeAuthority !== undefined ? { blockIfFreezeAuthority } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_slippage": {
        const { tokenAddress, chain, tradeUsd, maxPriceImpactPct, minLiquidityUsd } = args as {
          tokenAddress: string;
          chain: string;
          tradeUsd: number;
          maxPriceImpactPct?: number;
          minLiquidityUsd?: number;
        };
        const result = await checkLiquidity({
          tokenAddress,
          chain,
          tradeUsd,
          ...(maxPriceImpactPct !== undefined ? { maxPriceImpactPct } : {}),
          ...(minLiquidityUsd !== undefined ? { minLiquidityUsd } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_order_risk": {
        const { symbol, tokenAddress, assetType, side, tradeUsd, portfolioValueUsd, chain, leverage } =
          args as {
            symbol?: string;
            tokenAddress?: string;
            assetType: "crypto" | "stock";
            side: "buy" | "sell";
            tradeUsd: number;
            portfolioValueUsd?: number;
            chain?: string;
            leverage?: number;
          };
        const result = await checkOrder({
          assetType,
          side,
          tradeUsd,
          ...(symbol !== undefined ? { symbol } : {}),
          ...(tokenAddress !== undefined ? { tokenAddress } : {}),
          ...(portfolioValueUsd !== undefined ? { portfolioValueUsd } : {}),
          ...(chain !== undefined ? { chain } : {}),
          ...(leverage !== undefined ? { leverage } : {}),
        });
        return json(result, result.verdict === "BLOCK");
      }

      case "finance_position_check": {
        const { trade: t, portfolio: p, rules: r } = args as {
          trade: {
            symbol: string;
            side: "buy" | "sell" | "long" | "short";
            tradeUsd: number;
            leverage?: number;
            assetType: "crypto" | "stock" | "forex";
          };
          portfolio: {
            totalValueUsd: number;
            cashUsd: number;
            dailyPnlUsd?: number;
            openPositions?: number;
            assetAllocation?: Record<string, number>;
          };
          rules?: {
            maxPositionPct?: number;
            maxDailyLossPct?: number;
            maxOpenPositions?: number;
            maxLeverage?: number;
            allowedAssets?: string[];
            killSwitch?: boolean;
            maxSingleTradeUsd?: number;
          };
        };

        const trade: TradeProposal = {
          symbol: t.symbol,
          side: t.side,
          tradeUsd: t.tradeUsd,
          assetType: t.assetType,
          ...(t.leverage !== undefined ? { leverage: t.leverage } : {}),
        };
        const portfolio: PortfolioSnapshot = {
          totalValueUsd: p.totalValueUsd,
          cashUsd: p.cashUsd,
          ...(p.dailyPnlUsd !== undefined ? { dailyPnlUsd: p.dailyPnlUsd } : {}),
          ...(p.openPositions !== undefined ? { openPositions: p.openPositions } : {}),
          ...(p.assetAllocation !== undefined ? { assetAllocation: p.assetAllocation } : {}),
        };
        let rules: GuardianRules | undefined;
        if (r !== undefined) {
          rules = {
            ...(r.maxPositionPct !== undefined ? { maxPositionPct: r.maxPositionPct } : {}),
            ...(r.maxDailyLossPct !== undefined ? { maxDailyLossPct: r.maxDailyLossPct } : {}),
            ...(r.maxOpenPositions !== undefined ? { maxOpenPositions: r.maxOpenPositions } : {}),
            ...(r.maxLeverage !== undefined ? { maxLeverage: r.maxLeverage } : {}),
            ...(r.allowedAssets !== undefined ? { allowedAssets: r.allowedAssets } : {}),
            ...(r.killSwitch !== undefined ? { killSwitch: r.killSwitch } : {}),
            ...(r.maxSingleTradeUsd !== undefined ? { maxSingleTradeUsd: r.maxSingleTradeUsd } : {}),
          };
        }
        const result = checkPosition(trade, portfolio, rules);
        return json(result, result.verdict === "BLOCK");
      }

      case "screen_sanctions": {
        const result = screenSanctions(args as SanctionsInput);
        return json(result, result.verdict === "BLOCK");
      }

      case "rx_check": {
        const result = rxCheck(args as unknown as RxCheckInput);
        return json(result, result.verdict === "BLOCK");
      }

      case "check_tool_args": {
        const result = checkToolArgs(args as unknown as Parameters<typeof checkToolArgs>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "check_infra_plan": {
        const result = checkInfraPlan(args as unknown as Parameters<typeof checkInfraPlan>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "check_citation": {
        const result = checkCitation(args as unknown as Parameters<typeof checkCitation>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "compute_deadline": {
        const result = computeDeadline(args as unknown as Parameters<typeof computeDeadline>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "validate_identifier": {
        const result = validateIdentifier(args as unknown as Parameters<typeof validateIdentifier>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "validate_schema": {
        const result = validateSchema(args as unknown as Parameters<typeof validateSchema>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "scan_sql": {
        const result = scanSql(args as unknown as Parameters<typeof scanSql>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "scan_command": {
        const result = scanCommand(args as unknown as Parameters<typeof scanCommand>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      case "scan_url": {
        const result = await scanUrl(args as unknown as Parameters<typeof scanUrl>[0]);
        return json(result, result.verdict === "BLOCK");
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool error: ${message}` }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("agent-toolbox.ai MCP server running on stdio");
