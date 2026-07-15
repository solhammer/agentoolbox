// Main screening entrypoint
export { screenSanctions } from "./screen.js";

// Lower-level building blocks (useful for custom pipelines / testing)
export { normalizeName, tokenSortKey } from "./normalize.js";
export { jaro, jaroWinkler } from "./match.js";
export { generateCertificate, sha256Hex } from "./certificate.js";
export { OFAC_RECORDS, OFAC_SNAPSHOT_DATE } from "./data/ofac.js";

// Types
export type {
  Verdict,
  EntityType,
  MatchType,
  SanctionRecord,
  SanctionsInput,
  SanctionMatch,
  SanctionsResult,
} from "./types.js";
