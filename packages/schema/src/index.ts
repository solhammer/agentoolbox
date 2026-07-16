// Main public API
export { validateSchema } from "./validateSchema.js";

// Certificate utilities
export { generateCertificate, sha256Hex } from "./certificate.js";

// Lower-level validator (useful for custom pipelines / testing)
export { runValidator } from "./validate.js";

// Types
export type {
  Verdict,
  SchemaPolicy,
  SchemaInput,
  SchemaError,
  SchemaResult,
} from "./types.js";
