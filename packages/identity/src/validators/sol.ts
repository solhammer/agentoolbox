import type { IdentifierEntry } from "../types.js";

/**
 * Base58 alphabet used by Bitcoin and Solana.
 * Note: no 0, O, I, l to avoid visual confusion.
 */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Build a lookup table: char code → base58 value (or -1 if invalid). */
const BASE58_MAP: readonly number[] = (() => {
  const map = new Array<number>(256).fill(-1);
  for (let i = 0; i < BASE58_ALPHABET.length; i++) {
    map[BASE58_ALPHABET.charCodeAt(i)] = i;
  }
  return map;
})();

/**
 * Decode a base58 string to a Uint8Array.
 * Returns null if any character is not in the base58 alphabet.
 */
function base58Decode(input: string): Uint8Array | null {
  // Count leading '1's (they encode leading zero bytes)
  let leadingZeros = 0;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "1") {
      leadingZeros++;
    } else {
      break;
    }
  }

  // Allocate enough space (log(58)/log(256) ≈ 1.365 bytes per base58 char)
  const size = Math.ceil(input.length * 1.366) + 1;
  const bytes = new Uint8Array(size);
  let length = 0;

  for (let i = leadingZeros; i < input.length; i++) {
    const ch = input[i]!;
    const charCode = ch.charCodeAt(0);
    const carry = BASE58_MAP[charCode] ?? -1;
    if (carry === -1) return null; // invalid character

    let j = 0;
    let c = carry;
    for (let k = size - 1; k >= 0 && (c !== 0 || j < length); k--, j++) {
      c += 58 * (bytes[k] ?? 0);
      bytes[k] = c % 256;
      c = Math.floor(c / 256);
    }
    length = j;
  }

  // Find start of non-zero bytes and prepend leading zeros
  const startIdx = size - length;
  const result = new Uint8Array(leadingZeros + length);
  // result[0..leadingZeros] = 0 (already zero from new Uint8Array)
  result.set(bytes.slice(startIdx), leadingZeros);
  return result;
}

/**
 * Solana address validation.
 *
 * A Solana address is a base58-encoded 32-byte Ed25519 public key.
 * Valid addresses are 32–44 base58 characters (most are 43–44).
 */
export function validateSolAddress(raw: string): IdentifierEntry {
  const trimmed = raw.trim();

  // Quick length / charset check before expensive decode
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return {
      value: raw,
      type: "sol_address",
      valid: false,
      checksum: "not_applicable",
      normalized: trimmed,
      detail: "Invalid format: must be 32–44 base58 characters",
    };
  }

  const decoded = base58Decode(trimmed);

  if (decoded === null) {
    return {
      value: raw,
      type: "sol_address",
      valid: false,
      checksum: "not_applicable",
      normalized: trimmed,
      detail: "Contains invalid base58 characters",
    };
  }

  if (decoded.length !== 32) {
    return {
      value: raw,
      type: "sol_address",
      valid: false,
      checksum: "not_applicable",
      normalized: trimmed,
      detail: `Decoded length must be 32 bytes, got ${decoded.length}`,
    };
  }

  return {
    value: raw,
    type: "sol_address",
    valid: true,
    checksum: "not_applicable",
    normalized: trimmed,
  };
}
