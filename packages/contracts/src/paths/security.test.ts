import { describe, it, expect } from "vitest";
import {
  ScanSecretsResponse,
  ScanInjectionResponse,
  CountTokensResponse,
  ScanVulnerabilitiesResponse,
  ScanPiiResponse,
  ScanCommandResponse,
  ScanUrlResponse,
} from "./security.js";

describe("security contracts", () => {
  // ── scanSecrets ─────────────────────────────────────────────────────────────
  it("ScanSecretsResponse validates a real secrets scan result", () => {
    const parsed = ScanSecretsResponse.parse({
      findings: [
        {
          type: "openai_key",
          match: "sk-a***b",
          line: 3,
          severity: "critical",
          suggestion: "Rotate this OpenAI API key and read it from an environment variable instead.",
        },
      ],
      totalFindings: 1,
      critical: 1,
      high: 0,
      safe: false,
      filename: "config.ts",
    });
    expect(parsed.safe).toBe(false);
    expect(parsed.critical).toBe(1);
  });

  // ── scanInjection ────────────────────────────────────────────────────────────
  it("ScanInjectionResponse validates a real injection scan result", () => {
    const parsed = ScanInjectionResponse.parse({
      risk: "injection",
      score: 0.9,
      patterns: ["instruction_override", "jailbreak"],
      advice:
        "High-confidence prompt injection detected. Do not forward this input to the LLM without sanitisation.",
      context: "user message",
    });
    expect(parsed.risk).toBe("injection");
    expect(parsed.patterns).toContain("jailbreak");
  });

  // ── countTokens (text branch) ────────────────────────────────────────────────
  it("CountTokensResponse validates a TokenCount result", () => {
    const parsed = CountTokensResponse.parse({
      tokens: 42,
      characters: 168,
      words: 30,
      estimatedCostUsd: { input: 0.000084, output1k: 0.006 },
      model: "gpt-4",
    });
    expect((parsed as { tokens?: number }).tokens).toBeDefined();
  });

  // ── countTokens (messages branch) ───────────────────────────────────────────
  it("CountTokensResponse validates a MessageTokenCount result", () => {
    const parsed = CountTokensResponse.parse({
      total: 55,
      perMessage: [
        { role: "user", tokens: 52 },
      ],
      estimatedCostUsd: { input: 0.00055, output1k: 0.03 },
      model: "claude",
      contextWindowRemaining: 199945,
    });
    expect(
      (parsed as { contextWindowRemaining?: number }).contextWindowRemaining
    ).toBe(199945);
  });

  // ── scanVulnerabilities ──────────────────────────────────────────────────────
  it("ScanVulnerabilitiesResponse validates a real vuln scan result", () => {
    const parsed = ScanVulnerabilitiesResponse.parse({
      findings: [
        {
          package: "lodash",
          vulnerabilities: [
            {
              id: "GHSA-jf85-cpcp-j695",
              summary: "Prototype Pollution in lodash",
              severity: "HIGH",
              aliases: ["CVE-2019-10744"],
            },
          ],
        },
      ],
      totalPackages: 3,
      vulnerablePackages: 1,
      safe: false,
      latencyMs: 320,
    });
    expect(parsed.safe).toBe(false);
    expect(parsed.findings[0]!.package).toBe("lodash");
  });

  // ── scanPii ─────────────────────────────────────────────────────────────────
  it("ScanPiiResponse validates a real PII scan result", () => {
    const parsed = ScanPiiResponse.parse({
      verdict: "FLAG",
      safe: false,
      score: 0.8,
      categories: ["PII"],
      totalFindings: 1,
      counts: { low: 0, medium: 0, high: 1, critical: 0 },
      entities: [
        {
          type: "EMAIL",
          category: "PII",
          severity: "high",
          match: "user@example.com",
          start: 10,
          end: 26,
          line: 1,
          validated: true,
          confidence: 0.99,
        },
      ],
      certificate: "sha256:deadbeef",
      enforcementMode: "flag",
      latencyMs: 12,
    });
    expect(parsed.verdict).toBe("FLAG");
    expect(parsed.entities[0]!.type).toBe("EMAIL");
  });

  // ── scanCommand ──────────────────────────────────────────────────────────────
  it("ScanCommandResponse validates a real command scan result", () => {
    const parsed = ScanCommandResponse.parse({
      verdict: "BLOCK",
      segments: 2,
      findings: [
        {
          ruleId: "CMD-RM-RF",
          severity: "critical",
          segmentIndex: 0,
          message: "Destructive rm -rf detected",
          snippet: "rm -rf /",
        },
      ],
      counts: { low: 0, medium: 0, high: 0, critical: 1 },
      certificate: "sha256:abc123",
      latencyMs: 4,
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.findings[0]!.ruleId).toBe("CMD-RM-RF");
  });

  // ── scanUrl ──────────────────────────────────────────────────────────────────
  it("ScanUrlResponse validates a real URL scan result", () => {
    const parsed = ScanUrlResponse.parse({
      verdict: "BLOCK",
      target: {
        scheme: "http",
        host: "169.254.169.254",
        hostType: "ipv4",
        ipClass: "link-local",
        port: null,
        normalizedUrl: "http://169.254.169.254/",
      },
      findings: [
        {
          ruleId: "URL-PRIVATE-IP",
          severity: "critical",
          message: "URL resolves to a link-local/metadata IP address",
        },
      ],
      counts: { low: 0, medium: 0, high: 0, critical: 1 },
      certificate: "sha256:cafe",
      latencyMs: 2,
    });
    expect(parsed.verdict).toBe("BLOCK");
    expect(parsed.target.ipClass).toBe("link-local");
  });
});
