import type { IdentifierEntry } from "../types.js";

/** ABA routing number weights (repeating 3, 7, 1). */
const WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1] as const;

/** Strip common formatting (spaces, dashes) and validate. */
export function validateAbaRouting(raw: string): IdentifierEntry {
  const norm = raw.replace(/[\s-]/g, "");

  if (!/^\d{9}$/.test(norm)) {
    return {
      value: raw,
      type: "aba_routing",
      valid: false,
      checksum: "fail",
      normalized: norm,
      detail: "Must be exactly 9 digits",
    };
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const d = parseInt(norm[i]!, 10);
    sum += d * WEIGHTS[i]!;
  }

  const checksumPass = sum % 10 === 0;
  return {
    value: raw,
    type: "aba_routing",
    valid: checksumPass,
    checksum: checksumPass ? "pass" : "fail",
    normalized: norm,
  };
}
