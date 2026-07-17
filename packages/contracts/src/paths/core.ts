import { z } from "../openapi.js";
import {
  VerdictSchema,
  CertificateSchema,
  LatencyMsSchema,
  registerTool,
} from "../shared.js";

// ── Shared language enum (core + verify both use it) ─────────────────────────
const LanguageSchema = z.enum([
  "python",
  "javascript",
  "typescript",
  "rust",
  "go",
]);

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/validate/imports — operationId: validateImports
// ═══════════════════════════════════════════════════════════════════════════

export const ValidateImportsRequest = z.object({
  language: LanguageSchema,
  code: z.string().min(1).max(100_000),
  timeoutMs: z.number().int().min(500).max(30_000).optional(),
});

const CheckedImportSchema = z.object({
  name: z.string(),
  raw: z.string(),
  status: z.enum(["valid", "hallucinated", "unknown"]),
  registry: z.string().optional(),
  registryUrl: z.string().optional(),
  error: z.string().optional(),
});

export const ValidateImportsResponse = z.object({
  language: LanguageSchema,
  valid: z.array(CheckedImportSchema),
  hallucinated: z.array(CheckedImportSchema),
  unknown: z.array(CheckedImportSchema),
  totalImports: z.number().int(),
  hallucinationRate: z.number(),
  latencyMs: LatencyMsSchema,
});

registerTool({
  path: "/v1/validate/imports",
  operationId: "validateImports",
  summary: "Validate that imports/packages in LLM-generated code are real and not hallucinated.",
  tags: ["core"],
  credits: 1,
  request: ValidateImportsRequest,
  response: ValidateImportsResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/verify — operationId: verify
// ═══════════════════════════════════════════════════════════════════════════

const OutputTypeSchema = z.enum([
  "code",
  "natural_language",
  "agent_action",
  "factual_claim",
]);

const EnforcementModeSchema = z.enum(["block", "flag", "audit"]);

export const VerifyRequest = z.object({
  outputType: OutputTypeSchema,
  llmResponse: z.string().min(1).max(200_000),
  language: LanguageSchema.optional(),
  enforcementMode: EnforcementModeSchema.optional().default("block"),
  timeoutMs: z.number().int().min(500).max(30_000).optional(),
});

const ClaimVerdictSchema = z.object({
  text: z.string(),
  verdict: VerdictSchema,
  confidence: z.number(),
  checkType: z.string(),
  evidence: z.string().optional(),
  suggestedFix: z.string().optional(),
});

export const VerifyResponse = z.object({
  verdict: VerdictSchema,
  overallScore: z.number(),
  claims: z.array(ClaimVerdictSchema),
  outputType: OutputTypeSchema,
  enforcementMode: EnforcementModeSchema,
  latencyMs: LatencyMsSchema,
  certificate: CertificateSchema,
  importValidation: z
    .object({
      valid: z.array(z.string()),
      hallucinated: z.array(z.string()),
      unknown: z.array(z.string()),
      hallucinationRate: z.number(),
    })
    .optional(),
});

registerTool({
  path: "/v1/verify",
  operationId: "verify",
  summary: "Firewall an LLM response — verify claims, detect hallucinations, and enforce output policy.",
  tags: ["core"],
  credits: 2,
  request: VerifyRequest,
  response: VerifyResponse,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/distill — operationId: distill
// ═══════════════════════════════════════════════════════════════════════════

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

export const DistillRequest = z.object({
  messages: z.array(MessageSchema).min(1).max(500),
  targetTokens: z.number().int().min(100).max(200_000).default(4000),
  preserveSystemPrompt: z.boolean().optional().default(true),
});

export const DistillResponse = z.object({
  messages: z.array(MessageSchema),
  originalCount: z.number().int(),
  distilledCount: z.number().int(),
  estimatedTokens: z.number().int(),
  compressionRatio: z.number(),
  method: z.string(),
});

registerTool({
  path: "/v1/distill",
  operationId: "distill",
  summary: "Distill a conversation message array to fit within a token budget while preserving key context.",
  tags: ["core"],
  credits: 1,
  request: DistillRequest,
  response: DistillResponse,
});
