import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { registry } from "./openapi.js";

// Importing each path module registers its endpoints into the shared registry.
import "./paths/core.js";
import "./paths/security.js";
import "./paths/finance.js";
import "./paths/regulated.js";
import "./paths/data.js";
import "./paths/meta.js";

/**
 * Build the OpenAPI 3.1 document from every registered endpoint. Used by the
 * generator (writes openapi.json) and served live by the API at GET /openapi.json.
 */
export function getOpenApiDocument(): OpenAPIObject {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "agent-toolbox.ai API",
      version: "0.1.0",
      description:
        "The quality layer for AI agents — deterministic, offline pre-action gates. Each tool returns a PASS/FLAG/BLOCK verdict plus a tamper-evident SHA-256 certificate.",
    },
    servers: [{ url: "https://api.agent-toolbox.ai", description: "Production" }],
  });
}

export { registry, z } from "./openapi.js";
export * from "./shared.js";

// Per-endpoint request/response schemas (source of truth for SDK types).
export * from "./paths/core.js";
export * from "./paths/security.js";
export * from "./paths/finance.js";
export * from "./paths/regulated.js";
export * from "./paths/data.js";
export * from "./paths/meta.js";
