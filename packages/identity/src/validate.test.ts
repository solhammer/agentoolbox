import { describe, it, expect } from "vitest";
import { validateIdentifier } from "./validate.js";
import { keccak256 } from "./validators/keccak.js";

// ---------------------------------------------------------------------------
// IBAN
// ---------------------------------------------------------------------------
describe("IBAN", () => {
  it("accepts a valid German IBAN", () => {
    // DE89370400440532013000 — a commonly cited valid DE IBAN
    const r = validateIdentifier({ value: "DE89370400440532013000", type: "iban" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.results[0]?.detail).toBe("DE");
    expect(r.verdict).toBe("PASS");
  });

  it("rejects an IBAN with wrong check digits", () => {
    const r = validateIdentifier({ value: "DE00370400440532013000", type: "iban" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
    expect(r.verdict).toBe("BLOCK");
  });

  it("accepts a valid GB IBAN", () => {
    const r = validateIdentifier({ value: "GB29NWBK60161331926819", type: "iban" });
    expect(r.results[0]?.valid).toBe(true);
  });

  it("rejects unknown country code", () => {
    const r = validateIdentifier({ value: "XX29123456789012345678", type: "iban" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("handles spaces in IBAN input", () => {
    const r = validateIdentifier({ value: "DE89 3704 0044 0532 0130 00", type: "iban" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.normalized).toBe("DE89370400440532013000");
  });
});

// ---------------------------------------------------------------------------
// ABA Routing
// ---------------------------------------------------------------------------
describe("ABA Routing", () => {
  it("accepts a valid ABA routing number (021000021 — JPMorgan Chase)", () => {
    const r = validateIdentifier({ value: "021000021", type: "aba_routing" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.verdict).toBe("PASS");
  });

  it("rejects an ABA routing number with wrong checksum", () => {
    const r = validateIdentifier({ value: "021000022", type: "aba_routing" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });

  it("rejects non-9-digit input", () => {
    const r = validateIdentifier({ value: "12345678", type: "aba_routing" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("accepts Wells Fargo routing 121042882", () => {
    const r = validateIdentifier({ value: "121042882", type: "aba_routing" });
    expect(r.results[0]?.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SWIFT BIC
// ---------------------------------------------------------------------------
describe("SWIFT BIC", () => {
  it("accepts an 8-char BIC", () => {
    const r = validateIdentifier({ value: "DEUTDEDB", type: "swift_bic" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.detail).toBe("DE");
    expect(r.verdict).toBe("PASS");
  });

  it("accepts an 11-char BIC with branch code", () => {
    const r = validateIdentifier({ value: "DEUTDEDBFRA", type: "swift_bic" });
    expect(r.results[0]?.valid).toBe(true);
  });

  it("rejects a BIC with wrong length", () => {
    const r = validateIdentifier({ value: "DEUTDE", type: "swift_bic" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects a BIC with invalid structure", () => {
    const r = validateIdentifier({ value: "1234DEDB", type: "swift_bic" });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Credit Card
// ---------------------------------------------------------------------------
describe("Credit Card", () => {
  it("accepts a valid Visa test card (4111111111111111)", () => {
    const r = validateIdentifier({ value: "4111111111111111", type: "credit_card" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.results[0]?.detail).toBe("Visa");
    expect(r.verdict).toBe("PASS");
  });

  it("masks the PAN — never echoes full card number", () => {
    const r = validateIdentifier({ value: "4111111111111111", type: "credit_card" });
    const entry = r.results[0]!;
    expect(entry.value).not.toContain("411111111111");
    expect(entry.value).toContain("1111"); // last 4 present
    expect(entry.normalized).not.toContain("411111111111");
  });

  it("accepts a valid Mastercard (5500005555555559)", () => {
    const r = validateIdentifier({ value: "5500005555555559", type: "credit_card" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.detail).toBe("Mastercard");
  });

  it("accepts a valid Amex (378282246310005)", () => {
    const r = validateIdentifier({ value: "378282246310005", type: "credit_card" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.detail).toBe("Amex");
  });

  it("rejects a card failing Luhn", () => {
    const r = validateIdentifier({ value: "4111111111111112", type: "credit_card" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// EIN
// ---------------------------------------------------------------------------
describe("EIN", () => {
  it("accepts a valid EIN with known prefix", () => {
    const r = validateIdentifier({ value: "12-3456789", type: "ein" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.verdict).toBe("PASS");
  });

  it("rejects an EIN with invalid prefix (07)", () => {
    const r = validateIdentifier({ value: "07-1234567", type: "ein" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.verdict).toBe("BLOCK");
  });

  it("normalizes to XX-XXXXXXX format", () => {
    const r = validateIdentifier({ value: "123456789", type: "ein" });
    expect(r.results[0]?.normalized).toBe("12-3456789");
  });

  it("rejects EIN with wrong format", () => {
    const r = validateIdentifier({ value: "1-23456789", type: "ein" });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VAT EU
// ---------------------------------------------------------------------------
describe("VAT EU", () => {
  it("accepts a valid German VAT (DE114103379)", () => {
    // DE114103379 — check digit 9 verified by the iterative MOD-11 algorithm
    const r = validateIdentifier({ value: "DE114103379", type: "vat_eu" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.results[0]?.detail).toBe("Germany");
    expect(r.verdict).toBe("PASS");
  });

  it("rejects a German VAT with wrong check digit", () => {
    // Same as above but last digit changed from 9 to 1
    const r = validateIdentifier({ value: "DE114103371", type: "vat_eu" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });

  it("accepts a valid Italian VAT (IT00159560366)", () => {
    // Ferrero SpA VAT number
    const r = validateIdentifier({ value: "IT00159560366", type: "vat_eu" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.results[0]?.detail).toBe("Italy");
  });

  it("rejects an Italian VAT with wrong check digit", () => {
    const r = validateIdentifier({ value: "IT00159560367", type: "vat_eu" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });

  it("accepts a valid Belgian VAT (BE0136695962 — format only)", () => {
    const r = validateIdentifier({ value: "BE0136695962", type: "vat_eu" });
    // BE uses format-only, so valid if format matches
    expect(r.results[0]?.checksum).toBe("not_applicable");
    expect(r.results[0]?.detail).toBe("Belgium");
  });

  it("rejects an unknown EU country code", () => {
    const r = validateIdentifier({ value: "XX123456789", type: "vat_eu" });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VIN
// ---------------------------------------------------------------------------
describe("VIN", () => {
  it("accepts a valid VIN (1HGCM82633A004352)", () => {
    const r = validateIdentifier({ value: "1HGCM82633A004352", type: "vin" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.verdict).toBe("PASS");
  });

  it("rejects a VIN with wrong check digit", () => {
    // Change check digit from 3 to 4
    const r = validateIdentifier({ value: "1HGCM82644A004352", type: "vin" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });

  it("rejects a VIN with I, O, or Q characters", () => {
    const r = validateIdentifier({ value: "1HGCM826I3A004352", type: "vin" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects a VIN that is not 17 characters", () => {
    const r = validateIdentifier({ value: "1HGCM82633A00435", type: "vin" });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NPI
// ---------------------------------------------------------------------------
describe("NPI", () => {
  it("accepts a valid NPI (1234567893)", () => {
    const r = validateIdentifier({ value: "1234567893", type: "npi" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
    expect(r.verdict).toBe("PASS");
  });

  it("rejects an NPI with wrong check digit", () => {
    const r = validateIdentifier({ value: "1234567890", type: "npi" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });

  it("rejects non-10-digit input", () => {
    const r = validateIdentifier({ value: "123456789", type: "npi" });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SSN
// ---------------------------------------------------------------------------
describe("SSN", () => {
  it("accepts a structurally valid SSN", () => {
    const r = validateIdentifier({ value: "001-01-0001", type: "ssn" });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.verdict).toBe("PASS");
  });

  it("masks SSN to last 4 digits", () => {
    const r = validateIdentifier({ value: "123-45-6789", type: "ssn" });
    const entry = r.results[0]!;
    expect(entry.value).toBe("***-**-6789");
    expect(entry.normalized).toBe("***-**-6789");
    // Must not contain area or group
    expect(entry.value).not.toContain("123");
    expect(entry.value).not.toContain("45");
  });

  it("rejects SSN with area 000", () => {
    const r = validateIdentifier({ value: "000-01-0001", type: "ssn" });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.detail).toContain("000");
  });

  it("rejects SSN with area 666", () => {
    const r = validateIdentifier({ value: "666-01-0001", type: "ssn" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects SSN with area 900-999", () => {
    const r = validateIdentifier({ value: "900-01-0001", type: "ssn" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects SSN with group 00", () => {
    const r = validateIdentifier({ value: "123-00-0001", type: "ssn" });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects SSN with serial 0000", () => {
    const r = validateIdentifier({ value: "123-01-0000", type: "ssn" });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ETH Address
// ---------------------------------------------------------------------------
describe("ETH Address", () => {
  it("accepts a valid all-lowercase ETH address", () => {
    const r = validateIdentifier({
      value: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
      type: "eth_address",
    });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("not_applicable");
    expect(r.verdict).toBe("PASS");
  });

  it("accepts a valid EIP-55 checksummed address", () => {
    // EIP-55 checksummed form of the Ethereum Foundation address
    const r = validateIdentifier({
      value: "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
      type: "eth_address",
    });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[0]?.checksum).toBe("pass");
  });

  it("rejects an ETH address with invalid EIP-55 checksum", () => {
    // Valid format but wrong casing (flip a letter case)
    const r = validateIdentifier({
      value: "0xdE0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
      type: "eth_address",
    });
    expect(r.results[0]?.valid).toBe(false);
    expect(r.results[0]?.checksum).toBe("fail");
  });

  it("rejects an address that is too short", () => {
    const r = validateIdentifier({
      value: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697",
      type: "eth_address",
    });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects an address without 0x prefix", () => {
    const r = validateIdentifier({
      value: "de0b295669a9fd93d5f28d9ec85e40f4cb697bae",
      type: "eth_address",
    });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Solana Address
// ---------------------------------------------------------------------------
describe("SOL Address", () => {
  it("accepts a valid Solana address (System Program)", () => {
    // Solana System Program: 11111111111111111111111111111111
    const r = validateIdentifier({
      value: "11111111111111111111111111111111",
      type: "sol_address",
    });
    expect(r.results[0]?.valid).toBe(true);
    expect(r.verdict).toBe("PASS");
  });

  it("accepts a typical Solana mainnet address", () => {
    const r = validateIdentifier({
      value: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
      type: "sol_address",
    });
    expect(r.results[0]?.valid).toBe(true);
  });

  it("rejects an address with invalid base58 characters (0, O, I, l)", () => {
    const r = validateIdentifier({
      value: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFi0",
      type: "sol_address",
    });
    expect(r.results[0]?.valid).toBe(false);
  });

  it("rejects an address that is too short", () => {
    const r = validateIdentifier({
      value: "abc",
      type: "sol_address",
    });
    expect(r.results[0]?.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Auto-detection
// ---------------------------------------------------------------------------
describe("Auto-detection", () => {
  it("detects ETH address by 0x prefix", () => {
    const r = validateIdentifier({
      value: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
    });
    expect(r.results[0]?.type).toBe("eth_address");
  });

  it("detects IBAN by country prefix", () => {
    const r = validateIdentifier({ value: "DE89370400440532013000" });
    expect(r.results[0]?.type).toBe("iban");
  });

  it("detects EIN by XX-XXXXXXX format", () => {
    const r = validateIdentifier({ value: "12-3456789" });
    expect(r.results[0]?.type).toBe("ein");
  });

  it("detects SSN by XXX-XX-XXXX format", () => {
    const r = validateIdentifier({ value: "123-45-6789" });
    expect(r.results[0]?.type).toBe("ssn");
  });

  it("detects ABA routing by 9 digits", () => {
    const r = validateIdentifier({ value: "021000021" });
    expect(r.results[0]?.type).toBe("aba_routing");
  });

  it("detects NPI by 10 digits", () => {
    const r = validateIdentifier({ value: "1234567893" });
    expect(r.results[0]?.type).toBe("npi");
  });

  it("detects credit card by digit count and BIN", () => {
    const r = validateIdentifier({ value: "4111111111111111" });
    expect(r.results[0]?.type).toBe("credit_card");
  });

  it("detects SWIFT BIC by alphanumeric structure", () => {
    const r = validateIdentifier({ value: "DEUTDEDB" });
    expect(r.results[0]?.type).toBe("swift_bic");
  });

  it("returns unknown for unrecognized input", () => {
    const r = validateIdentifier({ value: "ZZZZZZ-NOTANID" });
    expect(r.results[0]?.type).toBe("unknown");
    expect(r.verdict).toBe("FLAG");
  });

  it("respects `types` restriction in auto-detection", () => {
    // 9 digits normally auto-detects as aba_routing, but restrict to npi only
    const r = validateIdentifier({ value: "021000021", types: ["npi"] });
    // 9 digits won't match npi (10 digits), so type = unknown
    expect(r.results[0]?.type).toBe("unknown");
    expect(r.verdict).toBe("FLAG");
  });
});

// ---------------------------------------------------------------------------
// Batch via `values`
// ---------------------------------------------------------------------------
describe("Batch via `values`", () => {
  it("validates multiple values and returns correct counts", () => {
    const r = validateIdentifier({
      values: ["021000021", "021000022"],
      type: "aba_routing",
    });
    expect(r.results).toHaveLength(2);
    expect(r.results[0]?.valid).toBe(true);
    expect(r.results[1]?.valid).toBe(false);
    expect(r.counts.total).toBe(2);
    expect(r.counts.invalid).toBe(1);
    expect(r.verdict).toBe("BLOCK");
  });

  it("returns PASS when all batch entries are valid", () => {
    const r = validateIdentifier({
      values: ["DE89370400440532013000", "GB29NWBK60161331926819"],
      type: "iban",
    });
    expect(r.verdict).toBe("PASS");
    expect(r.counts.invalid).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------
describe("Masking", () => {
  it("masks credit card PAN — last 4 only visible", () => {
    const r = validateIdentifier({ value: "4111111111111111", type: "credit_card" });
    const v = r.results[0]!.value;
    expect(v).toMatch(/^\*+(-?\*+)*-?1111$/);
  });

  it("masks SSN — last 4 only visible", () => {
    const r = validateIdentifier({ value: "123-45-6789", type: "ssn" });
    expect(r.results[0]?.value).toBe("***-**-6789");
    expect(r.results[0]?.value).not.toContain("123");
  });
});

// ---------------------------------------------------------------------------
// Certificate format + determinism
// ---------------------------------------------------------------------------
describe("Certificate", () => {
  it("certificate starts with sha256:", () => {
    const r = validateIdentifier({ value: "021000021", type: "aba_routing" });
    expect(r.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("same input produces same verdict and certificate structure", () => {
    const r1 = validateIdentifier({ value: "021000021", type: "aba_routing" });
    const r2 = validateIdentifier({ value: "021000021", type: "aba_routing" });
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.counts).toEqual(r2.counts);
    // Certificate may differ by timestamp, but format should be the same
    expect(r1.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(r2.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Unknown handled gracefully
// ---------------------------------------------------------------------------
describe("Unknown input", () => {
  it("returns FLAG (not crash) for unknown input", () => {
    const r = validateIdentifier({ value: "NOTANYTHING123" });
    expect(r.verdict).toBe("FLAG");
    expect(r.results[0]?.type).toBe("unknown");
    expect(r.results[0]?.valid).toBe(false);
  });

  it("returns FLAG for empty string", () => {
    const r = validateIdentifier({ value: "" });
    expect(r.verdict).toBe("FLAG");
  });

  it("throws if no value or values provided", () => {
    expect(() => validateIdentifier({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Keccak-256 sanity check
// ---------------------------------------------------------------------------
describe("Keccak-256", () => {
  it("produces correct hash of empty string", () => {
    // keccak256("") = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
    const hash = keccak256(new Uint8Array(0));
    const hex = Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe("c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
  });

  it("produces correct hash of 'abc'", () => {
    // keccak256("abc") = 4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45
    const hash = keccak256(new TextEncoder().encode("abc"));
    const hex = Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe("4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
  });
});
