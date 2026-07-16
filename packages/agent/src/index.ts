// Main firewall entrypoint
export { checkToolArgs } from "./check.js";

// Certificate utilities (useful for custom verification pipelines)
export { generateCertificate, sha256Hex } from "./certificate.js";

// Types
export type {
  Verdict,
  Severity,
  FieldType,
  FieldUnit,
  FieldSpec,
  CrossFieldRule,
  ArgSchema,
  Policy,
  ToolArgsInput,
  Violation,
  ViolationCounts,
  ToolArgsResult,
} from "./types.js";
