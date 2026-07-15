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

// Mirror of @agentoolbox/privacy types (no internal dep in SDK)
export type PiiCategory = "PII" | "PHI" | "PCI";
export type PiiSeverity = "low" | "medium" | "high" | "critical";
export type PiiEnforcementMode = "block" | "flag" | "audit";

export interface PiiEntity {
  type: string;
  category: PiiCategory;
  severity: PiiSeverity;
  match: string;
  start: number;
  end: number;
  line: number;
  validated: boolean;
  confidence: number;
  jurisdiction?: string;
}

export interface PiiPolicy {
  mode?: PiiEnforcementMode;
  blockSeverityAtOrAbove?: PiiSeverity;
  allowTypes?: string[];
  jurisdictions?: string[];
  redact?: boolean;
}

export interface PiiScanInput {
  text: string;
  filename?: string;
  policy?: PiiPolicy;
}

export interface PiiScanResult {
  verdict: Verdict;
  safe: boolean;
  score: number;
  categories: PiiCategory[];
  totalFindings: number;
  counts: Record<PiiSeverity, number>;
  entities: PiiEntity[];
  redactedText?: string;
  certificate: string;
  enforcementMode: PiiEnforcementMode;
  filename?: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/compliance types (no internal dep in SDK)
export type SanctionEntityType = "individual" | "entity" | "vessel" | "aircraft" | "unknown";
export type SanctionMatchType = "exact" | "alias" | "fuzzy";

export interface SanctionsInput {
  name?: string;
  names?: string[];
  minScore?: number;
  lists?: string[];
  entityTypes?: SanctionEntityType[];
  fuzzy?: boolean;
}

export interface SanctionMatch {
  query: string;
  listedName: string;
  matchedAlias?: string;
  score: number;
  matchType: SanctionMatchType;
  list: string;
  program?: string;
  entityType: SanctionEntityType;
  id?: string;
  jurisdiction?: string;
}

export interface SanctionsResult {
  verdict: Verdict;
  matches: SanctionMatch[];
  counts: { total: number; block: number; flag: number };
  screened: number;
  datasetDate: string;
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/health types (no internal dep in SDK)
export type RxFindingType = "unit" | "dose" | "interaction";
export type RxSeverity = "low" | "moderate" | "major" | "contraindicated";
export type RxBlockSeverity = "moderate" | "major" | "contraindicated";

export interface RxMedicationInput {
  name: string;
  dose?: number;
  unit?: string;
  route?: string;
  frequencyPerDay?: number;
}

export interface RxCheckInput {
  medications: RxMedicationInput[];
  patient?: { weightKg?: number; ageYears?: number };
  policy?: { blockSeverityAtOrAbove?: RxBlockSeverity };
}

export interface RxFinding {
  type: RxFindingType;
  severity: RxSeverity;
  drugs: string[];
  message: string;
  reference?: string;
}

export interface RxCheckResult {
  verdict: Verdict;
  findings: RxFinding[];
  counts: Record<RxSeverity, number>;
  certificate: string;
  latencyMs: number;
  disclaimer: string;
}
