import { z, registry } from "./openapi.js";

// ── Shared fragments reused across gate-style tools ───────────────────────────
/** Deterministic gate verdict returned by most tools. */
export const VerdictSchema = z.enum(["PASS", "FLAG", "BLOCK"]);
/** Severity scale used by scanners/validators. */
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
/** Tamper-evident SHA-256 certificate string, e.g. "sha256:5bbf...". */
export const CertificateSchema = z
  .string()
  .openapi({ description: "Tamper-evident SHA-256 certificate.", example: "sha256:5bbf2510c504a1c1" });
/** Server compute time in milliseconds. */
export const LatencyMsSchema = z.number().openapi({ description: "Server compute time in ms." });
/** Standard severity histogram present on many results. */
export const SeverityCountsSchema = z.object({
  low: z.number().int(),
  medium: z.number().int(),
  high: z.number().int(),
  critical: z.number().int(),
});

/** 4xx error envelope returned by the API. */
export const ErrorResponseSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    docs: z.string().optional(),
  })
  .openapi("ErrorResponse");

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Register a POST tool endpoint with the standard agent-toolbox envelope:
 * bearer-optional security (free tier), a JSON request body, a 200 JSON
 * response, and shared 400/402 error responses. The request/response schemas
 * are registered as named components (`<OperationId>Request` /
 * `<OperationId>Response`) so generated clients get named models.
 *
 * This is the canonical pattern — see paths/data.ts (scanSql) for a worked
 * example. Author one call per endpoint.
 */
export function registerTool(opts: {
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  credits: number;
  request: z.ZodTypeAny;
  response: z.ZodTypeAny;
}): void {
  const reqSchema = registry.register(cap(opts.operationId) + "Request", opts.request);
  const resSchema = registry.register(cap(opts.operationId) + "Response", opts.response);
  registry.registerPath({
    method: "post",
    path: opts.path,
    operationId: opts.operationId,
    summary: opts.summary,
    description:
      (opts.description ? opts.description + "\n\n" : "") +
      `Cost: ${opts.credits} credit(s). Free tier: 10 calls per IP (no auth).`,
    tags: opts.tags ?? [],
    // Bearer OR unauthenticated (free tier).
    security: [{ bearerAuth: [] }, {}],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: reqSchema } },
      },
    },
    responses: {
      200: {
        description: "Success.",
        content: { "application/json": { schema: resSchema } },
      },
      400: {
        description: "Invalid request body.",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      402: {
        description: "Free tier exhausted or insufficient credits.",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  });
}
