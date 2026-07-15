import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { validateImports } from "@agentoolbox/validator";
import { runFirewall } from "@agentoolbox/firewall";
import {
  distillContext,
  countTokens,
  countMessageTokens,
  scanVulnerabilities,
  scanSecrets,
  detectPromptInjection,
} from "@agentoolbox/core";
import { scanPii } from "@agentoolbox/privacy";
import { screenSanctions } from "@agentoolbox/compliance";
import { rxCheck } from "@agentoolbox/health";
import {
  ValidateImportsSchema,
  VerifySchema,
  DistillSchema,
} from "./schemas.js";

const v1 = new Hono();

// ── POST /v1/validate/imports ─────────────────────────────────────────────────
v1.post(
  "/validate/imports",
  zValidator("json", ValidateImportsSchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await validateImports({
      language: body.language,
      code: body.code,
      ...(body.timeoutMs !== undefined ? { timeoutMs: body.timeoutMs } : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/verify ───────────────────────────────────────────────────────────
v1.post(
  "/verify",
  zValidator("json", VerifySchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await runFirewall({
      outputType: body.outputType,
      llmResponse: body.llmResponse,
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.enforcementMode !== undefined ? { enforcementMode: body.enforcementMode } : {}),
      ...(body.timeoutMs !== undefined ? { timeoutMs: body.timeoutMs } : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/distill ──────────────────────────────────────────────────────────
v1.post(
  "/distill",
  zValidator("json", DistillSchema),
  async (c) => {
    const { messages, targetTokens, preserveSystemPrompt } = c.req.valid("json");
    const distilled = await distillContext({ messages, targetTokens, preserveSystemPrompt });
    return c.json(distilled);
  }
);

// ── POST /v1/tokens/count ─────────────────────────────────────────────────────
v1.post(
  "/tokens/count",
  zValidator(
    "json",
    z
      .object({
        text: z.string().max(500_000).optional(),
        messages: z
          .array(z.object({ role: z.string(), content: z.string() }))
          .optional(),
        model: z
          .enum(["gpt-4", "gpt-3.5", "claude", "gemini", "generic"])
          .optional()
          .default("generic"),
      })
      .refine((d) => d.text || d.messages, {
        message: "Provide either text or messages",
      })
  ),
  (c) => {
    const { text, messages, model } = c.req.valid("json");
    if (messages) {
      return c.json(countMessageTokens(messages, model));
    }
    return c.json(countTokens(text!, model));
  }
);

// ── POST /v1/scan/vulnerabilities ─────────────────────────────────────────────
v1.post(
  "/scan/vulnerabilities",
  zValidator(
    "json",
    z.object({
      packages: z.array(z.string()).min(1).max(50),
      language: z.enum(["python", "javascript", "typescript", "rust", "go"]),
      timeoutMs: z.number().optional(),
    })
  ),
  async (c) => {
    const { packages, language, timeoutMs } = c.req.valid("json");
    const result = await scanVulnerabilities(packages, language, timeoutMs);
    return c.json(result);
  }
);

// ── GET /v1/pricing ──────────────────────────────────────────────────────────
v1.get("/pricing", (c) => {
  const wallet = process.env["SOL_SERVICE_WALLET"] ?? "";
  return c.json({
    wallet,
    network: "mainnet-beta",
    endpoints: {
      "/v1/validate/imports":     { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/verify":               { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
      "/v1/distill":              { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/tokens/count":         { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/scan/vulnerabilities": { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
      "/v1/scan/pii":             { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/compliance/sanctions": { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/health/rx-check":      { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
    },
    conversion: { solPerCredit: 0.0001, creditsPerSol: 10_000 },
    freeTier: { calls: 10, auth: false },
    howToPay: [
      `1. Send SOL to: ${wallet || "(wallet not configured)"}`,
      "2. Pass the transaction signature as your Bearer token on the first call",
      "3. Credits are verified on-chain and added to your account",
      "4. Subsequent calls deduct credits automatically",
    ],
    docs: "https://agent-toolbox.ai/docs#authentication",
  });
});

// ── POST /v1/scan/secrets ─────────────────────────────────────────────────────
v1.post(
  "/scan/secrets",
  zValidator("json", z.object({
    code: z.string().min(1).max(200_000),
    filename: z.string().optional(),
  })),
  async (c) => {
    const { code, filename } = c.req.valid("json");
    const findings = scanSecrets(code);
    return c.json({
      findings,
      totalFindings: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      safe: findings.length === 0,
      filename,
    });
  }
);

// ── POST /v1/scan/injection ───────────────────────────────────────────────────
v1.post(
  "/scan/injection",
  zValidator("json", z.object({
    input: z.string().min(1).max(50_000),
    context: z.string().optional(),
  })),
  async (c) => {
    const { input, context } = c.req.valid("json");
    const result = detectPromptInjection(input);
    return c.json({ ...result, context });
  }
);

// ── POST /v1/scan/pii ─────────────────────────────────────────────────────────
v1.post(
  "/scan/pii",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(200_000),
      filename: z.string().optional(),
      policy: z
        .object({
          mode: z.enum(["block", "flag", "audit"]).optional(),
          blockSeverityAtOrAbove: z.enum(["low", "medium", "high", "critical"]).optional(),
          allowTypes: z.array(z.string()).optional(),
          jurisdictions: z.array(z.string()).optional(),
          redact: z.boolean().optional(),
        })
        .optional(),
    })
  ),
  (c) => {
    const b = c.req.valid("json");
    const p = b.policy;
    const result = scanPii({
      text: b.text,
      ...(b.filename !== undefined ? { filename: b.filename } : {}),
      ...(p !== undefined
        ? {
            policy: {
              ...(p.mode !== undefined ? { mode: p.mode } : {}),
              ...(p.blockSeverityAtOrAbove !== undefined
                ? { blockSeverityAtOrAbove: p.blockSeverityAtOrAbove }
                : {}),
              ...(p.allowTypes !== undefined ? { allowTypes: p.allowTypes } : {}),
              ...(p.jurisdictions !== undefined ? { jurisdictions: p.jurisdictions } : {}),
              ...(p.redact !== undefined ? { redact: p.redact } : {}),
            },
          }
        : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/compliance/sanctions ─────────────────────────────────────────────
v1.post(
  "/compliance/sanctions",
  zValidator(
    "json",
    z
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
      })
  ),
  (c) => {
    const b = c.req.valid("json");
    const result = screenSanctions({
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.names !== undefined ? { names: b.names } : {}),
      ...(b.minScore !== undefined ? { minScore: b.minScore } : {}),
      ...(b.lists !== undefined ? { lists: b.lists } : {}),
      ...(b.entityTypes !== undefined ? { entityTypes: b.entityTypes } : {}),
      ...(b.fuzzy !== undefined ? { fuzzy: b.fuzzy } : {}),
    });
    return c.json(result);
  }
);

// ── POST /v1/health/rx-check ──────────────────────────────────────────────────
v1.post(
  "/health/rx-check",
  zValidator(
    "json",
    z.object({
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
    })
  ),
  (c) => {
    const b = c.req.valid("json");
    const result = rxCheck({
      medications: b.medications.map((m) => ({
        name: m.name,
        ...(m.dose !== undefined ? { dose: m.dose } : {}),
        ...(m.unit !== undefined ? { unit: m.unit } : {}),
        ...(m.route !== undefined ? { route: m.route } : {}),
        ...(m.frequencyPerDay !== undefined ? { frequencyPerDay: m.frequencyPerDay } : {}),
      })),
      ...(b.patient !== undefined
        ? {
            patient: {
              ...(b.patient.weightKg !== undefined ? { weightKg: b.patient.weightKg } : {}),
              ...(b.patient.ageYears !== undefined ? { ageYears: b.patient.ageYears } : {}),
            },
          }
        : {}),
      ...(b.policy !== undefined
        ? {
            policy: {
              ...(b.policy.blockSeverityAtOrAbove !== undefined
                ? { blockSeverityAtOrAbove: b.policy.blockSeverityAtOrAbove }
                : {}),
            },
          }
        : {}),
    });
    return c.json(result);
  }
);

export { v1 };
