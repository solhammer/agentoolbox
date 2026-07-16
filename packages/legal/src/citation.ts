import { generateCertificate } from "./certificate.js";
import { REPORTER_SET } from "./data/reporters.js";
import type {
  CitationEntry,
  CitationInput,
  CitationResult,
  QuoteCheck,
  Verdict,
} from "./types.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Earliest plausible year for a US case citation (founding-era courts). */
const MIN_YEAR = 1754;

/**
 * Current year ceiling.  Updated at module load; deterministic within one run.
 */
const MAX_YEAR = new Date().getFullYear();

/**
 * Regex for a US case citation of the form:
 *   <volume:digits> <reporter:text> <page:digits> (<year:4-digits>)
 *
 * The reporter group uses greedy matching so that multi-word reporters such as
 * "F. Supp. 2d" are captured in full, leaving only the final number before the
 * parenthesised year as the page.
 */
const CITATION_RE = /^(\d+)\s+(.+)\s+(\d+)\s*\(\s*(\d{4})\s*\)$/;

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Normalise text for the quote-fidelity substring search. */
function normaliseText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Classify an issue string as "hard" (→ BLOCK) or "soft" (→ FLAG).
 * Any issue not explicitly soft is treated as hard.
 */
function isHardIssue(issue: string): boolean {
  return !issue.startsWith("unknown reporter");
}

/** Validate a single raw citation string and return a CitationEntry. */
function validateOne(raw: string): CitationEntry {
  const trimmed = raw.trim();
  const m = CITATION_RE.exec(trimmed);

  if (m === null) {
    return {
      raw,
      valid: false,
      issues: ["malformed citation structure: expected '<volume> <reporter> <page> (<year>)'"],
    };
  }

  const volumeStr = m[1];
  const reporterStr = m[2];
  const pageStr = m[3];
  const yearStr = m[4];

  // Guards satisfy noUncheckedIndexedAccess; regex guarantees they match.
  if (
    volumeStr === undefined ||
    reporterStr === undefined ||
    pageStr === undefined ||
    yearStr === undefined
  ) {
    return {
      raw,
      valid: false,
      issues: ["malformed citation structure: could not extract fields"],
    };
  }

  const volume = parseInt(volumeStr, 10);
  const page = parseInt(pageStr, 10);
  const year = parseInt(yearStr, 10);
  const reporter = reporterStr.trim();

  const issues: string[] = [];

  // Year plausibility check (hard issue)
  if (year < MIN_YEAR || year > MAX_YEAR) {
    issues.push(
      `implausible year: ${year} is outside the valid range ${MIN_YEAR}–${MAX_YEAR}`
    );
  }

  // Reporter validation (soft issue — FLAG if unknown but otherwise well-formed)
  if (!REPORTER_SET.has(reporter)) {
    issues.push(`unknown reporter: "${reporter}" is not in the known reporter table`);
  }

  if (issues.length > 0) {
    return {
      raw,
      parsed: { volume, reporter, page, year },
      valid: false,
      issues,
    };
  }

  return {
    raw,
    parsed: { volume, reporter, page, year },
    valid: true,
    issues: [],
  };
}

/** Run a quote-fidelity check (normalised substring match). */
function checkQuote(sourceText: string, quote: string): QuoteCheck {
  const normSource = normaliseText(sourceText);
  const normQuote = normaliseText(quote);
  if (normQuote.length === 0) {
    return { found: false, message: "quote is empty after normalisation" };
  }
  if (normSource.includes(normQuote)) {
    return { found: true, message: "quote found in source text" };
  }
  return {
    found: false,
    message: "quote not found in source text — possible fabricated or misquoted passage",
  };
}

// ── Verdict logic ────────────────────────────────────────────────────────────

/**
 * Determine the overall verdict from citation entries and an optional quote check.
 *
 * Rules (in priority order):
 *  1. Any hard-invalid citation (malformed structure, implausible year)  → BLOCK
 *  2. A missing/unfound quote                                            → BLOCK
 *  3. Any soft-invalid citation (unknown but well-formed reporter)       → FLAG
 *  4. All valid                                                          → PASS
 */
function deriveVerdict(entries: CitationEntry[], qc: QuoteCheck | undefined): Verdict {
  let hasHard = false;
  let hasSoft = false;

  for (const e of entries) {
    if (!e.valid) {
      for (const issue of e.issues) {
        if (isHardIssue(issue)) {
          hasHard = true;
        } else {
          hasSoft = true;
        }
      }
    }
  }

  if (hasHard) return "BLOCK";
  if (qc !== undefined && !qc.found) return "BLOCK";
  if (hasSoft) return "FLAG";
  return "PASS";
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates one or more US case citations and optionally checks quote fidelity.
 *
 * Validates citation format `"<volume> <reporter> <page> (<year>)"` against:
 *  - A bundled table of known reporter abbreviations
 *  - Plausibility bounds on the year (1754 – current year)
 *  - Structural completeness (volume, reporter, page, year all present)
 *
 * When both `sourceText` and `quote` are provided, runs a normalised-substring
 * quote-fidelity check and flags fabricated or misquoted passages.
 *
 * @throws {Error} if neither `citation` nor `citations` is provided.
 */
export function checkCitation(input: CitationInput): CitationResult {
  const start = Date.now();

  const raws: string[] = [];
  if (input.citation !== undefined) raws.push(input.citation);
  if (input.citations !== undefined) raws.push(...input.citations);

  if (raws.length === 0) {
    throw new Error("checkCitation: provide `citation` or `citations`.");
  }

  // Validate each citation
  const entries: CitationEntry[] = raws.map(validateOne);

  // Quote-fidelity check (only when both sourceText and quote are supplied)
  let qc: QuoteCheck | undefined;
  if (input.sourceText !== undefined && input.quote !== undefined) {
    qc = checkQuote(input.sourceText, input.quote);
  }

  const verdict = deriveVerdict(entries, qc);

  const invalid = entries.filter((e) => !e.valid).length;

  const subject = JSON.stringify(raws);
  const timestamp = Date.now();
  const certificate = generateCertificate(subject, verdict, invalid, timestamp);

  return {
    verdict,
    citations: entries,
    ...(qc !== undefined ? { quoteCheck: qc } : {}),
    counts: { total: raws.length, invalid },
    certificate,
    latencyMs: Date.now() - start,
  };
}
