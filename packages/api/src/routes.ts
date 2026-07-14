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

// ── GET /v1/pricing ──────────────────────────────────────────────────────────
v1.get("/pricing", (c) => {
  const wallet = process.env["SOL_SERVICE_WALLET"] ?? "";
  return c.json({
    wallet,
    network: "mainnet-beta",
    endpoints: {
      "/v1/validate/imports": { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
      "/v1/verify":           { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
      "/v1/distill":          { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
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

export { v1 };
