/** PASS — no findings; FLAG — findings below threshold; BLOCK — finding at or above threshold. */
export type Verdict = "PASS" | "FLAG" | "BLOCK";

/** Severity level of a finding. */
export type Severity = "low" | "medium" | "high" | "critical";

/** Document format accepted by checkInfraPlan. */
export type Format = "terraform" | "iam" | "k8s";

/** A single policy violation found during analysis. */
export interface Finding {
  /** Stable rule identifier (e.g. "TF-SEC-001"). */
  ruleId: string;
  /** How severe the violation is. */
  severity: Severity;
  /** The resource or statement path where the violation was detected. */
  resource: string;
  /** Human-readable description of the violation. */
  message: string;
  /** Compliance framework that defines this rule (e.g. "CIS AWS Foundations Benchmark"). */
  framework?: string;
}

/** Policy overrides for a single checkInfraPlan call. */
export interface InfraPlanPolicy {
  /**
   * Findings at or above this severity cause a BLOCK verdict.
   * Findings below this severity cause a FLAG verdict (if any exist).
   * Defaults to "high" when not specified.
   */
  blockSeverityAtOrAbove?: Severity;
}

/** Input to checkInfraPlan. */
export interface InfraPlanInput {
  /** Document format: "terraform" (terraform show -json output), "iam" (AWS IAM policy JSON), "k8s" (Kubernetes manifest JSON). */
  format: Format;
  /** Already-parsed JSON document to analyse. */
  document: unknown;
  /** Optional policy overrides. */
  policy?: InfraPlanPolicy;
}

/** Result returned by checkInfraPlan. */
export interface InfraPlanResult {
  /** Overall verdict. */
  verdict: Verdict;
  /** All findings discovered, ordered by detection sequence. */
  findings: Finding[];
  /** Finding count broken down by severity. */
  counts: Record<Severity, number>;
  /**
   * Tamper-evident certificate binding the format, document hash, verdict,
   * finding count, and timestamp: `sha256:<hex>`.
   */
  certificate: string;
  /** Wall-clock milliseconds taken by the analysis. */
  latencyMs: number;
}
