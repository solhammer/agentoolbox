/** Top-level verdict for the tool-args check. */
export type Verdict = "PASS" | "FLAG" | "BLOCK";

/** Violation severity levels, ordered low → critical. */
export type Severity = "low" | "medium" | "high" | "critical";

/** Supported field value types. */
export type FieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object";

/**
 * Unit hint for numeric fields. Used to detect common coercion bugs
 * (e.g. passing dollars where cents are expected, or vice-versa).
 */
export type FieldUnit = "usd" | "cents" | "percent" | "bps";

/** Per-field validation specification. */
export interface FieldSpec {
  type: FieldType;
  /** Field must be present (and non-null when nullable is false/absent). */
  required?: boolean;
  /** Allow null values for this field. */
  nullable?: boolean;
  /** Allowed discrete values. */
  enum?: Array<string | number>;
  /** Inclusive minimum for numbers. */
  min?: number;
  /** Inclusive maximum for numbers. */
  max?: number;
  /** Minimum string length (chars). */
  minLength?: number;
  /** Maximum string length (chars). */
  maxLength?: number;
  /** Regex pattern the string must fully match. */
  pattern?: string;
  /** Unit hint — enables coercion-bug heuristics. */
  unit?: FieldUnit;
}

/** A cross-field comparison rule. */
export interface CrossFieldRule {
  /** Comparison operator. */
  op: "lte" | "gte" | "lt" | "gt" | "eq" | "neq";
  /** Path of the left-hand field (dot-separated). */
  left: string;
  /** Path of the right-hand field, or an inline constant. */
  right: string | { const: number | string };
  /** Human-readable violation message. */
  message?: string;
}

/** Full argument schema. */
export interface ArgSchema {
  /** Per-field specs, keyed by field name. */
  fields: Record<string, FieldSpec>;
  /** Allow arguments not declared in `fields`. Defaults to false. */
  allowUnknown?: boolean;
  /** Cross-field comparison rules. */
  rules?: CrossFieldRule[];
}

/** Policy overrides for how violations map to verdicts. */
export interface Policy {
  /**
   * - "block" (default): violations ≥ threshold → BLOCK, others → FLAG
   * - "flag": downgrade any BLOCK → FLAG (never block)
   * - "audit": always return PASS, but still list violations
   */
  mode?: "block" | "flag" | "audit";
  /** Minimum severity that triggers BLOCK. Default "high". */
  blockSeverityAtOrAbove?: Severity;
}

/** Input to `checkToolArgs`. */
export interface ToolArgsInput {
  /** Optional name of the tool being called (included in certificate subject). */
  tool?: string;
  /** Proposed argument map from the caller. */
  args: Record<string, unknown>;
  /** Schema to validate against. */
  schema: ArgSchema;
  /** Optional policy overrides. */
  policy?: Policy;
}

/** A single detected violation. */
export interface Violation {
  /** Dot-separated path to the offending field (or "__cross__.<left>" for cross-field). */
  path: string;
  /** Short rule code (e.g. "required", "type", "enum", "min", "pattern"). */
  rule: string;
  severity: Severity;
  message: string;
  /** Expected value/constraint. */
  expected?: unknown;
  /** Actual value found. */
  actual?: unknown;
}

/** Violation counts by severity. */
export type ViolationCounts = Record<Severity, number>;

/** Output of `checkToolArgs`. */
export interface ToolArgsResult {
  verdict: Verdict;
  violations: Violation[];
  counts: ViolationCounts;
  /** Tamper-evident certificate: `sha256:<hex>` binding args+schema to the verdict. */
  certificate: string;
  latencyMs: number;
}
