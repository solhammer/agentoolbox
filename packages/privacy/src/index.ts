// Main firewall
export { scanPii } from "./scan.js";

// Lower-level building blocks (useful for custom pipelines / testing)
export { runDetectors, type DetectOptions } from "./detectors.js";
export { luhn, ibanValid, nhsValid } from "./checksums.js";
export { maskMatch, redactText, type RedactSpan } from "./redact.js";
export { generateCertificate, sha256Hex } from "./certificate.js";

// Types
export type {
  Verdict,
  Category,
  Severity,
  EnforcementMode,
  PiiEntity,
  PiiPolicy,
  PiiScanInput,
  PiiScanResult,
} from "./types.js";
