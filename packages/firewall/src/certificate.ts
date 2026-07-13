import { createHash } from "node:crypto";
import type { Verdict } from "./types.js";

/**
 * Generates a tamper-evident certificate for a firewall result.
 * Format: sha256:<hex> where the preimage is "input|verdict|timestamp"
 */
export function generateCertificate(
  input: string,
  verdict: Verdict,
  timestamp: number
): string {
  const preimage = `${input}|${verdict}|${timestamp}`;
  const hash = createHash("sha256").update(preimage, "utf8").digest("hex");
  return `sha256:${hash}`;
}
