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
