import type { IdentifierEntry } from "../types.js";

/**
 * Standard Luhn check. Returns true if the full number (including check digit) is valid.
 */
function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]!, 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * NPI (National Provider Identifier) validation per CMS specification.
 *
 * The check digit is computed by prepending the constant "80840" to the
 * 10-digit NPI (to form a 15-digit number) and verifying it passes Luhn.
 */
export function validateNpi(raw: string): IdentifierEntry {
  const norm = raw.trim().replace(/\s/g, "");

  if (!/^\d{10}$/.test(norm)) {
    return {
      value: raw,
      type: "npi",
      valid: false,
      checksum: "fail",
      normalized: norm,
      detail: "Must be exactly 10 digits",
    };
  }

  // Prepend "80840" and validate the 15-digit number with Luhn
  const prefixed = "80840" + norm;
  const checksumPass = luhn(prefixed);

  return {
    value: raw,
    type: "npi",
    valid: checksumPass,
    checksum: checksumPass ? "pass" : "fail",
    normalized: norm,
  };
}
