import { IBAN_LENGTHS } from "../data/iban-lengths.js";
import type { IdentifierEntry } from "../types.js";

/** Normalize IBAN: uppercase, strip spaces. */
function normalize(raw: string): string {
  return raw.toUpperCase().replace(/\s/g, "");
}

/**
 * Compute MOD-97 per ISO 7064 using chunked integer arithmetic.
 * Returns true if the remainder is 1 (valid IBAN).
 */
function mod97(rearranged: string): boolean {
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    const ch = rearranged[i]!;
    const code = ch.charCodeAt(0);
    let digit: number;
    if (code >= 65 && code <= 90) {
      // A=10, B=11, ..., Z=35
      digit = code - 55;
      remainder = (remainder * 100 + digit) % 97;
    } else {
      digit = code - 48;
      remainder = (remainder * 10 + digit) % 97;
    }
  }
  return remainder === 1;
}

export function validateIban(raw: string): IdentifierEntry {
  const norm = normalize(raw);

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(norm)) {
    return {
      value: raw,
      type: "iban",
      valid: false,
      checksum: "fail",
      normalized: norm,
      detail: "Invalid format",
    };
  }

  const country = norm.slice(0, 2);
  const expectedLen = IBAN_LENGTHS[country];
  if (expectedLen === undefined) {
    return {
      value: raw,
      type: "iban",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: `Unknown country code: ${country}`,
    };
  }

  if (norm.length !== expectedLen) {
    return {
      value: raw,
      type: "iban",
      valid: false,
      checksum: "fail",
      normalized: norm,
      detail: `Expected length ${expectedLen} for ${country}, got ${norm.length}`,
    };
  }

  // Rearrange: move first 4 chars to end
  const rearranged = norm.slice(4) + norm.slice(0, 4);
  const checksumPass = mod97(rearranged);

  return {
    value: raw,
    type: "iban",
    valid: checksumPass,
    checksum: checksumPass ? "pass" : "fail",
    normalized: norm,
    detail: country,
  };
}
