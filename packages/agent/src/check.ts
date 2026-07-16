import { generateCertificate } from "./certificate.js";
import type {
  ArgSchema,
  CrossFieldRule,
  FieldSpec,
  Policy,
  Severity,
  ToolArgsInput,
  ToolArgsResult,
  Verdict,
  Violation,
  ViolationCounts,
} from "./types.js";

// ---------------------------------------------------------------------------
// Severity ordering
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function severityAtOrAbove(s: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER[s] >= SEVERITY_ORDER[threshold];
}

// ---------------------------------------------------------------------------
// Violation helpers
// ---------------------------------------------------------------------------

function makeViolation(
  path: string,
  rule: string,
  severity: Severity,
  message: string,
  extra?: { expected?: unknown; actual?: unknown }
): Violation {
  const v: Violation = { path, rule, severity, message };
  if (extra !== undefined) {
    if (extra.expected !== undefined) {
      v.expected = extra.expected;
    }
    if (extra.actual !== undefined) {
      v.actual = extra.actual;
    }
  }
  return v;
}

function tallyCounts(violations: Violation[]): ViolationCounts {
  const counts: ViolationCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const v of violations) {
    counts[v.severity]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Deep path resolution (dot-separated, single level supported for MVP)
// ---------------------------------------------------------------------------

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Per-field checks
// ---------------------------------------------------------------------------

function checkField(
  path: string,
  value: unknown,
  spec: FieldSpec,
  violations: Violation[]
): void {
  // Null check
  if (value === null) {
    if (spec.nullable !== true) {
      violations.push(
        makeViolation(
          path,
          "null",
          "high",
          `Field "${path}" is null but not marked nullable.`,
          { expected: "non-null", actual: null }
        )
      );
    }
    // A null value passes all other constraints (cannot validate type/range/etc)
    return;
  }

  // Type check
  const typeViolation = checkType(path, value, spec.type);
  if (typeViolation !== null) {
    violations.push(typeViolation);
    // Skip further checks on type mismatch — they'd be noise
    return;
  }

  // Enum check
  if (spec.enum !== undefined && spec.enum.length > 0) {
    const allowed = spec.enum as Array<string | number>;
    if (!allowed.includes(value as string | number)) {
      violations.push(
        makeViolation(
          path,
          "enum",
          "high",
          `Field "${path}" value ${JSON.stringify(value)} is not in the allowed enum.`,
          { expected: allowed, actual: value }
        )
      );
    }
  }

  // Numeric checks
  if (
    (spec.type === "number" || spec.type === "integer") &&
    typeof value === "number"
  ) {
    if (spec.min !== undefined && value < spec.min) {
      violations.push(
        makeViolation(
          path,
          "min",
          "medium",
          `Field "${path}" value ${value} is below minimum ${spec.min}.`,
          { expected: `>= ${spec.min}`, actual: value }
        )
      );
    }
    if (spec.max !== undefined && value > spec.max) {
      violations.push(
        makeViolation(
          path,
          "max",
          "medium",
          `Field "${path}" value ${value} exceeds maximum ${spec.max}.`,
          { expected: `<= ${spec.max}`, actual: value }
        )
      );
    }

    // Unit coercion heuristics
    if (spec.unit !== undefined) {
      checkUnitHeuristics(path, value, spec.unit, violations);
    }
  }

  // String checks
  if (spec.type === "string" && typeof value === "string") {
    if (spec.minLength !== undefined && value.length < spec.minLength) {
      violations.push(
        makeViolation(
          path,
          "minLength",
          "medium",
          `Field "${path}" length ${value.length} is below minimum ${spec.minLength}.`,
          { expected: `length >= ${spec.minLength}`, actual: value.length }
        )
      );
    }
    if (spec.maxLength !== undefined && value.length > spec.maxLength) {
      violations.push(
        makeViolation(
          path,
          "maxLength",
          "medium",
          `Field "${path}" length ${value.length} exceeds maximum ${spec.maxLength}.`,
          { expected: `length <= ${spec.maxLength}`, actual: value.length }
        )
      );
    }
    if (spec.pattern !== undefined) {
      let re: RegExp;
      try {
        re = new RegExp(spec.pattern);
      } catch {
        violations.push(
          makeViolation(
            path,
            "pattern",
            "low",
            `Field "${path}" has an invalid pattern regex: ${spec.pattern}.`
          )
        );
        return;
      }
      if (!re.test(value)) {
        violations.push(
          makeViolation(
            path,
            "pattern",
            "medium",
            `Field "${path}" value ${JSON.stringify(value)} does not match pattern ${spec.pattern}.`,
            { expected: spec.pattern, actual: value }
          )
        );
      }
    }
  }
}

function checkType(
  path: string,
  value: unknown,
  type: FieldSpec["type"]
): Violation | null {
  switch (type) {
    case "string":
      if (typeof value !== "string") {
        return makeViolation(
          path,
          "type",
          "high",
          `Field "${path}" must be a string, got ${typeof value}.`,
          { expected: "string", actual: typeof value }
        );
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        return makeViolation(
          path,
          "type",
          "high",
          `Field "${path}" must be a boolean, got ${typeof value}.`,
          { expected: "boolean", actual: typeof value }
        );
      }
      break;
    case "number":
      if (typeof value !== "number" || !isFinite(value)) {
        return makeViolation(
          path,
          "type",
          "high",
          `Field "${path}" must be a finite number, got ${typeof value}.`,
          { expected: "number", actual: typeof value }
        );
      }
      break;
    case "integer":
      if (typeof value !== "number" || !isFinite(value) || !Number.isInteger(value)) {
        return makeViolation(
          path,
          "type",
          "high",
          `Field "${path}" must be an integer, got ${JSON.stringify(value)}.`,
          { expected: "integer", actual: value }
        );
      }
      break;
    case "array":
      if (!Array.isArray(value)) {
        return makeViolation(
          path,
          "type",
          "high",
          `Field "${path}" must be an array, got ${typeof value}.`,
          { expected: "array", actual: typeof value }
        );
      }
      break;
    case "object":
      if (
        typeof value !== "object" ||
        Array.isArray(value) ||
        value === null
      ) {
        return makeViolation(
          path,
          "type",
          "high",
          `Field "${path}" must be a plain object, got ${Array.isArray(value) ? "array" : typeof value}.`,
          { expected: "object", actual: Array.isArray(value) ? "array" : typeof value }
        );
      }
      break;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Unit coercion heuristics
// ---------------------------------------------------------------------------

function checkUnitHeuristics(
  path: string,
  value: number,
  unit: NonNullable<FieldSpec["unit"]>,
  violations: Violation[]
): void {
  switch (unit) {
    case "cents": {
      // A cents field should always be an integer.
      // A fractional value strongly suggests the caller passed dollars.
      if (!Number.isInteger(value)) {
        violations.push(
          makeViolation(
            path,
            "unit-coercion",
            "medium",
            `Field "${path}" has unit "cents" but value ${value} is fractional — likely passed in dollars instead of cents.`,
            { expected: "integer cents", actual: value }
          )
        );
      }
      // A very small positive value (0 < x < 1) is almost certainly in dollars.
      if (value > 0 && value < 1) {
        violations.push(
          makeViolation(
            path,
            "unit-coercion",
            "medium",
            `Field "${path}" has unit "cents" but value ${value} is between 0 and 1 — likely a dollar amount.`,
            { expected: "integer cents", actual: value }
          )
        );
      }
      break;
    }
    case "usd": {
      // A large integer that looks like it might have been provided in cents
      // (the classic Stripe dollars-vs-cents bug: passing 1000 meaning "$1000"
      // when the API already multiplied by 100, ending up as $10).
      // Heuristic: integer value >= 10000 is suspicious (> $10,000).
      if (Number.isInteger(value) && value >= 10000) {
        violations.push(
          makeViolation(
            path,
            "unit-coercion",
            "medium",
            `Field "${path}" has unit "usd" but value ${value} is suspiciously large (>= 10000) — may have been passed in cents instead of dollars.`,
            { expected: "dollar amount", actual: value }
          )
        );
      }
      break;
    }
    case "bps": {
      // Basis points: 10000 bps = 100%. A value > 10000 is > 100%, which is
      // usually a bug (e.g. passing percent instead of bps).
      if (value > 10000) {
        violations.push(
          makeViolation(
            path,
            "unit-coercion",
            "medium",
            `Field "${path}" has unit "bps" but value ${value} exceeds 10000 bps (100%) — may be in the wrong unit.`,
            { expected: "<= 10000 bps", actual: value }
          )
        );
      }
      break;
    }
    case "percent": {
      // Percent: if value > 100, it likely was accidentally expressed in bps or
      // some other larger unit.
      if (value > 100) {
        violations.push(
          makeViolation(
            path,
            "unit-coercion",
            "medium",
            `Field "${path}" has unit "percent" but value ${value} exceeds 100 — may be in basis points or the wrong unit.`,
            { expected: "<= 100 percent", actual: value }
          )
        );
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Cross-field rule checks
// ---------------------------------------------------------------------------

function compareValues(
  leftVal: unknown,
  op: CrossFieldRule["op"],
  rightVal: unknown
): boolean {
  if (typeof leftVal !== "number" && typeof leftVal !== "string") return true; // can't compare
  if (typeof rightVal !== "number" && typeof rightVal !== "string") return true;
  if (typeof leftVal !== typeof rightVal) return true; // mixed types — skip

  if (typeof leftVal === "number" && typeof rightVal === "number") {
    switch (op) {
      case "lte": return leftVal <= rightVal;
      case "gte": return leftVal >= rightVal;
      case "lt":  return leftVal < rightVal;
      case "gt":  return leftVal > rightVal;
      case "eq":  return leftVal === rightVal;
      case "neq": return leftVal !== rightVal;
    }
  }
  if (typeof leftVal === "string" && typeof rightVal === "string") {
    switch (op) {
      case "lte": return leftVal <= rightVal;
      case "gte": return leftVal >= rightVal;
      case "lt":  return leftVal < rightVal;
      case "gt":  return leftVal > rightVal;
      case "eq":  return leftVal === rightVal;
      case "neq": return leftVal !== rightVal;
    }
  }
  return true;
}

function checkCrossFieldRules(
  args: Record<string, unknown>,
  rules: CrossFieldRule[],
  violations: Violation[]
): void {
  for (const rule of rules) {
    const leftVal = resolvePath(args, rule.left);
    const rightVal =
      typeof rule.right === "object" && "const" in rule.right
        ? rule.right.const
        : resolvePath(args, rule.right as string);

    // If either side is missing/undefined, skip the rule (required-field check handles missing)
    if (leftVal === undefined || rightVal === undefined) continue;

    const ok = compareValues(leftVal, rule.op, rightVal);
    if (!ok) {
      const rightDesc =
        typeof rule.right === "object" && "const" in rule.right
          ? String(rule.right.const)
          : rule.right;
      violations.push(
        makeViolation(
          `__cross__.${rule.left}`,
          `cross-field.${rule.op}`,
          "high",
          rule.message ??
            `Cross-field rule violated: ${rule.left} ${rule.op} ${rightDesc} (got ${JSON.stringify(leftVal)} vs ${JSON.stringify(rightVal)}).`,
          { expected: `${rule.left} ${rule.op} ${rightDesc}`, actual: `${rule.left}=${JSON.stringify(leftVal)}, right=${JSON.stringify(rightVal)}` }
        )
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Verdict derivation
// ---------------------------------------------------------------------------

function deriveVerdict(
  violations: Violation[],
  policy: Policy
): Verdict {
  const mode = policy.mode ?? "block";
  const threshold: Severity = policy.blockSeverityAtOrAbove ?? "high";

  if (mode === "audit") return "PASS";

  const hasBlock = violations.some((v) => severityAtOrAbove(v.severity, threshold));
  if (hasBlock) {
    return mode === "flag" ? "FLAG" : "BLOCK";
  }
  return violations.length > 0 ? "FLAG" : "PASS";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a proposed tool/function call's arguments against a caller-supplied
 * schema and optional business-policy. Fully deterministic and offline.
 */
export function checkToolArgs(input: ToolArgsInput): ToolArgsResult {
  const t0 = Date.now();
  const { args, schema, policy = {} } = input;
  const violations: Violation[] = [];

  const declaredFields = new Set(Object.keys(schema.fields));

  // 1. Required-field presence + per-field validation
  for (const [fieldName, spec] of Object.entries(schema.fields)) {
    const value = args[fieldName];

    if (value === undefined) {
      if (spec.required === true) {
        violations.push(
          makeViolation(
            fieldName,
            "required",
            "critical",
            `Required field "${fieldName}" is missing.`
          )
        );
      }
      // No further checks for absent optional fields
      continue;
    }

    checkField(fieldName, value, spec, violations);
  }

  // 2. Unknown argument check
  if (schema.allowUnknown !== true) {
    for (const key of Object.keys(args)) {
      if (!declaredFields.has(key)) {
        violations.push(
          makeViolation(
            key,
            "unknown",
            "low",
            `Argument "${key}" is not declared in the schema.`,
            { expected: "declared field", actual: key }
          )
        );
      }
    }
  }

  // 3. Cross-field rules
  if (schema.rules !== undefined && schema.rules.length > 0) {
    checkCrossFieldRules(args, schema.rules, violations);
  }

  // 4. Verdict
  const verdict = deriveVerdict(violations, policy);

  // 5. Counts
  const counts = tallyCounts(violations);

  // 6. Certificate
  const toolName = input.tool ?? "";
  const subject = `${toolName}:${JSON.stringify(args)}:${JSON.stringify(schema)}`;
  const timestamp = t0;
  const certificate = generateCertificate(subject, verdict, violations.length, timestamp);

  const latencyMs = Date.now() - t0;

  return { verdict, violations, counts, certificate, latencyMs };
}
