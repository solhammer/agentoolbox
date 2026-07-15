import { createHash } from "node:crypto";
import type { Verdict } from "./types.js";

/** Returns the hex SHA-256 digest of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generates a tamper-evident certificate for a scan result.
 *
 * The preimage binds a one-way hash of the input (never the raw text) to the
 * verdict, the number of findings, and the timestamp, so a verdict can be
 * independently re-verified without exposing the scanned content:
 *
 *   sha256:<hex( sha256(text) : verdict : totalFindings : timestamp )>
 */
export function generateCertificate(
  text: string,
  verdict: Verdict,
  totalFindings: number,
  timestamp: number
): string {
  const preimage = `${sha256Hex(text)}:${verdict}:${totalFindings}:${timestamp}`;
  return `sha256:${sha256Hex(preimage)}`;
}
