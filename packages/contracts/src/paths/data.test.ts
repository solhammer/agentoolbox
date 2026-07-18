import { describe, it, expect } from "vitest";
import "../index.js";
import {
  ValidateIdentifierRequest,
  ValidateIdentifierResponse,
  ValidateSchemaRequest,
  ValidateSchemaResponse,
} from "./data.js";

describe("validateIdentifier", () => {
  it("ValidateIdentifierRequest accepts value + optional type", () => {
    const parsed = ValidateIdentifierRequest.parse({
      value: "DE89370400440532013000",
      type: "iban",
    });
    expect(parsed.value).toBe("DE89370400440532013000");
  });

  it("ValidateIdentifierRequest accepts a values array", () => {
    const parsed = ValidateIdentifierRequest.parse({
      values: ["GB29NWBK60161331926819", "021000021"],
      types: ["iban", "aba_routing"],
    });
    expect(parsed.values).toHaveLength(2);
  });

  it("ValidateIdentifierResponse validates a real gate result", () => {
    const parsed = ValidateIdentifierResponse.parse({
      verdict: "PASS",
      results: [
        {
          value: "DE89370400440532013000",
          type: "iban",
          valid: true,
          checksum: "pass",
          normalized: "DE89 3704 0044 0532 0130 00",
        },
      ],
      counts: { total: 1, invalid: 0 },
      certificate: "sha256:deadbeef",
      latencyMs: 1.2,
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.results[0]!.checksum).toBe("pass");
  });

  it("ValidateIdentifierResponse handles invalid result with detail", () => {
    const parsed = ValidateIdentifierResponse.parse({
      verdict: "BLOCK",
      results: [
        {
          value: "NOTANIBAN",
          type: "unknown",
          valid: false,
          checksum: "not_applicable",
          detail: "Could not determine identifier type",
        },
      ],
      counts: { total: 1, invalid: 1 },
      certificate: "sha256:cafe1234",
      latencyMs: 0.4,
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.results[0]!.valid).toBe(false);
  });
});

describe("validateSchema", () => {
  it("ValidateSchemaRequest parses data + schema + optional policy", () => {
    const parsed = ValidateSchemaRequest.parse({
      data: { name: "Alice", age: 30 },
      schema: { type: "object", properties: { name: { type: "string" }, age: { type: "number" } } },
      policy: { mode: "block" },
    });
    expect(parsed.policy?.mode).toBe("block");
  });

  it("ValidateSchemaResponse validates a passing result", () => {
    const parsed = ValidateSchemaResponse.parse({
      verdict: "PASS",
      valid: true,
      errors: [],
      counts: { errors: 0 },
      certificate: "sha256:abc123",
      latencyMs: 0.8,
    });
    expect(parsed.valid).toBe(true);
    expect(parsed.verdict).toBe("PASS");
  });

  it("ValidateSchemaResponse validates a failing result with errors", () => {
    const parsed = ValidateSchemaResponse.parse({
      verdict: "BLOCK",
      valid: false,
      errors: [
        {
          path: "/age",
          keyword: "type",
          message: "must be number",
          expected: "number",
          actual: "string",
        },
      ],
      counts: { errors: 1 },
      certificate: "sha256:ffff0000",
      latencyMs: 1.1,
    });
    expect(parsed.valid).toBe(false);
    expect(parsed.errors[0]!.keyword).toBe("type");
    expect(parsed.counts.errors).toBe(1);
  });
});
