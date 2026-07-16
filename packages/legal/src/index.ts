// ── Public functions ──────────────────────────────────────────────────────────
export { checkCitation } from "./citation.js";
export { computeDeadline } from "./deadline.js";

// ── Shared primitives (useful for custom pipelines / testing) ─────────────────
export { generateCertificate, sha256Hex } from "./certificate.js";

// ── Data exports ──────────────────────────────────────────────────────────────
export { KNOWN_REPORTERS, REPORTER_SET } from "./data/reporters.js";
export { US_FEDERAL_HOLIDAYS, HOLIDAY_DATE_SET, HOLIDAY_YEAR_RANGE } from "./data/holidays.js";

// ── Public types ──────────────────────────────────────────────────────────────
export type {
  Verdict,
  // Citation
  CitationInput,
  ParsedCitation,
  CitationEntry,
  QuoteCheck,
  CitationResult,
  // Deadline
  DeadlineInput,
  SkippedDays,
  DeadlineResult,
} from "./types.js";

// ── Data types ────────────────────────────────────────────────────────────────
export type { ReporterEntry } from "./data/reporters.js";
export type { FederalHoliday } from "./data/holidays.js";
