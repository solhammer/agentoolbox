// Secret & credential scanner
export { scanSecrets, type SecretFinding } from "./secrets.js";

// Prompt injection detector
export { detectPromptInjection, type InjectionResult } from "./injection.js";

// OSV vulnerability scanner
export {
  scanVulnerabilities,
  type VulnFinding,
  type VulnScanResult,
} from "./vulnerabilities.js";

// Token counter
export {
  countTokens,
  countMessageTokens,
  type ModelFamily,
  type TokenCount,
  type MessageTokenCount,
} from "./tokens.js";

// Context distiller
export {
  distillContext,
  type DistillerInput,
  type DistillerResult,
} from "./distiller.js";
