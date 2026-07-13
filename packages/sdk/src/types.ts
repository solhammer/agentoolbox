// Mirror of @agentoolbox/validator types (no internal dep in SDK)
export type Language = "python" | "javascript" | "typescript" | "rust" | "go";

export interface CheckedImport {
  name: string;
  raw: string;
  status: "valid" | "hallucinated" | "unknown";
  registry?: string;
  registryUrl?: string;
  error?: string;
}

export interface ValidateImportsInput {
  language: Language;
  code: string;
  timeoutMs?: number;
}

export interface ValidateImportsResult {
  language: Language;
  valid: CheckedImport[];
  hallucinated: CheckedImport[];
  unknown: CheckedImport[];
  totalImports: number;
  hallucinationRate: number;
  latencyMs: number;
}

// Mirror of @agentoolbox/firewall types
export type Verdict = "PASS" | "FLAG" | "BLOCK";
export type OutputType = "code" | "natural_language" | "agent_action" | "factual_claim";
export type EnforcementMode = "block" | "flag" | "audit";

export interface FirewallInput {
  outputType: OutputType;
  llmResponse: string;
  language?: Language;
  enforcementMode?: EnforcementMode;
  timeoutMs?: number;
}

export interface ClaimVerdict {
  text: string;
  verdict: Verdict;
  confidence: number;
  checkType: string;
  evidence?: string;
  suggestedFix?: string;
}

export interface FirewallResult {
  verdict: Verdict;
  overallScore: number;
  claims: ClaimVerdict[];
  outputType: OutputType;
  enforcementMode: EnforcementMode;
  latencyMs: number;
  certificate: string;
  importValidation?: {
    valid: string[];
    hallucinated: string[];
    unknown: string[];
    hallucinationRate: number;
  };
}

export interface DistillInput {
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  targetTokens?: number;
  preserveSystemPrompt?: boolean;
}

export interface DistillResult {
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  originalCount: number;
  distilledCount: number;
  estimatedTokens: number;
  compressionRatio: number;
  method: string;
}
