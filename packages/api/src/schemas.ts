import { z } from "zod";

export const LanguageSchema = z.enum([
  "python",
  "javascript",
  "typescript",
  "rust",
  "go",
]);

export const ValidateImportsSchema = z.object({
  language: LanguageSchema,
  code: z.string().min(1).max(100_000),
  timeoutMs: z.number().int().min(500).max(30_000).optional(),
});

export const OutputTypeSchema = z.enum([
  "code",
  "natural_language",
  "agent_action",
  "factual_claim",
]);

export const EnforcementModeSchema = z.enum(["block", "flag", "audit"]);

export const VerifySchema = z.object({
  outputType: OutputTypeSchema,
  llmResponse: z.string().min(1).max(200_000),
  language: LanguageSchema.optional(),
  enforcementMode: EnforcementModeSchema.optional().default("block"),
  timeoutMs: z.number().int().min(500).max(30_000).optional(),
});

export const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

export const DistillSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(500),
  targetTokens: z.number().int().min(100).max(200_000).default(4000),
  preserveSystemPrompt: z.boolean().optional().default(true),
});
