import type { IdentifierEntry } from "../types.js";

/**
 * SWIFT BIC format: BBBB CC LL [XXX]
 *   BBBB = 4-letter bank code (alpha)
 *   CC   = 2-letter country code (alpha, ISO 3166-1)
 *   LL   = 2-char location code (alphanumeric)
 *   XXX  = optional 3-char branch code (alphanumeric)
 *
 * Total: 8 or 11 characters.
 */
const BIC_REGEX = /^([A-Z]{4})([A-Z]{2})([A-Z0-9]{2})([A-Z0-9]{3})?$/;

/** Very small set of obviously invalid 2-letter codes for format-only sanity. */
const BASIC_COUNTRY_REGEX = /^[A-Z]{2}$/;

export function validateSwiftBic(raw: string): IdentifierEntry {
  const norm = raw.toUpperCase().trim();

  if (norm.length !== 8 && norm.length !== 11) {
    return {
      value: raw,
      type: "swift_bic",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: "Must be 8 or 11 characters",
    };
  }

  const match = BIC_REGEX.exec(norm);
  if (!match) {
    return {
      value: raw,
      type: "swift_bic",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: "Invalid BIC structure (AAAABBCCXXX)",
    };
  }

  const countryCode = match[2]!;
  if (!BASIC_COUNTRY_REGEX.test(countryCode)) {
    return {
      value: raw,
      type: "swift_bic",
      valid: false,
      checksum: "not_applicable",
      normalized: norm,
      detail: `Invalid country code: ${countryCode}`,
    };
  }

  return {
    value: raw,
    type: "swift_bic",
    valid: true,
    checksum: "not_applicable",
    normalized: norm,
    detail: countryCode,
  };
}
