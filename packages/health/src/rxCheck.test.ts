import { describe, it, expect } from "vitest";
import { rxCheck } from "./rxCheck.js";

// ── Required test cases (from spec) ─────────────────────────────────────────

describe("rxCheck — interaction checks", () => {
  it("warfarin + ibuprofen → BLOCK (major interaction)", () => {
    const result = rxCheck({
      medications: [{ name: "warfarin" }, { name: "ibuprofen" }],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(
      result.findings.some(
        (f) => f.type === "interaction" && f.severity === "major"
      )
    ).toBe(true);
    expect(result.findings.some((f) => f.drugs.includes("warfarin"))).toBe(true);
    expect(result.findings.some((f) => f.drugs.includes("ibuprofen"))).toBe(true);
  });

  it("phenelzine (MAOI) + fluoxetine (SSRI) → BLOCK (contraindicated)", () => {
    const result = rxCheck({
      medications: [{ name: "phenelzine" }, { name: "fluoxetine" }],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(
      result.findings.some(
        (f) => f.type === "interaction" && f.severity === "contraindicated"
      )
    ).toBe(true);
    expect(result.counts.contraindicated).toBeGreaterThanOrEqual(1);
  });

  it("interaction check is order-independent (fluoxetine before phenelzine)", () => {
    const result = rxCheck({
      medications: [{ name: "fluoxetine" }, { name: "phenelzine" }],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(
      result.findings.some((f) => f.severity === "contraindicated")
    ).toBe(true);
  });

  it("brand names resolve to generics for interaction lookup (Prozac + Nardil)", () => {
    const result = rxCheck({
      medications: [{ name: "Prozac" }, { name: "Nardil" }],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.severity === "contraindicated")).toBe(true);
  });
});

describe("rxCheck — dose checks", () => {
  it("acetaminophen 1000 mg × 6/day (6000 mg > 4000 mg max) → BLOCK", () => {
    const result = rxCheck({
      medications: [
        { name: "acetaminophen", dose: 1000, unit: "mg", frequencyPerDay: 6 },
      ],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(
      result.findings.some((f) => f.type === "dose" && f.severity === "major")
    ).toBe(true);
  });

  it("acetaminophen 5000 mg × 2/day (10000 mg ≥ 2× max) → BLOCK (contraindicated)", () => {
    const result = rxCheck({
      medications: [
        { name: "acetaminophen", dose: 5000, unit: "mg", frequencyPerDay: 2 },
      ],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(
      result.findings.some(
        (f) => f.type === "dose" && f.severity === "contraindicated"
      )
    ).toBe(true);
  });

  it("within-range dose does not trigger a dose finding", () => {
    const result = rxCheck({
      medications: [
        { name: "acetaminophen", dose: 500, unit: "mg", frequencyPerDay: 4 },
      ],
    });
    expect(result.findings.filter((f) => f.type === "dose")).toHaveLength(0);
  });
});

describe("rxCheck — unit checks", () => {
  it("levothyroxine 100 mg (canonical: mcg) → BLOCK (unit error, 1000× risk)", () => {
    const result = rxCheck({
      medications: [{ name: "levothyroxine", dose: 100, unit: "mg" }],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(
      result.findings.some((f) => f.type === "unit" && f.severity === "major")
    ).toBe(true);
    expect(result.findings[0]?.message).toMatch(/1000/);
  });

  it("levothyroxine 100 mcg → no unit finding (canonical unit)", () => {
    const result = rxCheck({
      medications: [{ name: "levothyroxine", dose: 100, unit: "mcg" }],
    });
    expect(result.findings.filter((f) => f.type === "unit")).toHaveLength(0);
  });

  it("levothyroxine brand 'Synthroid' 200 mg → BLOCK (unit error)", () => {
    const result = rxCheck({
      medications: [{ name: "Synthroid", dose: 200, unit: "mg" }],
    });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.type === "unit")).toBe(true);
  });

  it("ibuprofen with completely unknown unit → moderate finding", () => {
    const result = rxCheck({
      medications: [{ name: "ibuprofen", dose: 400, unit: "tablespoons" }],
    });
    expect(result.findings.some((f) => f.type === "unit" && f.severity === "moderate")).toBe(
      true
    );
  });
});

describe("rxCheck — safe cases", () => {
  it("amoxicillin 500 mg × 3/day → PASS", () => {
    const result = rxCheck({
      medications: [
        { name: "amoxicillin", dose: 500, unit: "mg", frequencyPerDay: 3 },
      ],
    });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });

  it("single known medication with no dose → PASS", () => {
    const result = rxCheck({
      medications: [{ name: "lisinopril" }],
    });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });

  it("empty medication list → PASS", () => {
    const result = rxCheck({ medications: [] });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });
});

describe("rxCheck — unknown drugs", () => {
  it("unknown drug is handled gracefully (no crash)", () => {
    expect(() =>
      rxCheck({ medications: [{ name: "xyzqualonium" }] })
    ).not.toThrow();
  });

  it("unknown drug produces an informational finding", () => {
    const result = rxCheck({ medications: [{ name: "xyzqualonium" }] });
    expect(result).toBeDefined();
    expect(result.verdict).toBeDefined();
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.drugs.includes("xyzqualonium"))).toBe(
      true
    );
  });

  it("unknown drug does not BLOCK with default policy", () => {
    // 'low' severity → below 'major' threshold → FLAG, not BLOCK
    const result = rxCheck({ medications: [{ name: "unknowndrugxyz" }] });
    expect(result.verdict).not.toBe("BLOCK");
  });

  it("unknown drug mixed with a safe known drug → no interaction crash", () => {
    const result = rxCheck({
      medications: [{ name: "amoxicillin" }, { name: "unknownxyzabc" }],
    });
    expect(result).toBeDefined();
    // No interaction finding for the unknown drug
    expect(
      result.findings.filter((f) => f.type === "interaction")
    ).toHaveLength(0);
  });
});

describe("rxCheck — certificate", () => {
  it("certificate is present and has sha256 format", () => {
    const result = rxCheck({
      medications: [{ name: "amoxicillin", dose: 500, unit: "mg", frequencyPerDay: 3 }],
    });
    expect(result.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("certificate differs for different inputs", () => {
    const r1 = rxCheck({ medications: [{ name: "amoxicillin" }] });
    const r2 = rxCheck({ medications: [{ name: "warfarin" }] });
    expect(r1.certificate).not.toBe(r2.certificate);
  });

  it("both calls produce valid certificate format", () => {
    const r1 = rxCheck({ medications: [{ name: "warfarin" }, { name: "ibuprofen" }] });
    const r2 = rxCheck({ medications: [{ name: "phenelzine" }, { name: "fluoxetine" }] });
    expect(r1.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(r2.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe("rxCheck — disclaimer", () => {
  it("disclaimer is always present", () => {
    const result = rxCheck({ medications: [{ name: "amoxicillin" }] });
    expect(result.disclaimer).toBeTruthy();
  });

  it("disclaimer states the result is not medical advice", () => {
    const result = rxCheck({ medications: [{ name: "warfarin" }] });
    expect(result.disclaimer.toLowerCase()).toMatch(/not medical advice|not constitute medical advice/);
  });
});

describe("rxCheck — counts and verdict consistency", () => {
  it("counts reflect the number of findings per severity", () => {
    const result = rxCheck({
      medications: [{ name: "warfarin" }, { name: "ibuprofen" }],
    });
    const sumFromCounts =
      result.counts.low +
      result.counts.moderate +
      result.counts.major +
      result.counts.contraindicated;
    expect(sumFromCounts).toBe(result.findings.length);
    expect(result.counts.major).toBeGreaterThan(0);
  });

  it("latencyMs is a non-negative number", () => {
    const result = rxCheck({ medications: [{ name: "amoxicillin" }] });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("policy.blockSeverityAtOrAbove=contraindicated: major finding → FLAG not BLOCK", () => {
    const result = rxCheck({
      medications: [{ name: "warfarin" }, { name: "ibuprofen" }],
      policy: { blockSeverityAtOrAbove: "contraindicated" },
    });
    // Warfarin + ibuprofen is 'major', which is below 'contraindicated'
    expect(result.verdict).toBe("FLAG");
  });

  it("policy.blockSeverityAtOrAbove=moderate: moderate finding → BLOCK", () => {
    // fluoxetine + ibuprofen is 'moderate' per interactions dataset
    const result = rxCheck({
      medications: [{ name: "fluoxetine" }, { name: "ibuprofen" }],
      policy: { blockSeverityAtOrAbove: "moderate" },
    });
    expect(result.verdict).toBe("BLOCK");
  });
});

describe("rxCheck — weight-based pediatric dose check", () => {
  it("amoxicillin 100 mg/kg/day (above 90 mg/kg max) for 20 kg child → BLOCK", () => {
    const result = rxCheck({
      medications: [
        { name: "amoxicillin", dose: 500, unit: "mg", frequencyPerDay: 4 },
      ],
      // 500 × 4 = 2000 mg/day; 90 mg/kg × 20 kg = 1800 mg max
      patient: { weightKg: 20 },
    });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.type === "dose" && f.severity === "major")).toBe(true);
  });
});
