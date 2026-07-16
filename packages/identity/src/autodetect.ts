import type { IdentifierType } from "./types.js";
import { IBAN_LENGTHS } from "./data/iban-lengths.js";
import { VAT_RULES } from "./data/vat-patterns.js";

/**
 * Pattern-based auto-detection heuristics.
 * Returns the most specific matching type, or null if none matched.
 *
 * When `restrict` is non-null, only types in that set are considered.
 */
export function detectType(
  raw: string,
  restrict: ReadonlySet<IdentifierType> | null
): IdentifierType | null {
  const trimmed = raw.trim();

  function allowed(t: IdentifierType): boolean {
    return restrict === null || restrict.has(t);
  }

  // 1. ETH address: 0x + 40 hex chars (very distinctive prefix)
  if (allowed("eth_address") && /^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return "eth_address";
  }

  // 2. IBAN: 2 alpha + 2 digits + BBAN, total 15–34 chars
  if (allowed("iban")) {
    const upper = trimmed.toUpperCase().replace(/\s/g, "");
    if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(upper)) {
      const country = upper.slice(0, 2);
      if (IBAN_LENGTHS[country] !== undefined) {
        return "iban";
      }
    }
  }

  // 3. EIN: XX-XXXXXXX (9 digits with mandatory or optional dash)
  if (allowed("ein") && /^\d{2}-\d{7}$/.test(trimmed)) {
    return "ein";
  }

  // 4. SSN: XXX-XX-XXXX (with dashes is unambiguous)
  if (allowed("ssn") && /^\d{3}-\d{2}-\d{4}$/.test(trimmed)) {
    return "ssn";
  }

  // 5. ABA routing: exactly 9 digits (check against NPI which is also 9 → ABA wins)
  if (allowed("aba_routing") && /^\d{9}$/.test(trimmed)) {
    return "aba_routing";
  }

  // 6. NPI: exactly 10 digits
  if (allowed("npi") && /^\d{10}$/.test(trimmed)) {
    return "npi";
  }

  // 7. Credit card: 13–19 digits (with optional spaces/dashes)
  if (allowed("credit_card")) {
    const stripped = trimmed.replace(/[\s\-]/g, "");
    if (/^\d{13,19}$/.test(stripped)) {
      return "credit_card";
    }
  }

  // 8. SSN: 9 digits without dashes (ambiguous with ABA/NPI, lower priority)
  // Already handled: ABA gets 9-digit priority, NPI gets 10-digit.
  // Raw 9-digit SSN not auto-detected here to avoid false positives.

  // 9. SWIFT BIC: 8 or 11 alpha/alphanumeric chars matching BIC pattern
  if (allowed("swift_bic") && /^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(trimmed)) {
    const len = trimmed.length;
    if (len === 8 || len === 11) {
      return "swift_bic";
    }
  }

  // 10. VIN: 17 alphanumeric chars (excluding I, O, Q)
  if (allowed("vin") && /^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$/i.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(upper)) {
      return "vin";
    }
  }

  // 11. EU VAT: 2-letter country code + national number
  if (allowed("vat_eu") && trimmed.length >= 4) {
    const upper = trimmed.toUpperCase();
    const country = upper.slice(0, 2);
    const national = upper.slice(2);
    const rule = VAT_RULES[country];
    if (rule !== undefined && rule.pattern.test(national)) {
      return "vat_eu";
    }
  }

  // 12. SOL address: 32–44 base58 characters
  if (allowed("sol_address") && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return "sol_address";
  }

  return null;
}
