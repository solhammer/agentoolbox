import { generateCertificate } from "./certificate.js";
import { detectType } from "./autodetect.js";
import { validateIban } from "./validators/iban.js";
import { validateAbaRouting } from "./validators/aba.js";
import { validateSwiftBic } from "./validators/swift.js";
import { validateCreditCard } from "./validators/credit-card.js";
import { validateEin } from "./validators/ein.js";
import { validateVatEu } from "./validators/vat-eu.js";
import { validateVin } from "./validators/vin.js";
import { validateNpi } from "./validators/npi.js";
import { validateSsn } from "./validators/ssn.js";
import { validateEthAddress } from "./validators/eth.js";
import { validateSolAddress } from "./validators/sol.js";
import type {
  IdentifierEntry,
  IdentifierInput,
  IdentifierResult,
  IdentifierType,
  Verdict,
} from "./types.js";

/** Dispatch to the appropriate validator for a known type. */
function validateAs(raw: string, type: IdentifierType): IdentifierEntry {
  switch (type) {
    case "iban":         return validateIban(raw);
    case "aba_routing":  return validateAbaRouting(raw);
    case "swift_bic":    return validateSwiftBic(raw);
    case "credit_card":  return validateCreditCard(raw);
    case "ein":          return validateEin(raw);
    case "vat_eu":       return validateVatEu(raw);
    case "vin":          return validateVin(raw);
    case "npi":          return validateNpi(raw);
    case "ssn":          return validateSsn(raw);
    case "eth_address":  return validateEthAddress(raw);
    case "sol_address":  return validateSolAddress(raw);
  }
}

/**
 * Validate one or more structured identifiers — deterministic, offline, no network calls.
 *
 * Supported types: iban, aba_routing, swift_bic, credit_card, ein, vat_eu,
 *                  vin, npi, ssn, eth_address, sol_address.
 *
 * Verdict logic:
 *   - BLOCK  — any identifier is invalid (failed format or checksum).
 *   - FLAG   — all identifiers are structurally acceptable but at least one
 *              could not be assigned a known type (type = "unknown").
 *   - PASS   — all identifiers are valid with a recognized type.
 */
export function validateIdentifier(input: IdentifierInput): IdentifierResult {
  const start = Date.now();

  // Collect values
  const rawValues: string[] = [];
  if (input.value !== undefined) rawValues.push(input.value);
  if (input.values !== undefined) rawValues.push(...input.values);
  if (rawValues.length === 0) {
    throw new Error("validateIdentifier: provide `value` or a non-empty `values` array.");
  }

  // Build type restriction set
  const restrict: ReadonlySet<IdentifierType> | null =
    input.types !== undefined && input.types.length > 0
      ? new Set(input.types)
      : null;

  const results: IdentifierEntry[] = [];

  for (const raw of rawValues) {
    let entry: IdentifierEntry;

    if (input.type !== undefined) {
      // Explicit type provided
      entry = validateAs(raw, input.type);
    } else {
      // Auto-detect
      const detected = detectType(raw, restrict);
      if (detected === null) {
        entry = {
          value: raw,
          type: "unknown",
          valid: false,
          checksum: "not_applicable",
          detail: "Could not determine identifier type",
        };
      } else {
        entry = validateAs(raw, detected);
      }
    }

    results.push(entry);
  }

  // Aggregate verdict
  // "unknown" entries get FLAG (unrecognized, not definitively invalid);
  // known-type entries with valid:false get BLOCK.
  const invalidCount = results.filter((r) => !r.valid).length;
  const hasKnownInvalid = results.some((r) => !r.valid && r.type !== "unknown");
  const hasUnknown = results.some((r) => r.type === "unknown");

  let verdict: Verdict;
  if (hasKnownInvalid) {
    verdict = "BLOCK";
  } else if (hasUnknown) {
    verdict = "FLAG";
  } else {
    verdict = "PASS";
  }

  const timestamp = Date.now();
  const subject = JSON.stringify(rawValues);
  const certificate = generateCertificate(subject, verdict, invalidCount, timestamp);

  return {
    verdict,
    results,
    counts: { total: results.length, invalid: invalidCount },
    certificate,
    latencyMs: Date.now() - start,
  };
}
