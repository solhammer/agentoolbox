import { z } from "../openapi.js";
import {
  VerdictSchema,
  SeveritySchema,
  CertificateSchema,
  LatencyMsSchema,
  registerTool,
} from "../shared.js";

// ── POST /v1/compliance/sanctions ─────────────────────────────────────────────

export const ComplianceSanctionsRequest = z
  .object({
    name: z.string().min(1).max(512).optional(),
    names: z.array(z.string().min(1).max(512)).max(100).optional(),
    minScore: z.number().min(0).max(1).optional(),
    lists: z.array(z.string()).max(50).optional(),
    entityTypes: z
      .array(z.enum(["individual", "entity", "vessel", "aircraft", "unknown"]))
      .optional(),
    fuzzy: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || (d.names !== undefined && d.names.length > 0), {
    message: "Provide `name` or a non-empty `names` array",
  });

export const SanctionMatchSchema = z.object({
  query: z.string(),
  listedName: z.string(),
  matchedAlias: z.string().optional(),
  score: z.number(),
  matchType: z.enum(["exact", "alias", "fuzzy"]),
  list: z.string(),
  program: z.string().optional(),
  entityType: z.enum(["individual", "entity", "vessel", "aircraft", "unknown"]),
  id: z.string().optional(),
  jurisdiction: z.string().optional(),
});

export const ComplianceSanctionsResponse = z.object({
  verdict: VerdictSchema,
  matches: z.array(SanctionMatchSchema),
  counts: z.object({ total: z.number().int(), block: z.number().int(), flag: z.number().int() }),
  screened: z.number().int(),
  datasetDate: z.string(),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/compliance/sanctions",
  operationId: "complianceSanctions",
  summary: "Screen one or more names against global sanctions lists.",
  tags: ["regulated"],
  credits: 1,
  request: ComplianceSanctionsRequest,
  response: ComplianceSanctionsResponse,
});

// ── POST /v1/health/rx-check ──────────────────────────────────────────────────

export const HealthRxCheckRequest = z.object({
  medications: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        dose: z.number().nonnegative().optional(),
        unit: z.string().max(20).optional(),
        route: z.string().max(40).optional(),
        frequencyPerDay: z.number().positive().max(100).optional(),
      })
    )
    .min(1)
    .max(50),
  patient: z
    .object({
      weightKg: z.number().positive().max(1000).optional(),
      ageYears: z.number().nonnegative().max(150).optional(),
    })
    .optional(),
  policy: z
    .object({
      blockSeverityAtOrAbove: z
        .enum(["moderate", "major", "contraindicated"])
        .optional(),
    })
    .optional(),
});

export const RxFindingSchema = z.object({
  type: z.enum(["unit", "dose", "interaction"]),
  severity: z.enum(["low", "moderate", "major", "contraindicated"]),
  drugs: z.array(z.string()),
  message: z.string(),
  reference: z.string().optional(),
});

export const HealthRxCheckResponse = z.object({
  verdict: VerdictSchema,
  findings: z.array(RxFindingSchema),
  counts: z.object({
    low: z.number().int(),
    moderate: z.number().int(),
    major: z.number().int(),
    contraindicated: z.number().int(),
  }),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
  disclaimer: z.string(),
});

registerTool({
  path: "/v1/health/rx-check",
  operationId: "healthRxCheck",
  summary: "Check medications for dosing errors and drug\u2013drug interactions.",
  tags: ["regulated"],
  credits: 2,
  request: HealthRxCheckRequest,
  response: HealthRxCheckResponse,
});

// ── POST /v1/agent/tool-args ───────────────────────────────────────────────────

const FieldSpecSchema = z.object({
  type: z.enum(["string", "number", "integer", "boolean", "array", "object"]),
  required: z.boolean().optional(),
  nullable: z.boolean().optional(),
  enum: z.array(z.union([z.string(), z.number()])).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  unit: z.enum(["usd", "cents", "percent", "bps"]).optional(),
});

const CrossFieldRuleSchema = z.object({
  op: z.enum(["lte", "gte", "lt", "gt", "eq", "neq"]),
  left: z.string(),
  right: z.union([z.string(), z.object({ const: z.union([z.number(), z.string()]) })]),
  message: z.string().optional(),
});

export const AgentToolArgsRequest = z.object({
  tool: z.string().max(200).optional(),
  args: z.record(z.unknown()),
  schema: z.object({
    fields: z.record(FieldSpecSchema),
    allowUnknown: z.boolean().optional(),
    rules: z.array(CrossFieldRuleSchema).optional(),
  }),
  policy: z
    .object({
      mode: z.enum(["block", "flag", "audit"]).optional(),
      blockSeverityAtOrAbove: z.enum(["low", "medium", "high", "critical"]).optional(),
    })
    .optional(),
});

