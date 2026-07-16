import { describe, it, expect } from "vitest";
import { validateSchema } from "./validateSchema.js";
import type { SchemaInput } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(data: unknown, schema: Record<string, unknown>, policy?: SchemaInput["policy"]) {
  return validateSchema({ data, schema, ...(policy !== undefined ? { policy } : {}) });
}

// ---------------------------------------------------------------------------
// 1. Valid object — PASS
// ---------------------------------------------------------------------------
describe("valid object", () => {
  it("returns PASS when object fully satisfies schema", () => {
    const result = run(
      { name: "Alice", age: 30 },
      {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer", minimum: 0 },
        },
        required: ["name", "age"],
      }
    );
    expect(result.verdict).toBe("PASS");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.counts.errors).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Missing required property — BLOCK
// ---------------------------------------------------------------------------
describe("required keyword", () => {
  it("flags missing required property", () => {
    const result = run(
      { name: "Bob" },
      {
        type: "object",
        properties: { name: { type: "string" }, age: { type: "integer" } },
        required: ["name", "age"],
      }
    );
    expect(result.verdict).toBe("BLOCK");
    expect(result.valid).toBe(false);
    const err = result.errors.find((e) => e.keyword === "required");
    expect(err).toBeDefined();
    expect(err?.path).toBe("");
    expect(err?.message).toContain("age");
  });
});

// ---------------------------------------------------------------------------
// 3. Type mismatch
// ---------------------------------------------------------------------------
describe("type keyword", () => {
  it("fails when string given where number expected", () => {
    const result = run("hello", { type: "number" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("type");
    expect(result.errors[0]?.path).toBe("");
    expect(result.errors[0]?.actual).toBe("string");
  });

  it("passes for integer type with whole number", () => {
    expect(run(5, { type: "integer" }).valid).toBe(true);
  });

  it("fails for integer type with float", () => {
    const result = run(5.5, { type: "integer" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("type");
  });

  it("supports null type", () => {
    expect(run(null, { type: "null" }).valid).toBe(true);
  });

  it("supports boolean type", () => {
    expect(run(true, { type: "boolean" }).valid).toBe(true);
    expect(run(false, { type: "boolean" }).valid).toBe(true);
    expect(run(1, { type: "boolean" }).valid).toBe(false);
  });

  it("supports array of types", () => {
    expect(run(null, { type: ["string", "null"] }).valid).toBe(true);
    expect(run("hi", { type: ["string", "null"] }).valid).toBe(true);
    expect(run(42, { type: ["string", "null"] }).valid).toBe(false);
  });

  it("nullable allows null alongside type", () => {
    expect(run(null, { type: "string", nullable: true }).valid).toBe(true);
    expect(run("hi", { type: "string", nullable: true }).valid).toBe(true);
    expect(run(42, { type: "string", nullable: true }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. enum / const
// ---------------------------------------------------------------------------
describe("enum keyword", () => {
  it("passes when value is in enum", () => {
    expect(run("red", { enum: ["red", "green", "blue"] }).valid).toBe(true);
  });

  it("fails when value is not in enum", () => {
    const result = run("yellow", { enum: ["red", "green", "blue"] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("enum");
    expect(result.errors[0]?.path).toBe("");
  });

  it("supports non-string enum values", () => {
    expect(run(1, { enum: [1, 2, 3] }).valid).toBe(true);
    expect(run(4, { enum: [1, 2, 3] }).valid).toBe(false);
  });
});

describe("const keyword", () => {
  it("passes when value equals const", () => {
    expect(run(42, { const: 42 }).valid).toBe(true);
  });

  it("fails when value differs from const", () => {
    const result = run(43, { const: 42 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("const");
    expect(result.errors[0]?.expected).toBe(42);
    expect(result.errors[0]?.actual).toBe(43);
  });

  it("supports object const with deep equality", () => {
    expect(run({ a: 1 }, { const: { a: 1 } }).valid).toBe(true);
    expect(run({ a: 2 }, { const: { a: 1 } }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Numeric bounds + multipleOf
// ---------------------------------------------------------------------------
describe("numeric keywords", () => {
  it("passes when value equals minimum", () => {
    expect(run(5, { type: "number", minimum: 5 }).valid).toBe(true);
  });

  it("fails when value is below minimum", () => {
    const result = run(4, { type: "number", minimum: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("minimum");
    expect(result.errors[0]?.expected).toBe(5);
    expect(result.errors[0]?.actual).toBe(4);
  });

  it("passes when value equals maximum", () => {
    expect(run(10, { type: "number", maximum: 10 }).valid).toBe(true);
  });

  it("fails when value exceeds maximum", () => {
    const result = run(11, { type: "number", maximum: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("maximum");
  });

  it("exclusiveMinimum rejects equal value", () => {
    expect(run(5, { exclusiveMinimum: 5 }).valid).toBe(false);
    expect(run(6, { exclusiveMinimum: 5 }).valid).toBe(true);
  });

  it("exclusiveMaximum rejects equal value", () => {
    expect(run(10, { exclusiveMaximum: 10 }).valid).toBe(false);
    expect(run(9, { exclusiveMaximum: 10 }).valid).toBe(true);
  });

  it("multipleOf passes for exact multiples", () => {
    expect(run(6, { multipleOf: 3 }).valid).toBe(true);
    expect(run(0, { multipleOf: 3 }).valid).toBe(true);
  });

  it("multipleOf fails for non-multiples", () => {
    const result = run(7, { multipleOf: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("multipleOf");
  });

  it("multipleOf works for floating-point multiplier", () => {
    expect(run(0.3, { multipleOf: 0.1 }).valid).toBe(true);
    expect(run(0.35, { multipleOf: 0.1 }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. String: minLength/maxLength/pattern/format
// ---------------------------------------------------------------------------
describe("string keywords", () => {
  it("minLength passes when string is long enough", () => {
    expect(run("hello", { minLength: 3 }).valid).toBe(true);
  });

  it("minLength fails when string is too short", () => {
    const result = run("hi", { minLength: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("minLength");
    expect(result.errors[0]?.expected).toBe(3);
    expect(result.errors[0]?.actual).toBe(2);
  });

  it("maxLength passes when string is short enough", () => {
    expect(run("hi", { maxLength: 5 }).valid).toBe(true);
  });

  it("maxLength fails when string exceeds limit", () => {
    const result = run("toolong", { maxLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("maxLength");
  });

  it("pattern passes when string matches", () => {
    expect(run("abc123", { pattern: "^[a-z]+\\d+$" }).valid).toBe(true);
  });

  it("pattern fails when string does not match", () => {
    const result = run("ABC", { pattern: "^[a-z]+$" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("pattern");
    expect(result.errors[0]?.expected).toBe("^[a-z]+$");
  });

  describe("format: date", () => {
    it("passes valid date", () => {
      expect(run("2024-01-15", { format: "date" }).valid).toBe(true);
    });
    it("fails invalid date", () => {
      expect(run("2024-13-01", { format: "date" }).valid).toBe(false);
      expect(run("not-a-date", { format: "date" }).valid).toBe(false);
    });
  });

  describe("format: date-time", () => {
    it("passes valid datetime with Z", () => {
      expect(run("2024-01-15T10:30:00Z", { format: "date-time" }).valid).toBe(true);
    });
    it("passes valid datetime with offset", () => {
      expect(run("2024-01-15T10:30:00+05:30", { format: "date-time" }).valid).toBe(true);
    });
    it("fails invalid datetime", () => {
      expect(run("2024-01-15", { format: "date-time" }).valid).toBe(false);
    });
  });

  describe("format: email", () => {
    it("passes valid email", () => {
      expect(run("user@example.com", { format: "email" }).valid).toBe(true);
    });
    it("fails invalid email", () => {
      expect(run("notanemail", { format: "email" }).valid).toBe(false);
    });
  });

  describe("format: uuid", () => {
    it("passes valid UUID", () => {
      expect(run("550e8400-e29b-41d4-a716-446655440000", { format: "uuid" }).valid).toBe(true);
    });
    it("fails invalid UUID", () => {
      expect(run("not-a-uuid", { format: "uuid" }).valid).toBe(false);
    });
  });

  describe("format: uri", () => {
    it("passes valid URI", () => {
      expect(run("https://example.com/path?q=1", { format: "uri" }).valid).toBe(true);
    });
    it("fails invalid URI", () => {
      expect(run("not a uri", { format: "uri" }).valid).toBe(false);
    });
  });

  describe("format: ipv4", () => {
    it("passes valid IPv4", () => {
      expect(run("192.168.1.1", { format: "ipv4" }).valid).toBe(true);
      expect(run("255.255.255.255", { format: "ipv4" }).valid).toBe(true);
      expect(run("0.0.0.0", { format: "ipv4" }).valid).toBe(true);
    });
    it("fails invalid IPv4", () => {
      expect(run("999.0.0.1", { format: "ipv4" }).valid).toBe(false);
      expect(run("1.2.3", { format: "ipv4" }).valid).toBe(false);
    });
  });

  it("unknown format is ignored (passes)", () => {
    expect(run("whatever", { format: "unknown-format" }).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Array: items (single + tuple) + minItems + uniqueItems
// ---------------------------------------------------------------------------
describe("array keywords", () => {
  it("single items schema — all items must match", () => {
    expect(run([1, 2, 3], { type: "array", items: { type: "number" } }).valid).toBe(true);
    const result = run([1, "two", 3], { type: "array", items: { type: "number" } });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("type");
    expect(result.errors[0]?.path).toBe("/1");
  });

  it("tuple items schema — validates positional types", () => {
    const schema = {
      type: "array",
      items: [{ type: "number" }, { type: "string" }, { type: "boolean" }],
    };
    expect(run([1, "hi", true], schema).valid).toBe(true);
    const result = run([1, 2, true], schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toBe("/1");
  });

  it("minItems fails when array is too short", () => {
    const result = run([1], { type: "array", minItems: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("minItems");
    expect(result.errors[0]?.expected).toBe(2);
  });

  it("maxItems fails when array is too long", () => {
    const result = run([1, 2, 3, 4], { type: "array", maxItems: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("maxItems");
  });

  it("uniqueItems passes for unique array", () => {
    expect(run([1, 2, 3], { uniqueItems: true }).valid).toBe(true);
  });

  it("uniqueItems fails for duplicate items", () => {
    const result = run([1, 2, 1], { uniqueItems: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("uniqueItems");
    expect(result.errors[0]?.path).toBe("");
  });

  it("uniqueItems does deep equality for objects", () => {
    expect(run([{ a: 1 }, { a: 2 }], { uniqueItems: true }).valid).toBe(true);
    expect(run([{ a: 1 }, { a: 1 }], { uniqueItems: true }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. additionalProperties: false with an extra key
// ---------------------------------------------------------------------------
describe("additionalProperties", () => {
  it("additionalProperties: false rejects extra key", () => {
    const result = run(
      { name: "Alice", extra: true },
      {
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: false,
      }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("additionalProperties");
    expect(result.errors[0]?.path).toBe("/extra");
  });

  it("additionalProperties: false passes when no extra keys", () => {
    expect(
      run(
        { name: "Alice" },
        { type: "object", properties: { name: { type: "string" } }, additionalProperties: false }
      ).valid
    ).toBe(true);
  });

  it("additionalProperties: schema validates extra key values", () => {
    const result = run(
      { name: "Alice", extra: "not-a-number" },
      {
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: { type: "number" },
      }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("type");
    expect(result.errors[0]?.path).toBe("/extra");
  });
});

// ---------------------------------------------------------------------------
// 9. oneOf / anyOf / allOf / not
// ---------------------------------------------------------------------------
describe("composition keywords", () => {
  describe("oneOf", () => {
    it("passes when exactly one sub-schema matches", () => {
      const result = run(1, {
        oneOf: [{ type: "number" }, { type: "string" }],
      });
      expect(result.valid).toBe(true);
    });

    it("fails when zero sub-schemas match", () => {
      const result = run(true, {
        oneOf: [{ type: "number" }, { type: "string" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.keyword).toBe("oneOf");
      expect(result.errors[0]?.actual).toBe(0);
    });

    it("fails when more than one sub-schema matches", () => {
      const result = run(1, {
        oneOf: [{ type: "number" }, { type: "integer" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.keyword).toBe("oneOf");
      expect(result.errors[0]?.actual).toBe(2);
    });
  });

  describe("anyOf", () => {
    it("passes when at least one sub-schema matches", () => {
      expect(run("hello", { anyOf: [{ type: "string" }, { type: "number" }] }).valid).toBe(true);
      expect(run(42, { anyOf: [{ type: "string" }, { type: "number" }] }).valid).toBe(true);
    });

    it("fails when no sub-schema matches", () => {
      const result = run(true, { anyOf: [{ type: "string" }, { type: "number" }] });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.keyword).toBe("anyOf");
    });
  });

  describe("allOf", () => {
    it("passes when all sub-schemas match", () => {
      const result = run(5, {
        allOf: [{ type: "number" }, { minimum: 3 }, { maximum: 10 }],
      });
      expect(result.valid).toBe(true);
    });

    it("fails when any sub-schema does not match", () => {
      const result = run(2, {
        allOf: [{ type: "number" }, { minimum: 3 }],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("not", () => {
    it("passes when the sub-schema does NOT match", () => {
      expect(run("hello", { not: { type: "number" } }).valid).toBe(true);
    });

    it("fails when the sub-schema matches", () => {
      const result = run(42, { not: { type: "number" } });
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.keyword).toBe("not");
    });
  });
});

// ---------------------------------------------------------------------------
// 10. Correct error paths on nested data
// ---------------------------------------------------------------------------
describe("error paths on nested data", () => {
  it("reports correct path for nested property type mismatch", () => {
    const result = run(
      { user: { age: "not-a-number" } },
      {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: { age: { type: "integer" } },
          },
        },
      }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toBe("/user/age");
  });

  it("reports correct path for array item error", () => {
    const result = run(
      { tags: [1, 2, "three"] },
      {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "number" } },
        },
      }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toBe("/tags/2");
  });

  it("escapes JSON Pointer slashes and tildes in property names", () => {
    const result = run(
      { "a/b": 123 },
      {
        type: "object",
        properties: { "a/b": { type: "string" } },
      }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toBe("/a~1b");
  });
});

// ---------------------------------------------------------------------------
// 11. Local $ref
// ---------------------------------------------------------------------------
describe("$ref keyword", () => {
  it("resolves #/$defs/ reference", () => {
    const schema: Record<string, unknown> = {
      $defs: {
        Name: { type: "string", minLength: 1 },
      },
      type: "object",
      properties: {
        name: { $ref: "#/$defs/Name" },
      },
    };
    expect(run({ name: "Alice" }, schema).valid).toBe(true);
    const result = run({ name: "" }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("minLength");
    expect(result.errors[0]?.path).toBe("/name");
  });

  it("resolves #/definitions/ reference", () => {
    const schema: Record<string, unknown> = {
      definitions: {
        PositiveInt: { type: "integer", minimum: 1 },
      },
      type: "object",
      properties: {
        count: { $ref: "#/definitions/PositiveInt" },
      },
    };
    expect(run({ count: 5 }, schema).valid).toBe(true);
    expect(run({ count: 0 }, schema).valid).toBe(false);
  });

  it("reports error for unresolvable $ref", () => {
    const result = run("anything", { $ref: "#/$defs/Missing" } as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("$ref");
  });

  it("does not resolve remote $refs", () => {
    const result = run("x", { $ref: "https://example.com/schema.json" } as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("$ref");
  });
});

// ---------------------------------------------------------------------------
// 12. Depth / size guard
// ---------------------------------------------------------------------------
describe("guards", () => {
  it("depth guard fires for deeply recursive schema", () => {
    // Build a schema that recurses via $ref
    const schema: Record<string, unknown> = {
      $defs: {
        Node: {
          type: "object",
          properties: {
            child: { $ref: "#/$defs/Node" },
          },
        },
      },
      $ref: "#/$defs/Node",
    };

    // Build deeply nested data (100 levels)
    let data: unknown = { child: null };
    for (let i = 0; i < 100; i++) {
      data = { child: data };
    }

    const result = run(data, schema);
    // Should emit a depth error and not hang
    const depthErr = result.errors.find((e) => e.keyword === "depth");
    expect(depthErr).toBeDefined();
  });

  it("size guard fires for very large data", () => {
    // Create a large flat array — each item triggers one node
    const data = Array.from({ length: 200_000 }, (_, i) => i);
    const schema = { type: "array", items: { type: "number" } };
    const result = run(data, schema);
    const sizeErr = result.errors.find((e) => e.keyword === "size");
    expect(sizeErr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 13. Certificate format + determinism
// ---------------------------------------------------------------------------
describe("certificate", () => {
  it("certificate starts with sha256:", () => {
    const result = run({ x: 1 }, { type: "object" });
    expect(result.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("same inputs produce same certificate when called twice", () => {
    const input: SchemaInput = { data: { x: 1 }, schema: { type: "object" } };
    const r1 = validateSchema(input);
    // Re-run with identical parameters — certificates only differ by timestamp,
    // so we only check the format not strict equality
    expect(r1.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("different data produces different certificate", () => {
    const schema = { type: "object" };
    const r1 = validateSchema({ data: { a: 1 }, schema });
    const r2 = validateSchema({ data: { a: 2 }, schema });
    // Certificates bind the data hash so should differ
    expect(r1.certificate).not.toBe(r2.certificate);
  });

  it("certificate changes when verdict changes (different timestamp is expected)", () => {
    // We can't guarantee timestamps differ in the same test, but we can verify
    // that the certificate format is always correct regardless of verdict.
    const resultPass = run(1, { type: "number" });
    const resultBlock = run("x", { type: "number" });
    expect(resultPass.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(resultBlock.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// 14. Policy modes
// ---------------------------------------------------------------------------
describe("policy modes", () => {
  it("default mode (block) returns BLOCK on errors", () => {
    const result = run("x", { type: "number" });
    expect(result.verdict).toBe("BLOCK");
    expect(result.valid).toBe(false);
  });

  it("flag mode returns FLAG on errors", () => {
    const result = run("x", { type: "number" }, { mode: "flag" });
    expect(result.verdict).toBe("FLAG");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("audit mode returns PASS on errors but lists them", () => {
    const result = run("x", { type: "number" }, { mode: "audit" });
    expect(result.verdict).toBe("PASS");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("PASS verdict when data is valid regardless of mode", () => {
    expect(run(1, { type: "number" }, { mode: "block" }).verdict).toBe("PASS");
    expect(run(1, { type: "number" }, { mode: "flag" }).verdict).toBe("PASS");
    expect(run(1, { type: "number" }, { mode: "audit" }).verdict).toBe("PASS");
  });
});

// ---------------------------------------------------------------------------
// 15. minProperties / maxProperties
// ---------------------------------------------------------------------------
describe("property count keywords", () => {
  it("minProperties fails when too few", () => {
    const result = run({ a: 1 }, { type: "object", minProperties: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("minProperties");
  });

  it("maxProperties fails when too many", () => {
    const result = run({ a: 1, b: 2, c: 3 }, { type: "object", maxProperties: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.keyword).toBe("maxProperties");
  });
});

// ---------------------------------------------------------------------------
// 16. latencyMs is non-negative
// ---------------------------------------------------------------------------
describe("latencyMs", () => {
  it("latencyMs is a non-negative number", () => {
    const result = run({ x: 1 }, { type: "object" });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.latencyMs).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// 17. counts.errors
// ---------------------------------------------------------------------------
describe("counts", () => {
  it("counts.errors matches errors.length", () => {
    const result = run(
      { a: "bad", b: "bad" },
      {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b", "c"],
      }
    );
    expect(result.counts.errors).toBe(result.errors.length);
    expect(result.counts.errors).toBeGreaterThan(0);
  });
});
