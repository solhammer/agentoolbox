/**
 * All SDK types are derived from `@agentoolbox/contracts` — the OpenAPI single
 * source of truth. Every `import type` here is erased at compile time, so the
 * published dist/ has zero runtime dependency on contracts.
 */
import type {
  z,
  // shared fragments
  VerdictSchema,
  SeveritySchema,
  // core
  ValidateImportsRequest,
  ValidateImportsResponse,
  VerifyRequest,
  VerifyResponse,
  DistillRequest,
  DistillResponse,
  // security
  ScanPiiRequest,
  ScanPiiResponse,
  PiiEntitySchema,
  ScanCommandRequest,
  ScanCommandResponse,
  CommandFindingSchema,
  ScanUrlRequest,
  ScanUrlResponse,
  UrlTargetSchema,
  UrlFindingSchema,
  // regulated
  ComplianceSanctionsRequest,
  ComplianceSanctionsResponse,
  SanctionMatchSchema,
  HealthRxCheckRequest,
  HealthRxCheckResponse,
  RxFindingSchema,
  AgentToolArgsRequest,
  AgentToolArgsResponse,
  ToolArgsViolationSchema,
  InfraPlanRiskRequest,
  InfraPlanRiskResponse,
  InfraFindingSchema,
  LegalCiteRequest,
  LegalCiteResponse,
  ParsedCitationSchema,
  CitationEntrySchema,
  QuoteCheckSchema,
  LegalDeadlineRequest,
  LegalDeadlineResponse,
  SkippedDaysSchema,
  // data
  ScanSqlRequest,
  ScanSqlResponse,
  SqlFindingSchema,
  ValidateIdentifierRequest,
  ValidateIdentifierResponse,
  ValidateSchemaRequest,
  ValidateSchemaResponse,
} from "@agentoolbox/contracts";

// ── Shared ────────────────────────────────────────────────────────────────────

export type Verdict = z.infer<typeof VerdictSchema>;

// ── Core: validate/imports ────────────────────────────────────────────────────

export type Language = z.infer<typeof ValidateImportsResponse>["language"];

export type CheckedImport = NonNullable<
  z.infer<typeof ValidateImportsResponse>["valid"][number]
>;

export type ValidateImportsInput = z.input<typeof ValidateImportsRequest>;
export type ValidateImportsResult = z.infer<typeof ValidateImportsResponse>;

// ── Core: verify (hallucination firewall) ─────────────────────────────────────

export type OutputType = z.infer<typeof VerifyResponse>["outputType"];
export type EnforcementMode = z.infer<typeof VerifyResponse>["enforcementMode"];

export type ClaimVerdict = NonNullable<
  z.infer<typeof VerifyResponse>["claims"][number]
>;

export type FirewallInput = z.input<typeof VerifyRequest>;
export type FirewallResult = z.infer<typeof VerifyResponse>;

// ── Core: distill ─────────────────────────────────────────────────────────────

export type DistillInput = z.input<typeof DistillRequest>;
export type DistillResult = z.infer<typeof DistillResponse>;

// ── Security: scan/pii ───────────────────────────────────────────────────────

export type PiiCategory = NonNullable<
  z.infer<typeof ScanPiiResponse>["categories"][number]
>;
export type PiiSeverity = z.infer<typeof SeveritySchema>;
export type PiiEnforcementMode =
  z.infer<typeof ScanPiiResponse>["enforcementMode"];

export type PiiEntity = z.infer<typeof PiiEntitySchema>;
export type PiiPolicy = NonNullable<
  z.input<typeof ScanPiiRequest>["policy"]
>;

export type PiiScanInput = z.input<typeof ScanPiiRequest>;
export type PiiScanResult = z.infer<typeof ScanPiiResponse>;

// ── Regulated: compliance/sanctions ──────────────────────────────────────────

export type SanctionEntityType =
  z.infer<typeof SanctionMatchSchema>["entityType"];
export type SanctionMatchType =
  z.infer<typeof SanctionMatchSchema>["matchType"];

export type SanctionMatch = z.infer<typeof SanctionMatchSchema>;
export type SanctionsInput = z.input<typeof ComplianceSanctionsRequest>;
export type SanctionsResult = z.infer<typeof ComplianceSanctionsResponse>;

// ── Regulated: health/rx-check ────────────────────────────────────────────────

export type RxFindingType = z.infer<typeof RxFindingSchema>["type"];
export type RxSeverity = z.infer<typeof RxFindingSchema>["severity"];
export type RxBlockSeverity = Exclude<RxSeverity, "low">;

export type RxMedicationInput = NonNullable<
  z.input<typeof HealthRxCheckRequest>["medications"][number]
>;
export type RxFinding = z.infer<typeof RxFindingSchema>;

export type RxCheckInput = z.input<typeof HealthRxCheckRequest>;
export type RxCheckResult = z.infer<typeof HealthRxCheckResponse>;

// ── Regulated: agent/tool-args ────────────────────────────────────────────────

export type ToolArgsSeverity = z.infer<typeof SeveritySchema>;
export type ToolArgsFieldType = NonNullable<
  z.input<typeof AgentToolArgsRequest>["schema"]["fields"][string]
