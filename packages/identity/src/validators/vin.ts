import type { IdentifierEntry } from "../types.js";

/**
 * VIN transliteration table: letter → numeric value.
 * I, O, Q are excluded from VINs.
 */
const TRANSLITERATION: Readonly<Record<string, number>> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5,           P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4,
  "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
} as const;

/** Position weights for all 17 VIN positions (index 0 = position 1). */
const POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function validateVin(raw: string): IdentifierEntry {
  const norm = raw.toUpperCase().trim();

  if (norm.length !== 17) {
    return {
      value: raw,
      type: "vin",
      valid: false,
      checksum: "fail",
      normalized: norm,
      detail: "Must be exactly 17 characters",
    };
  }

  // Validate character set: only [A-HJ-NPR-Z0-9] allowed
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(norm)) {
    return {
      value: raw,
      type: "vin",
      valid: false,
      checksum: "fail",
      normalized: norm,
      detail: "Contains invalid characters (I, O, Q not allowed)",
    };
  }

  // Compute weighted sum
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = norm[i]!;
    const val = TRANSLITERATION[ch];
    if (val === undefined) {
      return {
        value: raw,
        type: "vin",
        valid: false,
        checksum: "fail",
        normalized: norm,
        detail: `Invalid character at position ${i + 1}: ${ch}`,
      };
    }
    sum += val * POSITION_WEIGHTS[i]!;
  }

  const remainder = sum % 11;
  // Check digit: remainder 10 → 'X', else the digit itself
  const expectedCheck = remainder === 10 ? "X" : String(remainder);
  const actualCheck = norm[8]!; // position 9 (0-indexed: 8)
  const checksumPass = actualCheck === expectedCheck;

  return {
    value: raw,
    type: "vin",
    valid: checksumPass,
    checksum: checksumPass ? "pass" : "fail",
    normalized: norm,
    ...(checksumPass ? {} : { detail: `Check digit mismatch: expected ${expectedCheck}` }),
  };
}
