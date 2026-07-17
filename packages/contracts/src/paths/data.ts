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

// TODO(contracts-data): add /v1/validate/identifier and /v1/validate/schema here,
// following the scanSql pattern above.
