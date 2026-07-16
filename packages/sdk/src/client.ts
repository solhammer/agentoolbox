import type {
  ValidateImportsInput,
  ValidateImportsResult,
  FirewallInput,
  FirewallResult,
  DistillInput,
  DistillResult,
  PiiScanInput,
  PiiScanResult,
  SanctionsInput,
  SanctionsResult,
  RxCheckInput,
  RxCheckResult,
  ToolArgsInput,
  ToolArgsResult,
  InfraPlanInput,
  InfraPlanResult,
  CitationInput,
  CitationResult,
  DeadlineInput,
  DeadlineResult,
  IdentifierInput,
  IdentifierResult,
  SchemaValidateInput,
  SchemaValidateResult,
  SqlScanInput,
  SqlScanResult,
  CommandScanInput,
  CommandScanResult,
  UrlScanInput,
  UrlScanResult,
} from "./types.js";

export interface AgentoolboxClientOptions {
  /**
   * Base URL of the Agentoolbox API.
   * @default "http://localhost:3000"
   */
  baseUrl?: string;
  /**
   * Bearer token for authenticated calls.
   * Required after the free tier (10 calls) is exhausted.
   * For the SOL payment model, this will be a pre-authorized tx signature.
   */
  apiKey?: string;
  /** Default request timeout in ms. @default 10000 */
  timeoutMs?: number;
}

