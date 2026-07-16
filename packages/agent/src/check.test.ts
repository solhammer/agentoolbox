import { describe, expect, it } from "vitest";
import { checkToolArgs } from "./check.js";
import { generateCertificate, sha256Hex } from "./certificate.js";
import type { ArgSchema, ToolArgsInput } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const simpleSchema: ArgSchema = {
  fields: {
    name: { type: "string", required: true },
    amount: { type: "number", required: true, min: 0, max: 1000 },
    status: { type: "string", enum: ["active", "inactive"] },
  },
};

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe("required-field presence", () => {
  it("missing required field → BLOCK with critical violation", () => {
    const result = checkToolArgs({
      args: { amount: 100 }, // missing "name"
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("BLOCK");
    const v = result.violations.find((x) => x.rule === "required");
    expect(v).toBeDefined();
    expect(v?.path).toBe("name");
    expect(v?.severity).toBe("critical");
    expect(result.counts.critical).toBeGreaterThan(0);
  });

  it("all required fields present → no required violation", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100 },
      schema: simpleSchema,
    });
    expect(result.violations.filter((v) => v.rule === "required")).toHaveLength(0);
  });

  it("optional field absent → no violation", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 50 },
      schema: simpleSchema,
    });
    expect(result.violations.filter((v) => v.path === "status")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Type checks
// ---------------------------------------------------------------------------

describe("type validation", () => {
  it("wrong type on required field → BLOCK", () => {
    const result = checkToolArgs({
      args: { name: 42, amount: 100 }, // name should be string
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("BLOCK");
    const v = result.violations.find((x) => x.rule === "type" && x.path === "name");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("high");
  });

  it("boolean field type mismatch → BLOCK", () => {
    const schema: ArgSchema = {
      fields: { active: { type: "boolean", required: true } },
    };
    const result = checkToolArgs({ args: { active: "yes" }, schema });
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations.some((v) => v.rule === "type")).toBe(true);
  });

  it("integer field with float → BLOCK", () => {
    const schema: ArgSchema = {
      fields: { count: { type: "integer", required: true } },
    };
    const result = checkToolArgs({ args: { count: 3.5 }, schema });
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations.some((v) => v.rule === "type")).toBe(true);
  });

  it("array field with non-array → BLOCK", () => {
    const schema: ArgSchema = {
      fields: { items: { type: "array", required: true } },
    };
    const result = checkToolArgs({ args: { items: "not-an-array" }, schema });
    expect(result.verdict).toBe("BLOCK");
  });

  it("object field with array → BLOCK", () => {
    const schema: ArgSchema = {
      fields: { meta: { type: "object", required: true } },
    };
    const result = checkToolArgs({ args: { meta: [] }, schema });
    expect(result.verdict).toBe("BLOCK");
  });

  it("null on non-nullable field → BLOCK", () => {
    const schema: ArgSchema = {
      fields: { name: { type: "string", required: true, nullable: false } },
    };
    const result = checkToolArgs({ args: { name: null }, schema });
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations.some((v) => v.rule === "null")).toBe(true);
  });

  it("null on nullable field → no null violation", () => {
    const schema: ArgSchema = {
      fields: { name: { type: "string", required: true, nullable: true } },
    };
    const result = checkToolArgs({ args: { name: null }, schema });
    expect(result.violations.filter((v) => v.rule === "null")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Enum checks
// ---------------------------------------------------------------------------

describe("enum validation", () => {
  it("value not in enum → BLOCK", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100, status: "pending" }, // "pending" not in enum
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("BLOCK");
    const v = result.violations.find((x) => x.rule === "enum");
    expect(v).toBeDefined();
    expect(v?.path).toBe("status");
    expect(v?.severity).toBe("high");
  });

  it("value in enum → no enum violation", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100, status: "active" },
      schema: simpleSchema,
    });
    expect(result.violations.filter((v) => v.rule === "enum")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Numeric range checks
// ---------------------------------------------------------------------------

describe("numeric range validation", () => {
  it("value below min → FLAG (medium severity)", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: -5 },
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "min");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("medium");
  });

  it("value above max → FLAG (medium severity)", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 9999 },
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "max");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("medium");
  });

  it("value within range → no range violation", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 500 },
      schema: simpleSchema,
    });
    expect(result.violations.filter((v) => v.rule === "min" || v.rule === "max")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// String constraint checks
// ---------------------------------------------------------------------------

describe("string constraint validation", () => {
  it("string below minLength → FLAG", () => {
    const schema: ArgSchema = {
      fields: { code: { type: "string", required: true, minLength: 5 } },
    };
    const result = checkToolArgs({ args: { code: "abc" }, schema });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "minLength");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("medium");
  });

  it("string above maxLength → FLAG", () => {
    const schema: ArgSchema = {
      fields: { code: { type: "string", required: true, maxLength: 3 } },
    };
    const result = checkToolArgs({ args: { code: "toolong" }, schema });
    expect(result.verdict).toBe("FLAG");
    expect(result.violations.some((v) => v.rule === "maxLength")).toBe(true);
  });

  it("string pattern fail → FLAG", () => {
    const schema: ArgSchema = {
      fields: { email: { type: "string", required: true, pattern: "^[^@]+@[^@]+\\.[^@]+$" } },
    };
    const result = checkToolArgs({ args: { email: "not-an-email" }, schema });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "pattern");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("medium");
  });

  it("string pattern pass → no pattern violation", () => {
    const schema: ArgSchema = {
      fields: { email: { type: "string", required: true, pattern: "^[^@]+@[^@]+\\.[^@]+$" } },
    };
    const result = checkToolArgs({ args: { email: "user@example.com" }, schema });
    expect(result.violations.filter((v) => v.rule === "pattern")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unknown argument checks
// ---------------------------------------------------------------------------

describe("unknown argument check", () => {
  it("unknown arg with allowUnknown:false (default) → FLAG (low severity)", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100, extraField: "surprise" },
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "unknown");
    expect(v).toBeDefined();
    expect(v?.path).toBe("extraField");
    expect(v?.severity).toBe("low");
  });

  it("unknown arg with allowUnknown:true → no unknown violation", () => {
    const schema: ArgSchema = { ...simpleSchema, allowUnknown: true };
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100, extraField: "ok" },
      schema,
    });
    expect(result.violations.filter((v) => v.rule === "unknown")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-field rules
// ---------------------------------------------------------------------------

describe("cross-field rules", () => {
  it("a <= b violation → BLOCK (high severity)", () => {
    const schema: ArgSchema = {
      fields: {
        start: { type: "number", required: true },
        end: { type: "number", required: true },
      },
      rules: [{ op: "lte", left: "start", right: "end", message: "start must be <= end" }],
    };
    // start=100 > end=50, violates lte rule
    const result = checkToolArgs({ args: { start: 100, end: 50 }, schema });
    expect(result.verdict).toBe("BLOCK");
    const v = result.violations.find((x) => x.rule === "cross-field.lte");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("high");
    expect(v?.message).toBe("start must be <= end");
  });

  it("a <= b satisfied → no cross-field violation", () => {
    const schema: ArgSchema = {
      fields: {
        start: { type: "number", required: true },
        end: { type: "number", required: true },
      },
      rules: [{ op: "lte", left: "start", right: "end" }],
    };
    const result = checkToolArgs({ args: { start: 10, end: 50 }, schema });
    expect(result.violations.filter((v) => v.rule.startsWith("cross-field"))).toHaveLength(0);
  });

  it("cross-field rule with const right value", () => {
    const schema: ArgSchema = {
      fields: { discount: { type: "number", required: true } },
      rules: [{ op: "lte", left: "discount", right: { const: 100 } }],
    };
    const result = checkToolArgs({ args: { discount: 150 }, schema });
    expect(result.verdict).toBe("BLOCK");
    expect(result.violations.some((v) => v.rule === "cross-field.lte")).toBe(true);
  });

  it("cross-field neq rule: eq violation → BLOCK", () => {
    const schema: ArgSchema = {
      fields: {
        source: { type: "string", required: true },
        dest: { type: "string", required: true },
      },
      rules: [{ op: "neq", left: "source", right: "dest", message: "source and dest must differ" }],
    };
    const result = checkToolArgs({ args: { source: "acc_123", dest: "acc_123" }, schema });
    expect(result.verdict).toBe("BLOCK");
  });

  it("cross-field rule skipped when field is missing", () => {
    const schema: ArgSchema = {
      fields: {
        start: { type: "number" },
        end: { type: "number" },
      },
      rules: [{ op: "lte", left: "start", right: "end" }],
    };
    // Neither field provided — rule should be skipped, not error
    const result = checkToolArgs({ args: {}, schema });
    expect(result.violations.filter((v) => v.rule.startsWith("cross-field"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unit coercion heuristics
// ---------------------------------------------------------------------------

describe("unit coercion heuristics", () => {
  it("cents field with fractional value → FLAG", () => {
    const schema: ArgSchema = {
      fields: { price: { type: "number", required: true, unit: "cents" } },
    };
    const result = checkToolArgs({ args: { price: 9.99 }, schema });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "unit-coercion");
    expect(v).toBeDefined();
    expect(v?.severity).toBe("medium");
  });

  it("cents field with integer value → no unit violation", () => {
    const schema: ArgSchema = {
      fields: { price: { type: "number", required: true, unit: "cents" } },
    };
    const result = checkToolArgs({ args: { price: 999 }, schema });
    expect(result.violations.filter((v) => v.rule === "unit-coercion")).toHaveLength(0);
  });

  it("usd field with suspiciously large integer → FLAG", () => {
    const schema: ArgSchema = {
      fields: { total: { type: "number", required: true, unit: "usd" } },
    };
    const result = checkToolArgs({ args: { total: 50000 }, schema });
    expect(result.verdict).toBe("FLAG");
    const v = result.violations.find((x) => x.rule === "unit-coercion");
    expect(v).toBeDefined();
  });

  it("usd field with normal dollar amount → no unit violation", () => {
    const schema: ArgSchema = {
      fields: { total: { type: "number", required: true, unit: "usd" } },
    };
    const result = checkToolArgs({ args: { total: 49.99 }, schema });
    expect(result.violations.filter((v) => v.rule === "unit-coercion")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fully valid args → PASS
// ---------------------------------------------------------------------------

describe("fully valid arguments", () => {
  it("all checks pass → PASS with zero violations", () => {
    const result = checkToolArgs({
      tool: "create_order",
      args: { name: "Alice", amount: 200, status: "active" },
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("PASS");
    expect(result.violations).toHaveLength(0);
    expect(result.counts.low).toBe(0);
    expect(result.counts.medium).toBe(0);
    expect(result.counts.high).toBe(0);
    expect(result.counts.critical).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Policy: audit mode
// ---------------------------------------------------------------------------

describe("policy: audit mode", () => {
  it("audit mode → always PASS but violations still listed", () => {
    const result = checkToolArgs({
      args: { amount: 100 }, // missing required "name"
      schema: simpleSchema,
      policy: { mode: "audit" },
    });
    expect(result.verdict).toBe("PASS");
    expect(result.violations.length).toBeGreaterThan(0);
    // Violations are still counted
    expect(result.counts.critical).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Policy: flag mode (downgrade BLOCK → FLAG)
// ---------------------------------------------------------------------------

describe("policy: flag mode", () => {
  it("flag mode downgrades BLOCK → FLAG", () => {
    const result = checkToolArgs({
      args: { amount: 100 }, // missing required "name" → normally BLOCK
      schema: simpleSchema,
      policy: { mode: "flag" },
    });
    expect(result.verdict).toBe("FLAG");
    // Violations are still present
    expect(result.violations.some((v) => v.rule === "required")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Policy: custom blockSeverityAtOrAbove
// ---------------------------------------------------------------------------

describe("policy: custom blockSeverityAtOrAbove", () => {
  it("threshold=critical: high violations → FLAG not BLOCK", () => {
    const result = checkToolArgs({
      args: { name: 42, amount: 100 }, // type mismatch = high
      schema: simpleSchema,
      policy: { blockSeverityAtOrAbove: "critical" },
    });
    // High is below critical threshold → should FLAG not BLOCK
    expect(result.verdict).toBe("FLAG");
  });

  it("threshold=medium: medium violations → BLOCK", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: -1 }, // below min = medium
      schema: simpleSchema,
      policy: { blockSeverityAtOrAbove: "medium" },
    });
    expect(result.verdict).toBe("BLOCK");
  });
});

// ---------------------------------------------------------------------------
// Certificate format and determinism
// ---------------------------------------------------------------------------

describe("certificate", () => {
  it("certificate matches sha256:<hex> format", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100 },
      schema: simpleSchema,
    });
    expect(result.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("certificate is deterministic for the same input + timestamp", () => {
    // We can test determinism by calling generateCertificate directly with the same inputs
    const subject = "tool:args:schema";
    const cert1 = generateCertificate(subject, "PASS", 0, 1700000000000);
    const cert2 = generateCertificate(subject, "PASS", 0, 1700000000000);
    expect(cert1).toBe(cert2);
  });

  it("certificate changes when verdict changes", () => {
    const subject = "tool:args:schema";
    const cert1 = generateCertificate(subject, "PASS", 0, 1700000000000);
    const cert2 = generateCertificate(subject, "BLOCK", 0, 1700000000000);
    expect(cert1).not.toBe(cert2);
  });

  it("certificate changes when findings count changes", () => {
    const subject = "tool:args:schema";
    const cert1 = generateCertificate(subject, "PASS", 0, 1700000000000);
    const cert2 = generateCertificate(subject, "PASS", 1, 1700000000000);
    expect(cert1).not.toBe(cert2);
  });

  it("sha256Hex produces a 64-char hex string", () => {
    const hash = sha256Hex("hello world");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

describe("result shape", () => {
  it("latencyMs is a non-negative number", () => {
    const result = checkToolArgs({
      args: { name: "Alice", amount: 100 },
      schema: simpleSchema,
    });
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("counts reflect all violation severities", () => {
    const result = checkToolArgs({
      args: {}, // missing both required fields
      schema: simpleSchema,
    });
    // Both name and amount are required → two critical violations
    expect(result.counts.critical).toBe(2);
    expect(result.violations).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("empty schema with empty args → PASS", () => {
    const result = checkToolArgs({ args: {}, schema: { fields: {} } });
    expect(result.verdict).toBe("PASS");
    expect(result.violations).toHaveLength(0);
  });

  it("empty schema with unknown args → FLAG (unknown violation)", () => {
    const result = checkToolArgs({
      args: { x: 1 },
      schema: { fields: {} },
    });
    expect(result.verdict).toBe("FLAG");
    expect(result.violations.some((v) => v.rule === "unknown")).toBe(true);
  });

  it("tool name is included in input without error", () => {
    const result = checkToolArgs({
      tool: "my_tool",
      args: { name: "Bob", amount: 1 },
      schema: simpleSchema,
    });
    expect(result.verdict).toBe("PASS");
  });

  it("multiple violations accumulate correctly", () => {
    const result = checkToolArgs({
      args: { name: 123, amount: 9999, status: "invalid", extra: true },
      schema: simpleSchema,
    });
    // name: type (high), amount: max (medium), status: enum (high), extra: unknown (low)
    expect(result.violations.length).toBeGreaterThanOrEqual(4);
    expect(result.verdict).toBe("BLOCK"); // has high violations
  });

  it("integer type accepts whole numbers", () => {
    const schema: ArgSchema = {
      fields: { qty: { type: "integer", required: true } },
    };
    const result = checkToolArgs({ args: { qty: 5 }, schema });
    expect(result.verdict).toBe("PASS");
  });

  it("NaN is rejected for number type", () => {
    const schema: ArgSchema = {
      fields: { val: { type: "number", required: true } },
    };
    const result = checkToolArgs({ args: { val: NaN }, schema });
    expect(result.verdict).toBe("BLOCK");
  });
});
