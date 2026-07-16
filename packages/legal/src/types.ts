/** Overall verdict for a legal tool call. */
export type Verdict = "PASS" | "FLAG" | "BLOCK";

// ─── Citation types ──────────────────────────────────────────────────────────

/** Input to checkCitation. At least one of `citation` or `citations` is required. */
export interface CitationInput {
  /** A single citation string to validate. */
  citation?: string;
  /** Multiple citation strings to validate in one call. */
  citations?: string[];
  /**
   * Source text to check the quote against.
   * When provided together with `quote`, a quote-fidelity check is run.
   */
  sourceText?: string;
  /** The quote to locate within `sourceText`. */
  quote?: string;
}

/** Structured fields parsed from a citation string. */
export interface ParsedCitation {
  volume: number;
  reporter: string;
  page: number;
  year: number;
}

/** Validation result for a single citation string. */
export interface CitationEntry {
  raw: string;
  parsed?: ParsedCitation;
  valid: boolean;
  issues: string[];
}

/** Result of a quote-fidelity check. */
export interface QuoteCheck {
  found: boolean;
  message: string;
}

/** Result returned by checkCitation. */
export interface CitationResult {
  verdict: Verdict;
  citations: CitationEntry[];
  quoteCheck?: QuoteCheck;
  counts: { total: number; invalid: number };
  certificate: string;
  latencyMs: number;
}

// ─── Deadline types ──────────────────────────────────────────────────────────

/** Input to computeDeadline. */
export interface DeadlineInput {
  /** Starting date in ISO 8601 format (YYYY-MM-DD). */
  start: string;
  /** Number of days to count (must be ≥ 0). */
  days: number;
  /**
   * Counting mode.
   * - `"court"`: skips weekends and US federal holidays.
   * - `"calendar"`: counts every calendar day.
   * @default "calendar"
   */
  mode?: "court" | "calendar";
  /**
   * Direction to count from the start date.
   * @default "after"
   */
  direction?: "after" | "before";
  /**
   * Optional jurisdiction hint (reserved for future use; currently ignored
   * — all computations use the US federal holiday calendar).
   */
  jurisdiction?: string;
}

/** Counts of days skipped during court-mode computation. */
export interface SkippedDays {
  weekends: number;
  holidays: string[];
}

/** Result returned by computeDeadline. */
export interface DeadlineResult {
  verdict: Verdict;
  /** Resolved deadline date in ISO 8601 format (YYYY-MM-DD). */
  deadline: string;
  /** Normalised start date as used in computation (ISO 8601). */
  startDate: string;
  daysRequested: number;
  mode: "court" | "calendar";
  direction: "after" | "before";
  skipped: SkippedDays;
  certificate: string;
  latencyMs: number;
}
