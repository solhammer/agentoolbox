import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Augment zod with `.openapi()` exactly once, before any schema is defined.
// IMPORTANT: every schema file must import `z` from THIS module (not "zod")
// so the augmentation is guaranteed to have run.
extendZodWithOpenApi(z);

/** The shared registry every path file registers into. */
export const registry = new OpenAPIRegistry();

// Bearer auth: a Solana tx signature or API key. Omit to use the free tier.
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description:
    "A Solana transaction signature or API key as a Bearer token. Omit entirely to use the free tier (10 calls per IP, no auth).",
});

export { z };
