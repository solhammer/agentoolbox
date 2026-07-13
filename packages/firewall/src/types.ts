import type { Language } from "@agentoolbox/validator";

export type Verdict = "PASS" | "FLAG" | "BLOCK";
export type OutputType = "code" | "natural_language" | "agent_action" | "factual_claim";
export type EnforcementMode = "block" | "flag" | "audit";

export interface FirewallInput {
  outputType: OutputType;
  llmResponse: string;
  /** Language for code outputs */
  language?: Language;
  enforcementMode?: EnforcementMode;
  /** Timeout per external check in ms. Default: 5000 */
  timeoutMs?: number;
  /** Optional retrieved context docs for NLI grounding check */
  sourceTexts?: string[];
}

export interface ClaimVerdict {
  text: string;
  verdict: Verdict;
  confidence: number; // 0–1
  checkType: string; // e.g. "hallucinated_package", "invalid_url", "invalid_doi"
  evidence?: string;
  suggestedFix?: string;
}

export interface FirewallResult {
  verdict: Verdict;
  overallScore: number; // 0–1, higher = more trustworthy
  claims: ClaimVerdict[];
  outputType: OutputType;
  enforcementMode: EnforcementMode;
  latencyMs: number;
  certificate: string; // SHA-256(input + verdict + timestamp)
  /** Present for code outputs */
  importValidation?: {
    valid: string[];
    hallucinated: string[];
    unknown: string[];
    hallucinationRate: number;
  };
}
