import type {
  ValidateImportsInput,
  ValidateImportsResult,
  FirewallInput,
  FirewallResult,
  DistillInput,
  DistillResult,
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
