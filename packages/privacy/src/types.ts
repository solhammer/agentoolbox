export type Verdict = "PASS" | "FLAG" | "BLOCK";

/** Regulatory family a detected entity belongs to. */
export type Category = "PII" | "PHI" | "PCI";

export type Severity = "low" | "medium" | "high" | "critical";

/**
 * How a verdict is enforced:
 * - `block`  — return the raw verdict (default)
 * - `flag`   — downgrade any BLOCK to FLAG (advisory only)
 * - `audit`  — never blocks; verdict is always PASS, but entities are still reported
 */
export type EnforcementMode = "block" | "flag" | "audit";

export interface PiiEntity {
  /** Detector type, e.g. `credit_card`, `us_ssn`, `iban`, `email`. */
  type: string;
  category: Category;
  severity: Severity;
  /**
   * Format-preserving masked preview (e.g. `***-**-****`).
   * The raw value is NEVER returned to the caller.
   */
  match: string;
  /** Character offset (inclusive) of the match within the input text. */
  start: number;
  /** Character offset (exclusive) of the end of the match. */
  end: number;
  /** 1-based line number of the match. */
  line: number;
  /** True when the value passed a checksum (Luhn/ISO-7064/mod-11) or strong structural rule. */
  validated: boolean;
  /** Detector confidence, 0..1. */
  confidence: number;
  /** ISO-3166-ish jurisdiction for jurisdiction-specific identifiers (e.g. `US`, `UK`, `CA`). */
  jurisdiction?: string;
}

export interface PiiPolicy {
  /** Enforcement mode. Default: `block`. */
  mode?: EnforcementMode;
  /** Minimum severity that yields a BLOCK. Default: `high`. */
  blockSeverityAtOrAbove?: Severity;
  /** Entity types to ignore entirely (e.g. `["ip_address"]`). */
  allowTypes?: string[];
  /** Restrict jurisdiction-specific detectors to these jurisdictions (e.g. `["US"]`). */
  jurisdictions?: string[];
  /** Whether to return `redactedText`. Default: `true`. */
  redact?: boolean;
}

export interface PiiScanInput {
  /** The text to scan for personal data. */
  text: string;
  /** Optional source identifier, echoed back in the response. */
  filename?: string;
  /** Optional enforcement policy. */
  policy?: PiiPolicy;
}

export interface PiiScanResult {
  verdict: Verdict;
  /** True when no personal data was detected. */
  safe: boolean;
  /** 0..100 — the score of the most sensitive entity found (0 when none). */
  score: number;
  /** Unique regulatory categories present in the text. */
  categories: Category[];
  totalFindings: number;
  counts: Record<Severity, number>;
  entities: PiiEntity[];
  /** Input with every detected entity replaced by `[REDACTED_<TYPE>]`. Omitted when `policy.redact === false`. */
  redactedText?: string;
  /** Tamper-evident certificate: `sha256:<hex>` bound to the input hash, verdict, finding count, and timestamp. */
  certificate: string;
  /** The enforcement mode actually applied. */
  enforcementMode: EnforcementMode;
  /** Echoed from the request when provided. */
  filename?: string;
  latencyMs: number;
}
