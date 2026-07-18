import { describe, it, expect } from "vitest";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./openapi.js";
import "./index.js";
import { ScanSqlResponse } from "./paths/data.js";

describe("contracts foundation", () => {
  it("generates a valid OpenAPI 3.1 document", () => {
    const doc = new OpenApiGeneratorV31(registry.definitions).generateDocument({
      openapi: "3.1.0",
      info: { title: "test", version: "0" },
    });
    expect(doc.openapi).toBe("3.1.0");
    // The exemplar endpoint is registered as a POST path with named components.
    expect(doc.paths?.["/v1/scan/sql"]?.post).toBeTruthy();
    expect(doc.components?.schemas?.["ScanSqlResponse"]).toBeTruthy();
    expect(doc.components?.securitySchemes?.["bearerAuth"]).toBeTruthy();
  });

  it("ScanSqlResponse validates a real gate result", () => {
    const parsed = ScanSqlResponse.parse({
      verdict: "BLOCK",
      statements: 1,
      findings: [
        { ruleId: "SQL-DROP", severity: "critical", statementIndex: 0, message: "DROP", snippet: "DROP TABLE t" },
      ],
      counts: { low: 0, medium: 0, high: 0, critical: 1 },
      certificate: "sha256:abc123",
      latencyMs: 0.6,
    });
    expect(parsed.verdict).toBe("BLOCK");
  });
});
