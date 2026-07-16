import { VAT_RULES } from "../data/vat-patterns.js";
import type { ChecksumResult, IdentifierEntry } from "../types.js";

/**
 * Germany (DE) VAT checksum — iterative double-and-add mod 11.
 * Validates digit 9 (0-indexed) of the 9-digit national number.
 */
function checksumDE(digits: string): boolean {
  let p = 10;
  for (let i = 0; i < 8; i++) {
    let s = (parseInt(digits[i]!, 10) + p) % 10;
    if (s === 0) s = 10;
    p = (s * 2) % 11;
  }
  const expected = 11 - p === 10 ? 0 : 11 - p;
  return expected === parseInt(digits[8]!, 10);
}

/**
 * Italy (IT) VAT checksum — Luhn-style on 10 digits, check digit at position 10.
 */
function checksumIT(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = parseInt(digits[i]!, 10);
    if (i % 2 === 0) {
      sum += d;
    } else {
      const t = d * 2;
      sum += t > 9 ? t - 9 : t;
    }
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(digits[10]!, 10);
}

/**
 * Netherlands (NL) VAT checksum — weighted MOD-11 on first 8 of 9-digit BTW number.
 * Weights: 9, 8, 7, 6, 5, 4, 3, 2 for positions 0-7; position 8 is check digit.
 */
function checksumNL(national: string): boolean {
  // national is the full 12-char NL suffix e.g. "123456789B01"
  const digits = national.slice(0, 9);
  if (!/^\d{9}$/.test(digits)) return false;
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]!, 10) * weights[i]!;
  }
  const remainder = sum % 11;
  if (remainder > 9) return false; // invalid
  return remainder === parseInt(digits[8]!, 10);
}

export function validateVatEu(raw: string): IdentifierEntry {
  const norm = raw.toUpperCase().trim().replace(/\s/g, "");

  if (norm.length < 4) {
    return {
      value: raw,
      type: "vat_eu",
      valid: false,
      checksum: "not_applicable",
      detail: "Too short",
    };
  }

  const country = norm.slice(0, 2);
  const national = norm.slice(2);
  const rule = VAT_RULES[country];

  if (!rule) {
    return {
      value: raw,
      type: "vat_eu",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: `Unknown EU VAT country: ${country}`,
    };
  }

  if (!rule.pattern.test(national)) {
    return {
      value: raw,
      type: "vat_eu",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: `${rule.country}: format mismatch`,
    };
  }

  let checksum: ChecksumResult = "not_applicable";
  let valid = true;

  if (rule.checksumImpl === "de") {
    const ok = checksumDE(national);
    checksum = ok ? "pass" : "fail";
    valid = ok;
  } else if (rule.checksumImpl === "it") {
    const ok = checksumIT(national);
    checksum = ok ? "pass" : "fail";
    valid = ok;
  } else if (rule.checksumImpl === "nl") {
    const ok = checksumNL(national);
    checksum = ok ? "pass" : "fail";
    valid = ok;
  }

  return {
    value: raw,
    type: "vat_eu",
    valid,
    checksum,
    normalized: norm,
    detail: rule.country,
  };
}
