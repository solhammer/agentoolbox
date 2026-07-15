import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { paymentMiddleware, getLedgerStats } from "./middleware/payment.js";
import { v1 } from "./routes.js";
import { financeRoutes } from "./finance-routes.js";
import { adminAuth } from "./admin/middleware.js";
import { admin } from "./admin/routes.js";
import { appendLog } from "./admin/logger.js";
import type { RequestLogEntry } from "./admin/types.js";

/**
 * Best-effort extraction of service-specific fields from a v1 JSON response.
 * Clones the response so the original body stream is left intact for the client.
 */
async function enrichFromResponse(
  entry: RequestLogEntry,
  res: Response,
  path: string
): Promise<void> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return;

  let body: Record<string, unknown>;
  try {
    body = (await res.clone().json()) as Record<string, unknown>;
  } catch {
    return;
  }

  if (path === "/v1/validate/imports") {
    if (typeof body["language"] === "string") entry.language = body["language"];
    if (typeof body["hallucinationRate"] === "number") {
      entry.hallucinationRate = body["hallucinationRate"];
    }
    const hallucinated = body["hallucinated"];
    if (Array.isArray(hallucinated)) {
      entry.hallucinatedPackages = hallucinated
        .map((h) => (h as { name?: unknown }).name)
        .filter((n): n is string => typeof n === "string");
    }
  } else if (path === "/v1/verify") {
    const verdict = body["verdict"];
    if (verdict === "PASS" || verdict === "FLAG" || verdict === "BLOCK") {
      entry.verdict = verdict;
    }
    const claims = body["claims"];
    if (Array.isArray(claims)) {
      const checkTypes = [
        ...new Set(
          claims
            .map((cl) => (cl as { checkType?: unknown }).checkType)
            .filter((ct): ct is string => typeof ct === "string")
        ),
      ];
      if (checkTypes.length > 0) entry.checkTypes = checkTypes;
    }
    const iv = body["importValidation"];
    if (iv != null && typeof iv === "object") {
      const ivRec = iv as Record<string, unknown>;
      if (typeof ivRec["hallucinationRate"] === "number") {
        entry.hallucinationRate = ivRec["hallucinationRate"];
      }
      const packages = ivRec["hallucinated"];
      if (Array.isArray(packages)) {
        entry.hallucinatedPackages = packages.filter(
          (n): n is string => typeof n === "string"
        );
      }
    }
  }
}

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());

// ── Health / meta routes ──────────────────────────────────────────────────────
app.get("/", (c) =>
  c.json({
    name: "agent-toolbox.ai API",
    version: "0.1.0",
    description: "AI agent quality utility — hallucination firewall, import validator, context distiller",
    endpoints: {
      validate: "POST /v1/validate/imports",
      verify: "POST /v1/verify",
      distill: "POST /v1/distill",
      scanSecrets: "POST /v1/scan/secrets",
      scanInjection: "POST /v1/scan/injection",
      scanPii: "POST /v1/scan/pii",
      tokensCount: "POST /v1/tokens/count",
      scanVulnerabilities: "POST /v1/scan/vulnerabilities",
      financeUnits: "POST /v1/finance/units",
      financePrice: "POST /v1/finance/price",
      financeSymbol: "POST /v1/finance/symbol",
      financeTokenRisk: "POST /v1/finance/token/risk",
      financeSlippage: "POST /v1/finance/slippage",
      financeOrderRisk: "POST /v1/finance/order/risk",
      financePositionCheck: "POST /v1/finance/position/check",
    },
    docs: "https://agent-toolbox.ai/docs",
  })
);

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.get("/stats", async (c) => c.json(await getLedgerStats()));

// ── Admin routes (behind admin-key middleware) ────────────────────────────────
app.use("/admin/*", adminAuth);
app.route("/admin", admin);

// ── v1 routes (behind payment middleware) ─────────────────────────────────────
app.use("/v1/*", paymentMiddleware);

// Request-logging hook. Registered AFTER paymentMiddleware so that `apiKey` and
// `creditCost` set on the context are available. Captures status + latency, and
// best-effort extracts service-specific fields from the JSON response body.
const requestLogMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const latencyMs = Date.now() - start;

  const path = new URL(c.req.url).pathname;
  const apiKey = (c.get("apiKey") as string | null | undefined) ?? null;
  const creditCost = (c.get("creditCost") as number | undefined) ?? 0;

  const entry: RequestLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    path,
    method: c.req.method,
    apiKey,
    ip: c.req.header("x-forwarded-for") ?? "anonymous",
    statusCode: c.res.status,
    latencyMs,
    creditCost,
  };

  await enrichFromResponse(entry, c.res, path);
  void appendLog(entry).catch((err) => console.error("appendLog failed:", err));
};
app.use("/v1/*", requestLogMiddleware);

app.route("/v1", v1);
app.route("/v1/finance", financeRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ error: "not_found", message: `Route ${c.req.path} does not exist` }, 404)
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    { error: "internal_error", message: err.message },
    500
  );
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

// Detect Bun vs Node runtime
const globals = globalThis as Record<string, unknown>;
if (typeof globals["Bun"] !== "undefined") {
  (globals["Bun"] as { serve: (opts: { port: number; fetch: typeof app.fetch }) => void })
    .serve({ port: PORT, fetch: app.fetch });
} else {
  const { serve } = await import("@hono/node-server" as string) as
    { serve: (opts: { fetch: typeof app.fetch; port: number }) => void };
  serve({ fetch: app.fetch, port: PORT });
}

console.log(`🚀 agent-toolbox.ai API running on http://localhost:${PORT}`);

export default app;
