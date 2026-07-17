import { describe, it, expect } from "vitest";
import {
  ValidateImportsResponse,
  VerifyResponse,
  DistillResponse,
} from "./core.js";

describe("core contracts", () => {
  it("ValidateImportsResponse validates a real result", () => {
    const parsed = ValidateImportsResponse.parse({
      language: "python",
      valid: [
        { name: "os", raw: "import os", status: "valid" },
        { name: "json", raw: "import json", status: "valid" },
      ],
      hallucinated: [
        {
          name: "pandas_extra",
          raw: "import pandas_extra",
          status: "hallucinated",
          error: "Package not found on PyPI",
        },
      ],
      unknown: [],
      totalImports: 3,
      hallucinationRate: 0.333,
      latencyMs: 120,
    });
    expect(parsed.language).toBe("python");
    expect(parsed.hallucinated).toHaveLength(1);
    expect(parsed.hallucinationRate).toBeCloseTo(0.333);
  });

  it("VerifyResponse validates a real firewall result", () => {
    const parsed = VerifyResponse.parse({
      verdict: "FLAG",
      overallScore: 0.72,
      claims: [
        {
          text: "The Eiffel Tower is in Berlin.",
          verdict: "BLOCK",
          confidence: 0.97,
          checkType: "factual",
          evidence: "The Eiffel Tower is located in Paris, France.",
          suggestedFix: "Replace 'Berlin' with 'Paris'.",
        },
      ],
      outputType: "natural_language",
      enforcementMode: "block",
      latencyMs: 340,
      certificate: "sha256:deadbeef1234",
      importValidation: {
        valid: ["os"],
        hallucinated: [],
        unknown: [],
        hallucinationRate: 0,
      },
    });
    expect(parsed.verdict).toBe("FLAG");
    expect(parsed.claims[0]!.verdict).toBe("BLOCK");
    expect(parsed.importValidation?.hallucinationRate).toBe(0);
  });

  it("VerifyResponse accepts result without optional importValidation", () => {
    const parsed = VerifyResponse.parse({
      verdict: "PASS",
      overallScore: 0.99,
      claims: [],
      outputType: "code",
      enforcementMode: "audit",
      latencyMs: 55,
      certificate: "sha256:abc123",
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.importValidation).toBeUndefined();
  });

  it("DistillResponse validates a real distill result", () => {
    const parsed = DistillResponse.parse({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Summarize this." },
        { role: "assistant", content: "Here is the summary." },
      ],
      originalCount: 10,
      distilledCount: 3,
      estimatedTokens: 512,
      compressionRatio: 0.3,
      method: "sliding-window",
    });
    expect(parsed.distilledCount).toBe(3);
    expect(parsed.compressionRatio).toBeCloseTo(0.3);
    expect(parsed.messages[0]!.role).toBe("system");
  });
});
