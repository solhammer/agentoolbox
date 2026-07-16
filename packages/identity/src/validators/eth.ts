import { keccak256 } from "./keccak.js";
import type { ChecksumResult, IdentifierEntry } from "../types.js";

/**
 * Verify EIP-55 mixed-case checksum for an Ethereum address.
 *
 * Algorithm (EIP-55):
 *   1. Lowercase the 40-hex-char address (without 0x prefix).
 *   2. Compute Keccak-256 of the lowercase address as ASCII bytes.
 *   3. For each character at position i:
 *      - If the i-th nibble of the hash is ≥ 8: letter must be uppercase.
 *      - If the i-th nibble of the hash is < 8: letter must be lowercase.
 */
function verifyEip55(address40: string): boolean {
  const lower = address40.toLowerCase();
  const hashBytes = keccak256(new TextEncoder().encode(lower));

  for (let i = 0; i < 40; i++) {
    const ch = address40[i]!;
    // Only letters need checksum verification; digits are unambiguous
    if (/[a-fA-F]/.test(ch)) {
      const byteIdx = Math.floor(i / 2);
      const hashByte = hashBytes[byteIdx] ?? 0;
      // High nibble for even i, low nibble for odd i
      const nibble = i % 2 === 0 ? (hashByte >> 4) & 0xf : hashByte & 0xf;
      if (nibble >= 8 && ch !== ch.toUpperCase()) return false;
      if (nibble < 8 && ch !== ch.toLowerCase()) return false;
    }
  }
  return true;
}

export function validateEthAddress(raw: string): IdentifierEntry {
  const trimmed = raw.trim();

  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return {
      value: raw,
      type: "eth_address",
      valid: false,
      checksum: "not_applicable",
      normalized: trimmed.toLowerCase(),
      detail: "Must be 0x followed by 40 hex characters",
    };
  }

  const address40 = trimmed.slice(2); // strip 0x
  const isAllLower = address40 === address40.toLowerCase();
  const isAllUpper = address40 === address40.toUpperCase();

  let checksum: ChecksumResult;
  let valid: boolean;

  if (isAllLower || isAllUpper) {
    // All one case — no EIP-55 checksum to verify
    checksum = "not_applicable";
    valid = true;
  } else {
    // Mixed case — verify EIP-55 checksum
    const ok = verifyEip55(address40);
    checksum = ok ? "pass" : "fail";
    valid = ok;
  }

  return {
    value: raw,
    type: "eth_address",
    valid,
    checksum,
    normalized: `0x${address40.toLowerCase()}`,
    ...(valid && !isAllLower && !isAllUpper ? { detail: "EIP-55 checksum valid" } : {}),
    ...(!valid ? { detail: "EIP-55 checksum mismatch" } : {}),
  };
}
