export type Verdict = "PASS" | "FLAG" | "BLOCK";

/** Category of finding: unit confusion, overdose, or known drug interaction. */
export type FindingType = "unit" | "dose" | "interaction";

/** Clinical severity of a finding. */
export type Severity = "low" | "moderate" | "major" | "contraindicated";

/** The minimum severity that triggers a BLOCK verdict. */
export type BlockSeverity = "moderate" | "major" | "contraindicated";

export interface MedicationInput {
  /** Drug name — generic or brand (brand names are resolved to generics internally). */
  name: string;
  /** Dose per administration. */
  dose?: number;
  /** Unit string (e.g. "mg", "mcg", "ml"). */
  unit?: string;
  /** Route of administration (informational; not currently checked). */
  route?: string;
  /** Number of administrations per day. */
  frequencyPerDay?: number;
}

export interface PatientInput {
  /** Patient weight in kilograms (used for weight-based dose range checks). */
  weightKg?: number;
  /** Patient age in years (reserved; not currently used in checks). */
  ageYears?: number;
}

export interface PolicyInput {
  /**
   * Minimum finding severity that results in a BLOCK verdict.
   * Defaults to "major".
   */
  blockSeverityAtOrAbove?: BlockSeverity;
}

export interface RxCheckInput {
  /** List of medications to evaluate (order does not matter). */
  medications: MedicationInput[];
  /** Optional patient context for weight-based dose range checks. */
  patient?: PatientInput;
  /** Optional enforcement policy. */
  policy?: PolicyInput;
}

export interface RxFinding {
  /** Type of safety finding. */
  type: FindingType;
  /** Clinical severity of this finding. */
  severity: Severity;
  /** Generic name(s) of the drug(s) involved. */
  drugs: string[];
  /** Human-readable description of the concern. */
  message: string;
  /** Optional primary literature or FDA label reference. */
  reference?: string;
}

export interface RxCheckResult {
  /** PASS — no concerning findings; FLAG — findings below block threshold; BLOCK — block threshold met. */
  verdict: Verdict;
  /** All detected safety findings. */
  findings: RxFinding[];
  /** Count of findings per severity level. */
  counts: Record<Severity, number>;
  /**
   * Tamper-evident certificate: `sha256:<hex>` binding the input drug list,
   * verdict, finding count, and timestamp.
   */
  certificate: string;
  /** Wall-clock milliseconds the check took. */
  latencyMs: number;
  /** Mandatory disclaimer — this result is informational, not medical advice. */
  disclaimer: string;
}
