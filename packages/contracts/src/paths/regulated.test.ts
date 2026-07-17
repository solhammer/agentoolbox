import { describe, it, expect } from "vitest";
import {
  ComplianceSanctionsResponse,
  HealthRxCheckResponse,
  AgentToolArgsResponse,
  InfraPlanRiskResponse,
  LegalCiteResponse,
  LegalDeadlineResponse,
} from "./regulated.js";

describe("regulated suite", () => {
  it("ComplianceSanctionsResponse validates a real screen result", () => {
    const parsed = ComplianceSanctionsResponse.parse({
      verdict: "BLOCK",
      matches: [
        {
          query: "John Doe",
          listedName: "JOHN DOE",
          score: 1.0,
          matchType: "exact",
          list: "OFAC-SDN",
          entityType: "individual",
        },
      ],
      counts: { total: 1, block: 1, flag: 0 },
      screened: 1,
      datasetDate: "2024-01-15",
      certificate: "sha256:abc123",
      latencyMs: 2.1,
    });
    expect(parsed.verdict).toBe("BLOCK");
    const match = parsed.matches[0]!;
    expect(match.matchType).toBe("exact");
  });

  it("HealthRxCheckResponse validates a real rx-check result", () => {
    const parsed = HealthRxCheckResponse.parse({
      verdict: "FLAG",
      findings: [
        {
          type: "interaction",
          severity: "major",
          drugs: ["warfarin", "aspirin"],
          message: "Increased bleeding risk when combined.",
          reference: "FDA Drug Interaction Database",
        },
      ],
      counts: { low: 0, moderate: 0, major: 1, contraindicated: 0 },
      certificate: "sha256:def456",
      latencyMs: 4.7,
      disclaimer: "For informational use only. Not a substitute for clinical judgment.",
    });
    expect(parsed.verdict).toBe("FLAG");
    const finding = parsed.findings[0]!;
    expect(finding.severity).toBe("major");
  });

  it("AgentToolArgsResponse validates a real tool-args result", () => {
    const parsed = AgentToolArgsResponse.parse({
      verdict: "BLOCK",
      violations: [
        {
          path: "amount",
          rule: "max",
          severity: "critical",
          message: "Value 999999 exceeds maximum 10000.",
          expected: 10000,
          actual: 999999,
        },
      ],
      counts: { low: 0, medium: 0, high: 0, critical: 1 },
      certificate: "sha256:ghi789",
      latencyMs: 0.3,
    });
    expect(parsed.verdict).toBe("BLOCK");
    const violation = parsed.violations[0]!;
    expect(violation.rule).toBe("max");
  });

  it("InfraPlanRiskResponse validates a real plan-risk result", () => {
    const parsed = InfraPlanRiskResponse.parse({
      verdict: "FLAG",
      findings: [
        {
          ruleId: "TF-S3-001",
          severity: "high",
          resource: "aws_s3_bucket.data",
          message: "S3 bucket is publicly accessible.",
          framework: "CIS AWS 1.4",
        },
      ],
      counts: { low: 0, medium: 0, high: 1, critical: 0 },
      certificate: "sha256:jkl012",
      latencyMs: 3.5,
    });
    expect(parsed.verdict).toBe("FLAG");
    const infrafinding = parsed.findings[0]!;
    expect(infrafinding.ruleId).toBe("TF-S3-001");
  });

  it("LegalCiteResponse validates a real citation result", () => {
    const parsed = LegalCiteResponse.parse({
      verdict: "PASS",
      citations: [
        {
          raw: "410 U.S. 113 (1973)",
          parsed: { volume: 410, reporter: "U.S.", page: 113, year: 1973 },
          valid: true,
          issues: [],
        },
      ],
      counts: { total: 1, invalid: 0 },
      certificate: "sha256:mno345",
      latencyMs: 1.2,
    });
    expect(parsed.verdict).toBe("PASS");
    const cite = parsed.citations[0]!;
    expect(cite.valid).toBe(true);
  });

  it("LegalDeadlineResponse validates a real deadline result", () => {
    const parsed = LegalDeadlineResponse.parse({
      verdict: "PASS",
      deadline: "2024-04-15",
      startDate: "2024-04-01",
      daysRequested: 14,
      mode: "court",
      direction: "after",
      skipped: { weekends: 4, holidays: ["2024-04-08"] },
      certificate: "sha256:pqr678",
      latencyMs: 0.8,
    });
    expect(parsed.verdict).toBe("PASS");
    expect(parsed.mode).toBe("court");
    expect(parsed.skipped.holidays).toHaveLength(1);
  });
});
