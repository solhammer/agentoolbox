import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { validateImports } from "@agentoolbox/validator";
import { runFirewall } from "@agentoolbox/firewall";
import { distillContext } from "./distiller.js";
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

export { v1 };
