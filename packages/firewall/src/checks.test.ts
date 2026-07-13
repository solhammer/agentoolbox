import { describe, it, expect } from "vitest";
import { checkCitations, checkNumericContradictions } from "./checks.js";

describe("checkCitations", () => {
  it("passes well-formed DOI", () => {
    const text = "See 10.1145/3491102.3502013 for details.";
    const result = checkCitations(text);
    expect(result).toHaveLength(0);
  });

  it("flags malformed DOI", () => {
    const text = "See 10.999 for details.";
    const result = checkCitations(text);
    expect(result.some((c) => c.checkType === "malformed_doi")).toBe(true);
  });

  it("passes well-formed arXiv ID (new format)", () => {
    const text = "See arXiv:2401.12345 for details.";
    const result = checkCitations(text);
    expect(result).toHaveLength(0);
  });

  it("passes well-formed arXiv ID (old format)", () => {
    const text = "See arXiv:hep-th/9801001 for details.";
    const result = checkCitations(text);
    expect(result).toHaveLength(0);
  });

  it("flags malformed arXiv ID", () => {
    const text = "See arXiv:12345 for details.";
    const result = checkCitations(text);
    expect(result.some((c) => c.checkType === "malformed_arxiv_id")).toBe(true);
  });
});

describe("checkNumericContradictions", () => {
  it("flags percentage exceeding 100%", () => {
    const text = "Accuracy improved from 80% to 150%.";
    const result = checkNumericContradictions(text);
    expect(result.some((c) => c.checkType === "numeric_contradiction")).toBe(true);
  });

  it("flags contradictory increase/decrease language", () => {
    const text = "Performance improved but also decreased from 90% to 70%.";
    const result = checkNumericContradictions(text);
    expect(result.some((c) => c.checkType === "numeric_contradiction")).toBe(true);
  });

  it("passes normal percentage sentence", () => {
    const text = "Accuracy improved from 70% to 90%.";
    const result = checkNumericContradictions(text);
    expect(result).toHaveLength(0);
  });
});
