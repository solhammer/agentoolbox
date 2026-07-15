import { describe, it, expect } from "vitest";
import { screenSanctions } from "./screen.js";
import { generateCertificate } from "./certificate.js";
import { jaroWinkler } from "./match.js";

const CERT_RE = /^sha256:[0-9a-f]{64}$/;

describe("screenSanctions — exact & alias", () => {
  it("BLOCKs an exact listed name", () => {
    const r = screenSanctions({ name: "Wagner Group" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.matches.length).toBeGreaterThan(0);
    const top = r.matches[0]!;
    expect(top.matchType).toBe("exact");
    expect(top.score).toBe(1);
    expect(top.listedName).toBe("Wagner Group");
  });

  it("BLOCKs on an alias and reports matchedAlias + primary listedName", () => {
    const r = screenSanctions({ name: "Hezbollah" });
    expect(r.verdict).toBe("BLOCK");
    const top = r.matches[0]!;
    expect(top.matchType).toBe("alias");
    expect(top.matchedAlias).toBe("Hezbollah");
    expect(top.listedName).toBe("Hizballah");
  });

  it("is case- and diacritic-insensitive", () => {
    const r = screenSanctions({ name: "SÍNALOA cartél" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.matches[0]!.listedName).toBe("Sinaloa Cartel");
  });

  it("matches regardless of token order (fuzzy key)", () => {
    const r = screenSanctions({ name: "Iran Bank Melli" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.matches[0]!.listedName).toBe("Bank Melli Iran");
    expect(r.matches[0]!.score).toBe(1);
  });
});

describe("screenSanctions — clean input", () => {
  it("PASSes an obviously unlisted name", () => {
    const r = screenSanctions({ name: "Global Widgets International LLC" });
    expect(r.verdict).toBe("PASS");
    expect(r.matches).toHaveLength(0);
    expect(r.counts.total).toBe(0);
  });
});

describe("screenSanctions — fuzzy", () => {
  it("BLOCKs a close typo (score ≥ 0.92)", () => {
    const r = screenSanctions({ name: "Sberbnak" });
    expect(r.verdict).toBe("BLOCK");
    const top = r.matches[0]!;
    expect(top.matchType).toBe("fuzzy");
    expect(top.score).toBeGreaterThanOrEqual(0.92);
    expect(top.score).toBeLessThan(1);
  });

  it("FLAGs a mid-similarity near-miss (0.85 ≤ score < 0.92)", () => {
    const r = screenSanctions({ name: "Zbrebank" });
    expect(r.verdict).toBe("FLAG");
    const top = r.matches[0]!;
    expect(top.matchType).toBe("fuzzy");
    expect(top.score).toBeGreaterThanOrEqual(0.85);
    expect(top.score).toBeLessThan(0.92);
  });

  it("does not fuzzy-match when fuzzy:false", () => {
    const r = screenSanctions({ name: "Sberbnak", fuzzy: false });
    expect(r.verdict).toBe("PASS");
    expect(r.matches).toHaveLength(0);
  });

  it("respects minScore as the reporting floor", () => {
    // A typo scores < 1, so a floor of 1 excludes it (only exact/alias remain).
    const r = screenSanctions({ name: "Sberbnak", minScore: 1 });
    expect(r.verdict).toBe("PASS");
    expect(r.matches).toHaveLength(0);
  });
});

describe("screenSanctions — filters", () => {
  it("restricts screening to the requested lists", () => {
    const r = screenSanctions({ name: "Huawei", lists: ["OFAC-CONSOLIDATED"] });
    expect(r.screened).toBe(5);
    expect(r.verdict).toBe("BLOCK");
    expect(r.matches[0]!.listedName).toBe("Huawei Technologies Co Ltd");
  });

  it("restricts screening to the requested entity types", () => {
    const r = screenSanctions({ name: "Adrian Darya 1", entityTypes: ["vessel"] });
    expect(r.screened).toBe(1);
    expect(r.verdict).toBe("BLOCK");
    expect(r.matches[0]!.matchedAlias).toBeUndefined();
  });
});

describe("screenSanctions — multiple names & metadata", () => {
  it("screens several names and BLOCKs if any hits", () => {
    const r = screenSanctions({ names: ["John Q Public", "Kim Jong Un"] });
    expect(r.verdict).toBe("BLOCK");
    expect(r.matches.some((m) => m.query === "Kim Jong Un")).toBe(true);
  });

  it("returns a well-formed certificate and dataset date", () => {
    const r = screenSanctions({ name: "Wagner Group" });
    expect(r.certificate).toMatch(CERT_RE);
    expect(r.datasetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof r.latencyMs).toBe("number");
  });
});

describe("certificate & similarity primitives", () => {
  it("generateCertificate is deterministic for fixed inputs", () => {
    const a = generateCertificate("subject", "BLOCK", 2, 1000);
    const b = generateCertificate("subject", "BLOCK", 2, 1000);
    expect(a).toBe(b);
    expect(a).toMatch(CERT_RE);
  });

  it("jaroWinkler is 1 for identical strings and ordered by similarity", () => {
    expect(jaroWinkler("SBERBANK", "SBERBANK")).toBe(1);
    const near = jaroWinkler("SBERBANK", "SBERBNAK");
    const far = jaroWinkler("SBERBANK", "GLOBALWIDGETS");
    expect(near).toBeGreaterThan(far);
  });
});
