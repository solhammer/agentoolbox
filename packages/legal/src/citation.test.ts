import { describe, it, expect } from "vitest";
import { checkCitation } from "./citation.js";
import { generateCertificate } from "./certificate.js";

const CERT_RE = /^sha256:[0-9a-f]{64}$/;

describe("checkCitation — valid citations", () => {
  it("PASSes a well-known valid citation: 347 U.S. 483 (1954)", () => {
    const r = checkCitation({ citation: "347 U.S. 483 (1954)" });
    expect(r.verdict).toBe("PASS");
    expect(r.citations).toHaveLength(1);
    const c = r.citations[0]!;
    expect(c.valid).toBe(true);
    expect(c.issues).toHaveLength(0);
    expect(c.parsed).toEqual({ volume: 347, reporter: "U.S.", page: 483, year: 1954 });
    expect(r.counts.total).toBe(1);
    expect(r.counts.invalid).toBe(0);
  });

  it("PASSes a multi-word reporter: 56 F. Supp. 2d 789 (2001)", () => {
    const r = checkCitation({ citation: "56 F. Supp. 2d 789 (2001)" });
    expect(r.verdict).toBe("PASS");
    expect(r.citations[0]!.valid).toBe(true);
    expect(r.citations[0]!.parsed?.reporter).toBe("F. Supp. 2d");
  });

  it("PASSes multiple valid citations", () => {
    const r = checkCitation({
      citations: ["347 U.S. 483 (1954)", "410 U.S. 113 (1973)"],
    });
    expect(r.verdict).toBe("PASS");
    expect(r.counts.total).toBe(2);
    expect(r.counts.invalid).toBe(0);
  });
});

describe("checkCitation — malformed citations", () => {
  it("BLOCKs 'abc U.S. 483' — missing year, non-numeric volume", () => {
    const r = checkCitation({ citation: "abc U.S. 483" });
    expect(r.verdict).toBe("BLOCK");
    const c = r.citations[0]!;
    expect(c.valid).toBe(false);
    expect(c.issues.length).toBeGreaterThan(0);
    expect(c.issues[0]).toMatch(/malformed/i);
    expect(r.counts.invalid).toBe(1);
  });

  it("BLOCKs '347 Zz 483 (1954)' — unknown reporter (treated as soft, but Zz is unknown → FLAG... wait, but no other issues)", () => {
    // Unknown reporter is a soft issue → FLAG
    const r = checkCitation({ citation: "347 Zz 483 (1954)" });
    expect(r.verdict).toBe("FLAG");
    const c = r.citations[0]!;
    expect(c.valid).toBe(false);
    expect(c.issues.some((i) => i.includes("unknown reporter"))).toBe(true);
    expect(c.parsed?.reporter).toBe("Zz");
  });

  it("BLOCKs an implausible future year", () => {
    const r = checkCitation({ citation: "347 U.S. 483 (2999)" });
    expect(r.verdict).toBe("BLOCK");
    const c = r.citations[0]!;
    expect(c.valid).toBe(false);
    expect(c.issues.some((i) => i.includes("implausible year"))).toBe(true);
  });

  it("BLOCKs an implausible historical year (before 1754)", () => {
    const r = checkCitation({ citation: "1 U.S. 1 (1700)" });
    expect(r.verdict).toBe("BLOCK");
    const c = r.citations[0]!;
    expect(c.valid).toBe(false);
    expect(c.issues.some((i) => i.includes("implausible year"))).toBe(true);
  });

  it("BLOCKs a citation with no parenthesised year at all", () => {
    const r = checkCitation({ citation: "347 U.S. 483" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.citations[0]!.issues[0]).toMatch(/malformed/i);
  });
});

describe("checkCitation — multiple citations mixed validity", () => {
  it("BLOCKs when any citation is hard-invalid", () => {
    const r = checkCitation({
      citations: ["347 U.S. 483 (1954)", "abc bad"],
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.counts.invalid).toBe(1);
    expect(r.citations[0]!.valid).toBe(true);
    expect(r.citations[1]!.valid).toBe(false);
  });

  it("FLAGs when only unknown-reporter citations are present", () => {
    const r = checkCitation({
      citations: ["347 U.S. 483 (1954)", "100 Zz. 200 (2000)"],
    });
    expect(r.verdict).toBe("FLAG");
    expect(r.counts.invalid).toBe(1);
  });
});

describe("checkCitation — quote fidelity", () => {
  const sourceText =
    "We conclude that in the field of public education the doctrine of separate but equal has no place.";

  it("PASSes when quote is found in source text", () => {
    const r = checkCitation({
      citation: "347 U.S. 483 (1954)",
      sourceText,
      quote: "separate but equal has no place",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.quoteCheck).toBeDefined();
    expect(r.quoteCheck!.found).toBe(true);
  });

  it("BLOCKs when quote is NOT found in source text", () => {
    const r = checkCitation({
      citation: "347 U.S. 483 (1954)",
      sourceText,
      quote: "this quote does not appear in the source text at all",
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.quoteCheck!.found).toBe(false);
    expect(r.quoteCheck!.message).toMatch(/not found/i);
  });

  it("quote check is case-insensitive and whitespace-normalised", () => {
    const r = checkCitation({
      citation: "347 U.S. 483 (1954)",
      sourceText,
      quote: "SEPARATE   BUT    EQUAL",
    });
    expect(r.quoteCheck!.found).toBe(true);
  });

  it("does not include quoteCheck when only sourceText is provided", () => {
    const r = checkCitation({
      citation: "347 U.S. 483 (1954)",
      sourceText,
    });
    expect(r.quoteCheck).toBeUndefined();
  });

  it("does not include quoteCheck when only quote is provided", () => {
    const r = checkCitation({
      citation: "347 U.S. 483 (1954)",
      quote: "separate but equal",
    });
    expect(r.quoteCheck).toBeUndefined();
  });
});

describe("checkCitation — certificate & latency", () => {
  it("returns a well-formed certificate", () => {
    const r = checkCitation({ citation: "347 U.S. 483 (1954)" });
    expect(r.certificate).toMatch(CERT_RE);
    expect(typeof r.latencyMs).toBe("number");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("generateCertificate is deterministic for fixed inputs", () => {
    const a = generateCertificate("subject", "PASS", 0, 12345);
    const b = generateCertificate("subject", "PASS", 0, 12345);
    expect(a).toBe(b);
    expect(a).toMatch(CERT_RE);
  });

  it("certificate changes when verdict changes", () => {
    const a = generateCertificate("subject", "PASS", 0, 12345);
    const b = generateCertificate("subject", "BLOCK", 0, 12345);
    expect(a).not.toBe(b);
  });

  it("throws when neither citation nor citations is provided", () => {
    expect(() => checkCitation({})).toThrow();
  });
});
