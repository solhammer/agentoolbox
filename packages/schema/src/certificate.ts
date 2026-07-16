import { createHash } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function generateCertificate(
  subject: string,
  verdict: string,
  findings: number,
  timestamp: number
): string {
  const preimage = `${sha256Hex(subject)}:${verdict}:${findings}:${timestamp}`;
  return `sha256:${sha256Hex(preimage)}`;
}
