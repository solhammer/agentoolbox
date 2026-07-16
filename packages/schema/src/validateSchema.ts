import type { SchemaInput, SchemaResult, Verdict } from "./types.js";
import { runValidator } from "./validate.js";
import { generateCertificate, sha256Hex } from "./certificate.js";

/**
 * Validates `input.data` against `input.schema` using a deterministic,
 * offline JSON Schema (Draft-07 subset) validator.
 *
 * Returns a `SchemaResult` with a signed certificate binding the
 * data+schema subject to the verdict.
 */
export function validateSchema(input: SchemaInput): SchemaResult {
  const t0 = Date.now();

  const errors = runValidator(input.data, input.schema);
  const valid = errors.length === 0;

  // Compute verdict
  const mode = input.policy?.mode ?? "block";
  let verdict: Verdict;
  if (valid) {
    verdict = "PASS";
  } else if (mode === "audit") {
    verdict = "PASS";
  } else if (mode === "flag") {
    verdict = "FLAG";
  } else {
    verdict = "BLOCK";
  }

  // Certificate — bind a stable subject: hash of JSON-serialized data + schema
  const subject =
    sha256Hex(JSON.stringify(input.data)) +
    ":" +
    sha256Hex(JSON.stringify(input.schema));

  const timestamp = t0;
  const certificate = generateCertificate(subject, verdict, errors.length, timestamp);

  const latencyMs = Date.now() - t0;

  return {
    verdict,
    valid,
    errors,
    counts: { errors: errors.length },
    certificate,
    latencyMs,
  };
}
