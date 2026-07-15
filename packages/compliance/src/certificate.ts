import { createHash } from "node:crypto";
import type { Verdict } from "./types.js";

/** Returns the hex SHA-256 digest of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generates a tamper-evident certificate for a screening result.
 *
 * The preimage binds a one-way hash of the (normalized) subject to the verdict,
 * the number of matches, and the timestamp, so a verdict can be independently
 * re-verified:
 *
 *   sha256:<hex( sha256(subject) : verdict : matches : timestamp )>
 */
export function generateCertificate(
  subject: string,
  verdict: Verdict,
  matches: number,
  timestamp: number
): string {
  const preimage = `${sha256Hex(subject)}:${verdict}:${matches}:${timestamp}`;
  return `sha256:${sha256Hex(preimage)}`;
}