export const ToolArgsViolationSchema = z.object({
  path: z.string(),
  rule: z.string(),
  severity: SeveritySchema,
  message: z.string(),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
});

export const AgentToolArgsResponse = z.object({
  verdict: VerdictSchema,
  violations: z.array(ToolArgsViolationSchema),
  counts: z.object({
    low: z.number().int(),
    medium: z.number().int(),
    high: z.number().int(),
    critical: z.number().int(),
  }),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/agent/tool-args",
  operationId: "agentToolArgs",
  summary: "Validate AI tool call arguments against a declared schema before execution.",
  tags: ["regulated"],
  credits: 1,
  request: AgentToolArgsRequest,
  response: AgentToolArgsResponse,
});

// ── POST /v1/infra/plan/risk ─────────────────────────────────────────────────

export const InfraPlanRiskRequest = z.object({
  format: z.enum(["terraform", "iam", "k8s"]),
  document: z.unknown(),
  policy: z
    .object({
      blockSeverityAtOrAbove: z.enum(["low", "medium", "high", "critical"]).optional(),
    })
    .optional(),
});

export const InfraFindingSchema = z.object({
  ruleId: z.string(),
  severity: SeveritySchema,
  resource: z.string(),
  message: z.string(),
  framework: z.string().optional(),
});

export const InfraPlanRiskResponse = z.object({
  verdict: VerdictSchema,
  findings: z.array(InfraFindingSchema),
  counts: z.object({
    low: z.number().int(),
    medium: z.number().int(),
    high: z.number().int(),
    critical: z.number().int(),
  }),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/infra/plan/risk",
  operationId: "infraPlanRisk",
  summary: "Assess infrastructure plans (Terraform, IAM, Kubernetes) for security risks.",
  tags: ["regulated"],
  credits: 2,
  request: InfraPlanRiskRequest,
  response: InfraPlanRiskResponse,
});

// ── POST /v1/legal/cite ─────────────────────────────────────────────────────

export const LegalCiteRequest = z
  .object({
    citation: z.string().max(500).optional(),
    citations: z.array(z.string().max(500)).max(200).optional(),
    sourceText: z.string().max(200_000).optional(),
    quote: z.string().max(10_000).optional(),
  })
  .refine(
    (d) => d.citation !== undefined || (d.citations !== undefined && d.citations.length > 0),
    { message: "Provide `citation` or a non-empty `citations` array" }
  );

export const ParsedCitationSchema = z.object({
  volume: z.number().int(),
  reporter: z.string(),
  page: z.number().int(),
  year: z.number().int(),
});

export const CitationEntrySchema = z.object({
  raw: z.string(),
  parsed: ParsedCitationSchema.optional(),
  valid: z.boolean(),
  issues: z.array(z.string()),
});

export const QuoteCheckSchema = z.object({
  found: z.boolean(),
  message: z.string(),
});

export const LegalCiteResponse = z.object({
  verdict: VerdictSchema,
  citations: z.array(CitationEntrySchema),
  quoteCheck: QuoteCheckSchema.optional(),
  counts: z.object({ total: z.number().int(), invalid: z.number().int() }),
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/legal/cite",
  operationId: "legalCite",
  summary: "Validate legal citations and verify quoted text appears in the source.",
  tags: ["regulated"],
  credits: 2,
  request: LegalCiteRequest,
  response: LegalCiteResponse,
});

// ── POST /v1/legal/deadline ────────────────────────────────────────────────

export const LegalDeadlineRequest = z.object({
  start: z.string().min(1).max(40),
  days: z.number().int().min(0).max(100_000),
  mode: z.enum(["court", "calendar"]).optional(),
  direction: z.enum(["after", "before"]).optional(),
  jurisdiction: z.string().max(80).optional(),
});

export const SkippedDaysSchema = z.object({
  weekends: z.number().int(),
  holidays: z.array(z.string()),
});

export const LegalDeadlineResponse = z.object({
  verdict: VerdictSchema,
  deadline: z.string(),
  startDate: z.string(),
  daysRequested: z.number().int(),
  mode: z.enum(["court", "calendar"]),
  direction: z.enum(["after", "before"]),
  skipped: SkippedDaysSchema,
  certificate: CertificateSchema,
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/legal/deadline",
  operationId: "legalDeadline",
  summary: "Compute court or calendar deadlines, skipping weekends and holidays.",
  tags: ["regulated"],
  credits: 1,
  request: LegalDeadlineRequest,
  response: LegalDeadlineResponse,
});