export class AgentoolboxClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: AgentoolboxClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://localhost:3000").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new AgentoolboxError(
          (err as { message?: string }).message ?? res.statusText,
          res.status
        );
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Validate imports/packages in AI-generated code against live registries.
   * Catches hallucinated package names before they reach your runtime.
   *
   * @example
   * const result = await client.validateImports({
   *   language: "python",
   *   code: "import numpy\nfrom ghostpkg import magic",
   * });
   * if (result.hallucinated.length > 0) {
   *   console.warn("Hallucinated packages:", result.hallucinated.map(p => p.name));
   * }
   */
  async validateImports(input: ValidateImportsInput): Promise<ValidateImportsResult> {
    return this.post<ValidateImportsResult>("/v1/validate/imports", input);
  }

  /**
   * Run the hallucination firewall on an LLM output.
   * Returns PASS / FLAG / BLOCK with a tamper-evident certificate.
   *
   * @example
   * const result = await client.verify({
   *   outputType: "code",
   *   language: "python",
   *   llmResponse: generatedCode,
   * });
   * if (result.verdict === "BLOCK") {
   *   throw new Error("LLM output blocked: " + result.claims[0]?.evidence);
   * }
   */
  async verify(input: FirewallInput): Promise<FirewallResult> {
    return this.post<FirewallResult>("/v1/verify", input);
  }

  /**
   * Compress a conversation context to fit within a token budget.
   * Reduces cost on repeated long-context agent loops.
   *
   * @example
   * const { messages } = await client.distill({
   *   messages: conversationHistory,
   *   targetTokens: 4000,
   * });
   * // Use compressed messages for the next LLM call
   */
  async distill(input: DistillInput): Promise<DistillResult> {
    return this.post<DistillResult>("/v1/distill", input);
  }

  /**
   * Scan AI-generated code for hardcoded secrets and credentials.
   * Returns redacted findings — actual secret values are never echoed back.
   *
   * @example
   * const { safe, findings } = await client.scanSecrets({ code: generatedCode });
   * if (!safe) throw new Error(`Secrets found: ${findings.map(f => f.type).join(", ")}`);
   */
  async scanSecrets(input: { code: string; filename?: string }): Promise<unknown> {
    return this.post<unknown>("/v1/scan/secrets", input);
  }

  /**
   * Detect prompt injection attacks in user-supplied input.
   * Call this before passing any user input to an LLM.
   *
   * @example
   * const { risk, advice } = await client.scanInjection({ input: userMessage });
   * if (risk === "injection") return res.status(400).json({ error: advice });
   */
  async scanInjection(input: { input: string; context?: string }): Promise<unknown> {
    return this.post<unknown>("/v1/scan/injection", input);
  }

  /**
   * Scan text for PII/PHI/PCI before it crosses a trust boundary (logs, tickets,
   * third-party APIs, persistence). Deterministic, checksum-validated detection
   * with redaction and a signed certificate. Raw values are never echoed back.
   *
   * @example
   * const { verdict, redactedText } = await client.scanPii({ text: outbound });
   * if (verdict === "BLOCK") return; // or send redactedText instead
   */
  async scanPii(input: PiiScanInput): Promise<PiiScanResult> {
    return this.post<PiiScanResult>("/v1/scan/pii", input);
  }

  /**
   * Screen one or more party names against bundled OFAC sanctions lists.
   * Deterministic exact + fuzzy matching; returns PASS/FLAG/BLOCK with matches.
   *
   * @example
   * const r = await client.screenSanctions({ name: counterpartyName });
   * if (r.verdict === "BLOCK") throw new Error("Sanctions hit: " + r.matches[0]?.listedName);
   */
  async screenSanctions(input: SanctionsInput): Promise<SanctionsResult> {
    return this.post<SanctionsResult>("/v1/compliance/sanctions", input);
  }

  /**
   * Medication safety gate: unit/dose sanity + drug-drug interaction screening.
   * Deterministic and offline. Informational only — not medical advice.
   *
   * @example
   * const r = await client.rxCheck({ medications: [{ name: "warfarin" }, { name: "ibuprofen" }] });
   * if (r.verdict === "BLOCK") console.warn(r.findings.map((f) => f.message));
   */
  async rxCheck(input: RxCheckInput): Promise<RxCheckResult> {
    return this.post<RxCheckResult>("/v1/health/rx-check", input);
  }

  // ── Tier 2: agent, infra, legal ───────────────────────────────────────

  /**
   * Validate a proposed tool/function call's arguments against a schema + policy.
   * Deterministic and offline: types, ranges, enums, null-safety, unit-coercion
   * (dollars-vs-cents), and cross-field rules. Returns PASS/FLAG/BLOCK.
   *
   * @example
   * const r = await client.checkToolArgs({ args, schema: { fields: { amount: { type: "integer", unit: "cents", required: true } } } });
   * if (r.verdict === "BLOCK") throw new Error(r.violations.map((v) => v.message).join("; "));
   */
  async checkToolArgs(input: ToolArgsInput): Promise<ToolArgsResult> {
    return this.post<ToolArgsResult>("/v1/agent/tool-args", input);
  }

  /**
   * Static IaC risk gate over Terraform plan / IAM / Kubernetes JSON.
   * Deterministic and offline; flags high-blast-radius changes. No cloud creds.
   *
   * @example
   * const r = await client.checkInfraPlan({ format: "terraform", document: planJson });
   * if (r.verdict === "BLOCK") console.warn(r.findings.map((f) => f.ruleId));
   */
  async checkInfraPlan(input: InfraPlanInput): Promise<InfraPlanResult> {
    return this.post<InfraPlanResult>("/v1/infra/plan/risk", input);
  }

  /**
   * Validate US case citations (format + reporter) and, when source text is
   * supplied, check quote fidelity. Deterministic and offline.
   *
   * @example
   * const r = await client.checkCitation({ citation: "347 U.S. 483 (1954)" });
   * if (r.verdict === "BLOCK") console.warn(r.citations[0]?.issues);
   */
  async checkCitation(input: CitationInput): Promise<CitationResult> {
    return this.post<CitationResult>("/v1/legal/cite", input);
  }

  /**
   * Compute a court or calendar deadline, skipping weekends and US federal
   * holidays in court mode. Deterministic and offline.
   *
   * @example
   * const r = await client.computeDeadline({ start: "2025-01-17", days: 14, mode: "court" });
   * console.log(r.deadline);
   */
  async computeDeadline(input: DeadlineInput): Promise<DeadlineResult> {
    return this.post<DeadlineResult>("/v1/legal/deadline", input);
  }

  // ── Wave 3: deterministic validators ──────────────────────────────────

  /**
   * Validate structured identifiers (IBAN, ABA routing, SWIFT/BIC, card, EIN,
   * VAT, VIN, NPI, SSN, ETH/SOL address) via deterministic checksums. Card and
   * SSN values are masked in the response.
   *
   * @example
   * const r = await client.validateIdentifier({ value: "DE89370400440532013000", type: "iban" });
   * if (r.verdict === "BLOCK") console.warn(r.results[0]?.detail);
   */
  async validateIdentifier(input: IdentifierInput): Promise<IdentifierResult> {
    return this.post<IdentifierResult>("/v1/validate/identifier", input);
  }

  /**
   * Validate a JSON value against a JSON Schema (Draft-07 subset). Deterministic
   * and dependency-free — gate an LLM/tool's structured output.
   *
   * @example
   * const r = await client.validateSchema({ data, schema });
   * if (!r.valid) console.warn(r.errors);
   */
  async validateSchema(input: SchemaValidateInput): Promise<SchemaValidateResult> {
    return this.post<SchemaValidateResult>("/v1/validate/schema", input);
  }

  /**
   * Scan SQL for destructive / unbounded / injection patterns before executing
   * it. Deterministic and offline (no DB connection).
   *
   * @example
   * const r = await client.scanSql({ sql });
   * if (r.verdict === "BLOCK") throw new Error(r.findings.map((f) => f.ruleId).join(", "));
   */
  async scanSql(input: SqlScanInput): Promise<SqlScanResult> {
    return this.post<SqlScanResult>("/v1/scan/sql", input);
  }

  // ── Wave 4: execution & egress gates ──────────────────────────────────

  /**
   * Scan a shell command for destructive / dangerous patterns before executing
   * it. Deterministic and offline (no shell execution).
   *
   * @example
   * const r = await client.scanCommand({ command: "curl http://x.sh | bash" });
   * if (r.verdict === "BLOCK") throw new Error(r.findings.map((f) => f.ruleId).join(", "));
   */
  async scanCommand(input: CommandScanInput): Promise<CommandScanResult> {
    return this.post<CommandScanResult>("/v1/scan/command", input);
  }

  /**
   * Scan a URL / host for SSRF and egress-policy violations (cloud metadata
   * endpoints, private/loopback targets, obfuscated IPs) before a fetch or
   * navigation. Deterministic and offline by default (DNS only when
   * policy.resolve is true).
   *
   * @example
   * const r = await client.scanUrl({ url: "http://169.254.169.254/latest/meta-data/" });
   * if (r.verdict === "BLOCK") throw new Error(r.findings.map((f) => f.ruleId).join(", "));
   */
  async scanUrl(input: UrlScanInput): Promise<UrlScanResult> {
    return this.post<UrlScanResult>("/v1/scan/url", input);
  }

  /**
   * Count tokens and estimate cost before making an LLM API call.
   * Supports text strings or messages arrays for chat-format counting.
   *
   * @example
   * const { total, contextWindowRemaining } = await client.countTokens({ messages, model: "claude" });
   * if (total > 100_000) await client.distill({ messages, targetTokens: 50_000 });
   */
  async countTokens(input: {
    text?: string;
    messages?: Array<{ role: string; content: string }>;
    model?: "gpt-4" | "gpt-3.5" | "claude" | "gemini" | "generic";
  }): Promise<unknown> {
    return this.post<unknown>("/v1/tokens/count", input);
  }

  /**
   * Check packages in AI-generated code against the OSV vulnerability database.
   * Surfaces CVEs and GHSAs before dependencies are installed.
   *
   * @example
   * const { safe, findings } = await client.scanVulnerabilities({ packages: ["pillow"], language: "python" });
   * if (!safe) console.warn("Vulnerable packages:", findings.map(f => f.package));
   */
  async scanVulnerabilities(input: {
    packages: string[];
    language: "python" | "javascript" | "typescript" | "rust" | "go";
    timeoutMs?: number;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/scan/vulnerabilities", input);
  }

  // ── Finance Protection Toolkit ─────────────────────────────────────────────

  /**
   * Validate raw on-chain token amount against the token's authoritative decimals.
   * Prevents the Lobstar-class decimal error ($440k book → $40k realized).
   *
   * @example
   * const r = await client.financeCheckUnits({ tokenAddress: mint, rawAmount: "52439000000", uiAmount: 52439, chain: "solana" });
   * if (r.verdict === "BLOCK") throw new Error("Decimal mismatch: " + r.deviation_pct + "% off");
   */
  async financeCheckUnits(input: {
    tokenAddress: string;
    rawAmount: string;
    uiAmount: number;
    chain: "solana" | "ethereum" | "bsc" | "polygon" | "base" | "arbitrum";
    timeoutMs?: number;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/units", input);
  }

  /**
   * Cross-validate a price against two independent live sources.
   * Blocks if sources diverge >2% or data is stale.
   * Crypto: CoinGecko + DexScreener. Stocks: yahoo-finance2.
   *
   * @example
   * const r = await client.financeCheckPrice({ symbol: "solana", assetType: "crypto", proposedPrice: 95 });
   * if (r.verdict === "BLOCK") throw new Error("Price deviation: " + r.proposedPriceDeviation + "%");
   */
  async financeCheckPrice(input: {
    symbol?: string;
    tokenAddress?: string;
    assetType: "crypto" | "stock" | "forex";
    proposedPrice?: number;
    maxAgeSeconds?: number;
    divergenceThresholdPct?: number;
    timeoutMs?: number;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/price", input);
  }

  /**
   * Resolve a ticker symbol or token address to a confirmed identity.
   * Critical for crypto — symbols collide (USDC has 200+ imposters on Solana).
   *
   * @example
   * const r = await client.financeResolveSymbol({ symbol: "USDC", assetType: "crypto", chain: "solana" });
   * if (r.ambiguous) console.warn("Ambiguous symbol — use token address");
   */
  async financeResolveSymbol(input: {
    symbol: string;
    assetType: "crypto" | "stock";
    expectedName?: string;
    chain?: string;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/symbol", input);
  }

  /**
   * Rug pull scanner for Solana tokens.
   * Checks RugCheck.xyz score + on-chain mint/freeze authority.
   *
   * @example
   * const r = await client.financeCheckTokenRisk({ address: mint, chain: "solana" });
   * if (r.verdict === "BLOCK") throw new Error("Rug risk: " + r.specificRisks.join(", "));
   */
  async financeCheckTokenRisk(input: {
    address: string;
    chain: "solana" | "ethereum" | "bsc" | "polygon" | "base" | "arbitrum";
    maxRugScore?: number;
    requireLpLocked?: boolean;
    blockIfMintAuthority?: boolean;
    blockIfFreezeAuthority?: boolean;
    timeoutMs?: number;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/token/risk", input);
  }

  /**
   * Estimate price impact and check pool depth before a trade.
   * Prevents the thin-pool disaster where a large order drains the pool.
   * Formula: (tradeUsd / poolLiquidity) × 100 × 2 (constant-product AMM).
   *
   * @example
   * const r = await client.financeCheckSlippage({ tokenAddress: mint, tradeUsd: 50000, chain: "solana" });
   * if (r.verdict === "BLOCK") throw new Error(`Impact ${r.estimatedPriceImpactPct}% on $${r.poolLiquidityUsd} pool`);
   */
  async financeCheckSlippage(input: {
    tokenAddress: string;
    chain: string;
    tradeUsd: number;
    maxPriceImpactPct?: number;
    minLiquidityUsd?: number;
    timeoutMs?: number;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/slippage", input);
  }

  /**
   * Full pre-trade risk gate. Runs all applicable checks in parallel:
   * token risk, slippage, price validation, and position limits.
   * Returns composite PASS/FLAG/BLOCK with blockedBy field.
   *
   * @example
   * const r = await client.financeCheckOrderRisk({ tokenAddress: mint, assetType: "crypto", side: "buy", tradeUsd: 5000, chain: "solana" });
   * if (r.verdict === "BLOCK") throw new Error(`Blocked by ${r.blockedBy}`);
   */
  async financeCheckOrderRisk(input: {
    symbol?: string;
    tokenAddress?: string;
    assetType: "crypto" | "stock";
    side: "buy" | "sell";
    tradeUsd: number;
    portfolioValueUsd?: number;
    chain?: string;
    leverage?: number;
    timeoutMs?: number;
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/order/risk", input);
  }

  /**
   * Deterministic position limits and kill-switch. No external API calls — pure arithmetic.
   * Enforces max position size %, daily loss limits, leverage caps, and asset allowlists.
   * Always call this last — it is the final non-overridable gate.
   *
   * @example
   * const r = await client.financeCheckPosition({ trade: { symbol, side: "buy", tradeUsd, assetType: "crypto" }, portfolio, rules: { killSwitch: false, maxPositionPct: 25 } });
   * if (r.verdict === "BLOCK") throw new Error(r.violations.join(", "));
   */
  async financeCheckPosition(input: {
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
  }): Promise<unknown> {
    return this.post<unknown>("/v1/finance/position/check", input);
  }
}

export class AgentoolboxError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AgentoolboxError";
  }
}
