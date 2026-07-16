/** Validation policy configuration */
export interface SchemaPolicy {
  /** "block" (default): errors produce BLOCK verdict.
   *  "flag":  errors produce FLAG verdict.
   *  "audit": errors produce PASS verdict but errors are still listed. */
  mode?: "block" | "flag" | "audit";
}

/** Input to the validateSchema function */
export interface SchemaInput {
  /** The data value to validate */
  data: unknown;
  /** A JSON Schema (Draft-07 subset) object */
  schema: Record<string, unknown>;
  /** Optional policy controlling verdict severity */
  policy?: SchemaPolicy;
}

/** A single validation error */
export interface SchemaError {
  /** JSON Pointer path to the failing node, e.g. "/items/0/name" */
  path: string;
  /** The failing keyword, e.g. "type", "required", "minimum" */
  keyword: string;
  /** Human-readable description */
  message: string;
  /** Expected value / constraint (when applicable) */
  expected?: unknown;
  /** Actual value that failed (when applicable) */
  actual?: unknown;
}

/** The verdict string */
export type Verdict = "PASS" | "FLAG" | "BLOCK";

/** Result returned by validateSchema */
export interface SchemaResult {
  /** Validation verdict */
  verdict: Verdict;
  /** True when no errors were found */
  valid: boolean;
  /** List of validation errors (empty when valid) */
  errors: SchemaError[];
  /** Aggregate counts */
  counts: { errors: number };
  /** Tamper-evident certificate binding data+schema to this result */
  certificate: string;
  /** Wall-clock time taken in milliseconds */
  latencyMs: number;
}
