import { z } from "../openapi.js";
import {
  VerdictSchema,
  SeveritySchema,
  SeverityCountsSchema,
  CertificateSchema,
  LatencyMsSchema,
  registerTool,
} from "../shared.js";

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL EXEMPLAR — POST /v1/scan/sql
// Copy this pattern for every endpoint:
//   1) define a `<Op>Request` zod object (port VERBATIM from the API's zod so
//      validation stays identical),
//   2) define a `<Op>Response` zod object (port from packages/sdk/src/types.ts),
//   3) call registerTool({...}). Export both schemas so the SDK can infer types.
// ═══════════════════════════════════════════════════════════════════════════

export const ScanSqlRequest = z.object({
  sql: z.string().min(1).max(200_000),
  dialect: z.enum(["postgres", "mysql", "sqlite", "tsql", "generic"]).optional(),
  policy: z
    .object({
      allowDdl: z.boolean().optional(),
      allowUnboundedWrites: z.boolean().optional(),
      maxStatements: z.number().int().min(1).max(1000).optional(),
      blockSeverityAtOrAbove: SeveritySchema.optional(),
    })
    .optional(),
});

export const SqlFindingSchema = z.object({
  ruleId: z.string(),
  severity: SeveritySchema,
  statementIndex: z.number().int(),
  message: z.string(),
  snippet: z.string(),
});

export const ScanSqlResponse = z.object({
  verdict: VerdictSchema,
  statements: z.number().int(),
  findings: z.array(SqlFindingSchema),
  counts: SeverityCountsSchema,
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/scan/sql",
  operationId: "scanSql",
  summary: "Scan SQL for destructive / injection-prone statements before execution.",
  tags: ["data"],
  credits: 1,
  request: ScanSqlRequest,
  response: ScanSqlResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/validate/identifier
// ═══════════════════════════════════════════════════════════════════════════

const IDENTIFIER_TYPES = [
  "iban", "aba_routing", "swift_bic", "credit_card", "ein", "vat_eu",
  "vin", "npi", "ssn", "eth_address", "sol_address",
] as const;

export const ValidateIdentifierRequest = z
  .object({
    value: z.string().max(200).optional(),
    values: z.array(z.string().max(200)).max(100).optional(),
    type: z.enum(IDENTIFIER_TYPES).optional(),
    types: z.array(z.enum(IDENTIFIER_TYPES)).optional(),
  })
  .refine((d) => d.value !== undefined || (d.values !== undefined && d.values.length > 0), {
    message: "Provide `value` or a non-empty `values` array",
  });

const IdentifierChecksumSchema = z.enum(["pass", "fail", "not_applicable"]);

const IdentifierEntrySchema = z.object({
  value: z.string(),
  type: z.union([z.enum(IDENTIFIER_TYPES), z.literal("unknown")]),
  valid: z.boolean(),
  checksum: IdentifierChecksumSchema,
  normalized: z.string().optional(),
  detail: z.string().optional(),
});

export const ValidateIdentifierResponse = z.object({
  verdict: VerdictSchema,
  results: z.array(IdentifierEntrySchema),
  counts: z.object({ total: z.number().int(), invalid: z.number().int() }),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/validate/identifier",
  operationId: "validateIdentifier",
  summary: "Validate structured identifiers (IBAN, BIC, VIN, NPI, EIN, crypto addresses, etc.).",
  tags: ["data"],
  credits: 1,
  request: ValidateIdentifierRequest,
  response: ValidateIdentifierResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/validate/schema
// ═══════════════════════════════════════════════════════════════════════════

export const ValidateSchemaRequest = z.object({
  data: z.unknown(),
  schema: z.record(z.unknown()),
  policy: z.object({ mode: z.enum(["block", "flag", "audit"]).optional() }).optional(),
});

const SchemaValidationErrorSchema = z.object({
  path: z.string(),
  keyword: z.string(),
  message: z.string(),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
});

export const ValidateSchemaResponse = z.object({
  verdict: VerdictSchema,
  valid: z.boolean(),
  errors: z.array(SchemaValidationErrorSchema),
  counts: z.object({ errors: z.number().int() }),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/validate/schema",
  operationId: "validateSchema",
  summary: "Validate arbitrary JSON data against a JSON Schema draft-7 schema.",
  tags: ["data"],
  credits: 1,
  request: ValidateSchemaRequest,
  response: ValidateSchemaResponse,
});
