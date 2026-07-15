// Main safety gate
export { rxCheck } from "./rxCheck.js";

// Certificate utilities
export { generateCertificate, sha256Hex } from "./certificate.js";

// Types
export type {
  Verdict,
  FindingType,
  Severity,
  BlockSeverity,
  MedicationInput,
  PatientInput,
  PolicyInput,
  RxCheckInput,
  RxFinding,
  RxCheckResult,
} from "./types.js";
