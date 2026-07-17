// Importing each path module registers its endpoints into the shared registry.
import "./paths/core.js";
import "./paths/security.js";
import "./paths/finance.js";
import "./paths/regulated.js";
import "./paths/data.js";
import "./paths/meta.js";

export { registry, z } from "./openapi.js";
export * from "./shared.js";

// Per-endpoint request/response schemas (source of truth for SDK types).
export * from "./paths/core.js";
export * from "./paths/security.js";
export * from "./paths/finance.js";
export * from "./paths/regulated.js";
export * from "./paths/data.js";
export * from "./paths/meta.js";
