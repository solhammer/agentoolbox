import { detectCardNetwork } from "../data/card-bins.js";
import type { IdentifierEntry } from "../types.js";

/** Standard Luhn algorithm. Returns true if valid. */
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

/** Mask PAN to last 4 digits: ****-****-****-XXXX */
function maskPan(pan: string): string {
  const last4 = pan.slice(-4);
  const masked = "*".repeat(pan.length - 4) + last4;
  // Group into blocks of 4
  return masked.match(/.{1,4}/g)?.join("-") ?? masked;
}

export function validateCreditCard(raw: string): IdentifierEntry {
  // Strip spaces, dashes, and other separators
  const norm = raw.replace(/[\s\-]/g, "");

  if (!/^\d{13,19}$/.test(norm)) {
    const last4 = norm.slice(-4);
    return {
      value: raw.replace(/\d(?=\d{4})/g, "*"),
      type: "credit_card",
      valid: false,
      checksum: "fail",
      normalized: maskPan(norm.replace(/\D/g, "").padStart(4, "0")).slice(-4) || last4,
      detail: "Invalid format: must be 13–19 digits",
    };
  }

  const network = detectCardNetwork(norm);
  const checksumPass = luhn(norm);
  const maskedValue = maskPan(norm);

  return {
    value: maskedValue,
    type: "credit_card",
    valid: checksumPass && network !== "Unknown",
    checksum: checksumPass ? "pass" : "fail",
    normalized: maskedValue,
    detail: network,
  };
}
