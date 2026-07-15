import { createHash } from "node:crypto";

/** Returns the hex SHA-256 digest of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generates a tamper-evident certificate for an rxCheck result.
 *
 * The preimage binds a one-way hash of the subject (drug list) to the verdict,
 * the number of findings, and the timestamp, so a verdict can be independently
 * re-verified without re-running the full check:
 *
 *   sha256:<hex( sha256(subject) : verdict : findings : timestamp )>
 */
export function generateCertificate(
  subject: string,
  verdict: string,
  findings: number,
  timestamp: number
): string {
  const preimage = `${sha256Hex(subject)}:${verdict}:${findings}:${timestamp}`;
  return `sha256:${sha256Hex(preimage)}`;
}
