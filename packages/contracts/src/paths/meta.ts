import { z, registry } from "../openapi.js";
import { ErrorResponseSchema } from "../shared.js";

// ═══════════════════════════════════════════════════════════════════════════
// GET / — service metadata
// ═══════════════════════════════════════════════════════════════════════════

export const ServiceMetaResponse = registry.register(
  "ServiceMetaResponse",
  z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    endpoints: z.record(z.string()),
    docs: z.string(),
  })
);

registry.registerPath({
  method: "get",
  path: "/",
  operationId: "getServiceMeta",
  summary: "Return service name, version, description, endpoint directory, and docs URL.",
  tags: ["meta"],
  responses: {
    200: {
      description: "Service metadata.",
      content: { "application/json": { schema: ServiceMetaResponse } },
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/pricing — payment / credit rate sheet
// ═══════════════════════════════════════════════════════════════════════════

const EndpointPriceSchema = z.object({
  credits: z.number().int(),
  lamports: z.number().int(),
  sol: z.number(),
  usdApprox: z.string(),
});

export const PricingResponse = registry.register(
  "PricingResponse",
  z.object({
    wallet: z.string(),
    network: z.string(),
    endpoints: z.record(EndpointPriceSchema),
    conversion: z.object({
      solPerCredit: z.number(),
      creditsPerSol: z.number(),
    }),
    freeTier: z.object({
      calls: z.number().int(),
      auth: z.boolean(),
    }),
    howToPay: z.array(z.string()),
    docs: z.string(),
  })
);

registry.registerPath({
  method: "get",
  path: "/v1/pricing",
  operationId: "getPricing",
  summary: "Return per-endpoint credit costs, SOL conversion rates, free-tier limits, and payment instructions.",
  tags: ["meta"],
  responses: {
    200: {
      description: "Pricing sheet.",
      content: { "application/json": { schema: PricingResponse } },
    },
    404: {
      description: "Not found.",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export {};
