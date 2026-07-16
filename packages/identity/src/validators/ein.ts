import { VALID_EIN_PREFIXES } from "../data/ein-prefixes.js";
import type { IdentifierEntry } from "../types.js";

/** EIN format: XX-XXXXXXX */
const EIN_REGEX = /^(\d{2})-?(\d{7})$/;

export function validateEin(raw: string): IdentifierEntry {
  const match = EIN_REGEX.exec(raw.trim());

  if (!match) {
    return {
      value: raw,
      type: "ein",
      valid: false,
      checksum: "not_applicable",
      detail: "Invalid format: expected XX-XXXXXXX",
    };
  }

  const prefix = match[1]!;
  const suffix = match[2]!;
  const norm = `${prefix}-${suffix}`;

  if (!VALID_EIN_PREFIXES.has(prefix)) {
    return {
      value: raw,
      type: "ein",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: `Invalid IRS campus prefix: ${prefix}`,
    };
  }

  return {
    value: raw,
    type: "ein",
    valid: true,
    checksum: "not_applicable",
    normalized: norm,
    detail: `Prefix: ${prefix}`,
  };
}
