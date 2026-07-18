import { Hono } from "hono";
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
import { checkToolArgs } from "@agentoolbox/agent";
import { checkInfraPlan } from "@agentoolbox/infra";
import { checkCitation, computeDeadline } from "@agentoolbox/legal";
import { validateIdentifier } from "@agentoolbox/identity";
import { validateSchema } from "@agentoolbox/schema";
import { scanSql } from "@agentoolbox/sqlguard";
import { scanCommand } from "@agentoolbox/cmdguard";
import { scanUrl } from "@agentoolbox/netguard";
import {
  ValidateImportsSchema,
  VerifySchema,
  DistillSchema,
} from "./schemas.js";
import {
  CountTokensRequest,
  ScanVulnerabilitiesRequest,
  ScanSecretsRequest,
  ScanInjectionRequest,
  ScanPiiRequest,
  ComplianceSanctionsRequest,
  HealthRxCheckRequest,
  AgentToolArgsRequest,
  InfraPlanRiskRequest,
  LegalCiteRequest,
  LegalDeadlineRequest,
  ValidateIdentifierRequest,
  ValidateSchemaRequest,
  ScanSqlRequest,
  ScanCommandRequest,
  ScanUrlRequest,
} from "@agentoolbox/contracts";

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
  zValidator("json", CountTokensRequest),
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
  zValidator("json", ScanVulnerabilitiesRequest),
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
      "/v1/agent/tool-args":      { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/infra/plan/risk":      { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
      "/v1/legal/cite":           { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
      "/v1/legal/deadline":       { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/validate/identifier":  { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/validate/schema":      { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/scan/sql":             { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/scan/command":         { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/scan/url":             { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
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
  zValidator("json", ScanSecretsRequest),
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
  zValidator("json", ScanInjectionRequest),
  async (c) => {
    const { input, context } = c.req.valid("json");
    const result = detectPromptInjection(input);
    return c.json({ ...result, context });
  }
);

// ── POST /v1/scan/pii ─────────────────────────────────────────────────────────
v1.post(
  "/scan/pii",
  zValidator("json", ScanPiiRequest),
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
  zValidator("json", ComplianceSanctionsRequest),
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
  zValidator("json", HealthRxCheckRequest),
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

// ── POST /v1/agent/tool-args ───────────────────────────────────────────────────
v1.post(
  "/agent/tool-args",
  zValidator("json", AgentToolArgsRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = checkToolArgs(b as unknown as Parameters<typeof checkToolArgs>[0]);
    return c.json(result);
  }
);

// ── POST /v1/infra/plan/risk ─────────────────────────────────────────────────
v1.post(
  "/infra/plan/risk",
  zValidator("json", InfraPlanRiskRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = checkInfraPlan(b as unknown as Parameters<typeof checkInfraPlan>[0]);
    return c.json(result);
  }
);

// ── POST /v1/legal/cite ─────────────────────────────────────────────────────
v1.post(
  "/legal/cite",
  zValidator("json", LegalCiteRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = checkCitation(b as unknown as Parameters<typeof checkCitation>[0]);
    return c.json(result);
  }
);

// ── POST /v1/legal/deadline ────────────────────────────────────────────────
v1.post(
  "/legal/deadline",
  zValidator("json", LegalDeadlineRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = computeDeadline(b as unknown as Parameters<typeof computeDeadline>[0]);
    return c.json(result);
  }
);

// ── POST /v1/validate/identifier ──────────────────────────────────────────────
v1.post(
  "/validate/identifier",
  zValidator("json", ValidateIdentifierRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = validateIdentifier(b as unknown as Parameters<typeof validateIdentifier>[0]);
    return c.json(result);
  }
);

// ── POST /v1/validate/schema ────────────────────────────────────────────
v1.post(
  "/validate/schema",
  zValidator("json", ValidateSchemaRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = validateSchema(b as unknown as Parameters<typeof validateSchema>[0]);
    return c.json(result);
  }
);

// ── POST /v1/scan/sql ───────────────────────────────────────────────
v1.post(
  "/scan/sql",
  zValidator("json", ScanSqlRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = scanSql(b as unknown as Parameters<typeof scanSql>[0]);
    return c.json(result);
  }
);

// ── POST /v1/scan/command ───────────────────────────────────────────
v1.post(
  "/scan/command",
  zValidator("json", ScanCommandRequest),
  (c) => {
    const b = c.req.valid("json");
    const result = scanCommand(b as unknown as Parameters<typeof scanCommand>[0]);
    return c.json(result);
  }
);

// ── POST /v1/scan/url ───────────────────────────────────────────────
v1.post(
  "/scan/url",
  zValidator("json", ScanUrlRequest),
  async (c) => {
    const b = c.req.valid("json");
    const result = await scanUrl(b as unknown as Parameters<typeof scanUrl>[0]);
    return c.json(result);
  }
);

export { v1 };
