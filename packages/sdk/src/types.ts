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

// Mirror of @agentoolbox/agent types (no internal dep in SDK)
export type ToolArgsSeverity = "low" | "medium" | "high" | "critical";
export type ToolArgsFieldType = "string" | "number" | "integer" | "boolean" | "array" | "object";
export type ToolArgsFieldUnit = "usd" | "cents" | "percent" | "bps";

export interface ToolArgsFieldSpec {
  type: ToolArgsFieldType;
  required?: boolean;
  nullable?: boolean;
  enum?: Array<string | number>;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  unit?: ToolArgsFieldUnit;
}

export interface ToolArgsCrossFieldRule {
  op: "lte" | "gte" | "lt" | "gt" | "eq" | "neq";
  left: string;
  right: string | { const: number | string };
  message?: string;
}

export interface ToolArgsSchema {
  fields: Record<string, ToolArgsFieldSpec>;
  allowUnknown?: boolean;
  rules?: ToolArgsCrossFieldRule[];
}

export interface ToolArgsPolicy {
  mode?: "block" | "flag" | "audit";
  blockSeverityAtOrAbove?: ToolArgsSeverity;
}

export interface ToolArgsInput {
  tool?: string;
  args: Record<string, unknown>;
  schema: ToolArgsSchema;
  policy?: ToolArgsPolicy;
}

export interface ToolArgsViolation {
  path: string;
  rule: string;
  severity: ToolArgsSeverity;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ToolArgsResult {
  verdict: Verdict;
  violations: ToolArgsViolation[];
  counts: Record<ToolArgsSeverity, number>;
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/infra types (no internal dep in SDK)
export type InfraSeverity = "low" | "medium" | "high" | "critical";
export type InfraFormat = "terraform" | "iam" | "k8s";

export interface InfraFinding {
  ruleId: string;
  severity: InfraSeverity;
  resource: string;
  message: string;
  framework?: string;
}

export interface InfraPlanPolicy {
  blockSeverityAtOrAbove?: InfraSeverity;
}

export interface InfraPlanInput {
  format: InfraFormat;
  document: unknown;
  policy?: InfraPlanPolicy;
}

export interface InfraPlanResult {
  verdict: Verdict;
  findings: InfraFinding[];
  counts: Record<InfraSeverity, number>;
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/legal types (no internal dep in SDK)
export interface CitationInput {
  citation?: string;
  citations?: string[];
  sourceText?: string;
  quote?: string;
}

export interface ParsedCitation {
  volume: number;
  reporter: string;
  page: number;
  year: number;
}

export interface CitationEntry {
  raw: string;
  parsed?: ParsedCitation;
  valid: boolean;
  issues: string[];
}

export interface QuoteCheck {
  found: boolean;
  message: string;
}

export interface CitationResult {
  verdict: Verdict;
  citations: CitationEntry[];
  quoteCheck?: QuoteCheck;
  counts: { total: number; invalid: number };
  certificate: string;
  latencyMs: number;
}

export interface DeadlineInput {
  start: string;
  days: number;
  mode?: "court" | "calendar";
  direction?: "after" | "before";
  jurisdiction?: string;
}

export interface SkippedDays {
  weekends: number;
  holidays: string[];
}

export interface DeadlineResult {
  verdict: Verdict;
  deadline: string;
  startDate: string;
  daysRequested: number;
  mode: "court" | "calendar";
  direction: "after" | "before";
  skipped: SkippedDays;
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/identity types (no internal dep in SDK)
export type IdentifierType = "iban"|"aba_routing"|"swift_bic"|"credit_card"|"ein"|"vat_eu"|"vin"|"npi"|"ssn"|"eth_address"|"sol_address";
export type IdentifierChecksum = "pass" | "fail" | "not_applicable";

export interface IdentifierInput {
  value?: string;
  values?: string[];
  type?: IdentifierType;
  types?: IdentifierType[];
}

export interface IdentifierEntry {
  value: string;
  type: IdentifierType | "unknown";
  valid: boolean;
  checksum: IdentifierChecksum;
  normalized?: string;
  detail?: string;
}

export interface IdentifierResult {
  verdict: Verdict;
  results: IdentifierEntry[];
  counts: { total: number; invalid: number };
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/schema types (no internal dep in SDK)
export type SchemaMode = "block" | "flag" | "audit";

export interface SchemaValidateInput {
  data: unknown;
  schema: Record<string, unknown>;
  policy?: { mode?: SchemaMode };
}

export interface SchemaValidationError {
  path: string;
  keyword: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface SchemaValidateResult {
  verdict: Verdict;
  valid: boolean;
  errors: SchemaValidationError[];
  counts: { errors: number };
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/sqlguard types (no internal dep in SDK)
export type SqlDialect = "postgres" | "mysql" | "sqlite" | "tsql" | "generic";
export type SqlSeverity = "low" | "medium" | "high" | "critical";

export interface SqlScanPolicy {
  allowDdl?: boolean;
  allowUnboundedWrites?: boolean;
  maxStatements?: number;
  blockSeverityAtOrAbove?: SqlSeverity;
}

export interface SqlScanInput {
  sql: string;
  dialect?: SqlDialect;
  policy?: SqlScanPolicy;
}

export interface SqlFinding {
  ruleId: string;
  severity: SqlSeverity;
  statementIndex: number;
  message: string;
  snippet: string;
}

export interface SqlScanResult {
  verdict: Verdict;
  statements: number;
  findings: SqlFinding[];
  counts: Record<SqlSeverity, number>;
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/cmdguard types (no internal dep in SDK)
export type CommandShellKind = "bash" | "sh" | "zsh" | "powershell" | "generic";
export type CommandSeverity = "low" | "medium" | "high" | "critical";

export interface CommandScanPolicy {
  blockSeverityAtOrAbove?: CommandSeverity;
  allow?: string[];
  protectedRefs?: string[];
  maxSegments?: number;
}

export interface CommandScanInput {
  command: string;
  shell?: CommandShellKind;
  policy?: CommandScanPolicy;
}

export interface CommandFinding {
  ruleId: string;
  severity: CommandSeverity;
  segmentIndex: number;
  message: string;
  snippet: string;
}

export interface CommandScanResult {
  verdict: Verdict;
  segments: number;
  findings: CommandFinding[];
  counts: Record<CommandSeverity, number>;
  certificate: string;
  latencyMs: number;
}

// Mirror of @agentoolbox/netguard types (no internal dep in SDK)
export type UrlIpClass =
  | "public"
  | "loopback"
  | "private"
  | "link-local"
  | "reserved"
  | "unknown";
export type UrlSeverity = "low" | "medium" | "high" | "critical";

export interface UrlScanPolicy {
  allowSchemes?: string[];
  allowHosts?: string[];
  denyHosts?: string[];
  denyPrivate?: boolean;
  allowedPorts?: number[];
  resolve?: boolean;
  blockSeverityAtOrAbove?: UrlSeverity;
}

export interface UrlScanInput {
  url: string;
  policy?: UrlScanPolicy;
}

export interface UrlTarget {
  scheme: string;
  host: string;
  hostType: "ipv4" | "ipv6" | "hostname";
  ipClass: UrlIpClass;
  port: number | null;
  normalizedUrl: string;
}

export interface UrlFinding {
  ruleId: string;
  severity: UrlSeverity;
  message: string;
}

export interface UrlScanResult {
  verdict: Verdict;
  target: UrlTarget;
  findings: UrlFinding[];
  counts: Record<UrlSeverity, number>;
  certificate: string;
  latencyMs: number;
}