>["type"];
export type ToolArgsFieldUnit = NonNullable<
  NonNullable<
    z.input<typeof AgentToolArgsRequest>["schema"]["fields"][string]
  >["unit"]
>;

export type ToolArgsFieldSpec = NonNullable<
  z.input<typeof AgentToolArgsRequest>["schema"]["fields"][string]
>;
export type ToolArgsCrossFieldRule = NonNullable<
  NonNullable<
    z.input<typeof AgentToolArgsRequest>["schema"]["rules"]
  >[number]
>;
export type ToolArgsSchema =
  z.input<typeof AgentToolArgsRequest>["schema"];
export type ToolArgsPolicy = NonNullable<
  z.input<typeof AgentToolArgsRequest>["policy"]
>;
export type ToolArgsViolation = z.infer<typeof ToolArgsViolationSchema>;

export type ToolArgsInput = z.input<typeof AgentToolArgsRequest>;
export type ToolArgsResult = z.infer<typeof AgentToolArgsResponse>;

// ── Regulated: infra/plan/risk ────────────────────────────────────────────────

export type InfraSeverity = z.infer<typeof SeveritySchema>;
export type InfraFormat = z.infer<typeof InfraPlanRiskRequest>["format"];

export type InfraFinding = z.infer<typeof InfraFindingSchema>;
export type InfraPlanPolicy = NonNullable<
  z.input<typeof InfraPlanRiskRequest>["policy"]
>;

export type InfraPlanInput = z.input<typeof InfraPlanRiskRequest>;
export type InfraPlanResult = z.infer<typeof InfraPlanRiskResponse>;

// ── Regulated: legal/cite ────────────────────────────────────────────────────

export type ParsedCitation = z.infer<typeof ParsedCitationSchema>;
export type CitationEntry = z.infer<typeof CitationEntrySchema>;
export type QuoteCheck = z.infer<typeof QuoteCheckSchema>;

export type CitationInput = z.input<typeof LegalCiteRequest>;
export type CitationResult = z.infer<typeof LegalCiteResponse>;

// ── Regulated: legal/deadline ────────────────────────────────────────────────

export type SkippedDays = z.infer<typeof SkippedDaysSchema>;

export type DeadlineInput = z.input<typeof LegalDeadlineRequest>;
export type DeadlineResult = z.infer<typeof LegalDeadlineResponse>;

// ── Data: validate/identifier ────────────────────────────────────────────────

export type IdentifierType = NonNullable<
  z.input<typeof ValidateIdentifierRequest>["type"]
>;
export type IdentifierChecksum = NonNullable<
  z.infer<typeof ValidateIdentifierResponse>["results"][number]
>["checksum"];
export type IdentifierEntry = NonNullable<
  z.infer<typeof ValidateIdentifierResponse>["results"][number]
>;

export type IdentifierInput = z.input<typeof ValidateIdentifierRequest>;
export type IdentifierResult = z.infer<typeof ValidateIdentifierResponse>;

// ── Data: validate/schema ─────────────────────────────────────────────────────

export type SchemaMode = NonNullable<
  NonNullable<z.input<typeof ValidateSchemaRequest>["policy"]>["mode"]
>;
export type SchemaValidationError = NonNullable<
  z.infer<typeof ValidateSchemaResponse>["errors"][number]
>;

export type SchemaValidateInput = z.input<typeof ValidateSchemaRequest>;
export type SchemaValidateResult = z.infer<typeof ValidateSchemaResponse>;

// ── Data: scan/sql ───────────────────────────────────────────────────────────

export type SqlDialect = NonNullable<
  z.input<typeof ScanSqlRequest>["dialect"]
>;
export type SqlSeverity = z.infer<typeof SeveritySchema>;
export type SqlScanPolicy = NonNullable<
  z.input<typeof ScanSqlRequest>["policy"]
>;
export type SqlFinding = z.infer<typeof SqlFindingSchema>;

export type SqlScanInput = z.input<typeof ScanSqlRequest>;
export type SqlScanResult = z.infer<typeof ScanSqlResponse>;

// ── Security: scan/command ────────────────────────────────────────────────────

export type CommandShellKind = NonNullable<
  z.input<typeof ScanCommandRequest>["shell"]
>;
export type CommandSeverity = z.infer<typeof SeveritySchema>;
export type CommandScanPolicy = NonNullable<
  z.input<typeof ScanCommandRequest>["policy"]
>;
export type CommandFinding = z.infer<typeof CommandFindingSchema>;

export type CommandScanInput = z.input<typeof ScanCommandRequest>;
export type CommandScanResult = z.infer<typeof ScanCommandResponse>;

// ── Security: scan/url ────────────────────────────────────────────────────────

export type UrlIpClass = z.infer<typeof UrlTargetSchema>["ipClass"];
export type UrlSeverity = z.infer<typeof SeveritySchema>;
export type UrlScanPolicy = NonNullable<
  z.input<typeof ScanUrlRequest>["policy"]
>;
export type UrlTarget = z.infer<typeof UrlTargetSchema>;
export type UrlFinding = z.infer<typeof UrlFindingSchema>;

export type UrlScanInput = z.input<typeof ScanUrlRequest>;
export type UrlScanResult = z.infer<typeof ScanUrlResponse>;
