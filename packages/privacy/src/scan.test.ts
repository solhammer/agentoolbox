import { describe, it, expect } from "vitest";
import { scanPii } from "./scan.js";
import { ibanValid, luhn, nhsValid } from "./checksums.js";

describe("scanPii — clean input", () => {
  it("passes text with no personal data", () => {
    const r = scanPii({ text: "The quarterly report is due next Friday." });
    expect(r.verdict).toBe("PASS");
    expect(r.safe).toBe(true);
    expect(r.totalFindings).toBe(0);
    expect(r.entities).toHaveLength(0);
    expect(r.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
    // redaction on by default, but with nothing to redact the text is unchanged
    expect(r.redactedText).toBe("The quarterly report is due next Friday.");
  });
});

describe("scanPii — PCI (payment cards)", () => {
  it("blocks a Luhn-valid card and never echoes the raw value", () => {
    const r = scanPii({ text: "Charge card 4111 1111 1111 1111 today." });
    expect(r.verdict).toBe("BLOCK");
    expect(r.categories).toContain("PCI");
    const card = r.entities.find((e) => e.type === "credit_card");
    expect(card).toBeDefined();
    expect(card?.validated).toBe(true);
    expect(card?.match).not.toContain("4111");
    expect(r.redactedText).toContain("[REDACTED_CREDIT_CARD]");
    expect(r.redactedText).not.toContain("4111");
  });

  it("ignores a number that fails the Luhn check", () => {
    const r = scanPii({ text: "Ref 4111 1111 1111 1112 is not a card." });
    expect(r.safe).toBe(true);
    expect(r.verdict).toBe("PASS");
  });
});

describe("scanPii — PII (SSN)", () => {
  it("blocks a structurally valid US SSN", () => {
    const r = scanPii({ text: "SSN: 219-09-9999 on file." });
    expect(r.verdict).toBe("BLOCK");
    const ssn = r.entities.find((e) => e.type === "us_ssn");
    expect(ssn?.jurisdiction).toBe("US");
    expect(ssn?.category).toBe("PII");
  });
});

describe("scanPii — PCI (IBAN)", () => {
  it("blocks a mod-97-valid IBAN", () => {
    const r = scanPii({ text: "Wire to GB82WEST12345698765432 please." });
    expect(r.verdict).toBe("BLOCK");
    expect(r.entities.some((e) => e.type === "iban" && e.validated)).toBe(true);
  });
});

describe("scanPii — PHI (UK NHS number)", () => {
  it("blocks a mod-11-valid NHS number as PHI", () => {
    const r = scanPii({ text: "Patient NHS 943 476 5919 admitted." });
    const nhs = r.entities.find((e) => e.type === "uk_nhs");
    expect(nhs).toBeDefined();
    expect(nhs?.category).toBe("PHI");
    expect(r.verdict).toBe("BLOCK");
  });
});

describe("scanPii — verdict thresholds & enforcement modes", () => {
  it("flags (not blocks) a lone email at the default threshold", () => {
    const r = scanPii({ text: "Reach me at jane.doe@example.com" });
    expect(r.safe).toBe(false);
    expect(r.verdict).toBe("FLAG"); // medium severity < default 'high' threshold
  });

  it("blocks an email when blockSeverityAtOrAbove is 'medium'", () => {
    const r = scanPii({
      text: "Reach me at jane.doe@example.com",
      policy: { blockSeverityAtOrAbove: "medium" },
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("downgrades BLOCK to FLAG in 'flag' mode", () => {
    const r = scanPii({
      text: "Card 4111 1111 1111 1111",
      policy: { mode: "flag" },
    });
    expect(r.entities.length).toBeGreaterThan(0);
    expect(r.verdict).toBe("FLAG");
  });

  it("never blocks in 'audit' mode but still reports entities", () => {
    const r = scanPii({
      text: "Card 4111 1111 1111 1111",
      policy: { mode: "audit" },
    });
    expect(r.verdict).toBe("PASS");
    expect(r.safe).toBe(false);
    expect(r.totalFindings).toBeGreaterThan(0);
  });
});

describe("scanPii — policy: allowTypes & redact", () => {
  it("ignores entity types listed in allowTypes", () => {
    const r = scanPii({
      text: "Card 4111 1111 1111 1111",
      policy: { allowTypes: ["credit_card"] },
    });
    expect(r.safe).toBe(true);
    expect(r.verdict).toBe("PASS");
  });

  it("omits redactedText when redact is false", () => {
    const r = scanPii({
      text: "SSN: 219-09-9999",
      policy: { redact: false },
    });
    expect(r.redactedText).toBeUndefined();
  });
});

describe("checksums", () => {
  it("luhn validates known card numbers", () => {
    expect(luhn("4111111111111111")).toBe(true);
    expect(luhn("4111111111111112")).toBe(false);
  });

  it("ibanValid validates a known IBAN", () => {
    expect(ibanValid("GB82WEST12345698765432")).toBe(true);
    expect(ibanValid("GB82WEST12345698765433")).toBe(false);
  });

  it("nhsValid validates a known NHS number", () => {
    expect(nhsValid("9434765919")).toBe(true);
    expect(nhsValid("9434765918")).toBe(false);
  });
});
