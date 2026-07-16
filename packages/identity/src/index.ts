// Main entry point
export { validateIdentifier } from "./validate.js";

// Certificate utilities
export { generateCertificate, sha256Hex } from "./certificate.js";

// Types
export type {
  Verdict,
  IdentifierType,
  ChecksumResult,
  IdentifierInput,
  IdentifierEntry,
  IdentifierResult,
} from "./types.js";
