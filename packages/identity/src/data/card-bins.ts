/**
 * BIN (Bank Identification Number) range rules for major card networks.
 * Checked in order; first match wins.
 */
export type CardNetwork = "Visa" | "Mastercard" | "Amex" | "Discover" | "UnionPay" | "Unknown";

export interface BinRange {
  /** Inclusive start of BIN prefix as string (for prefix matching). */
  prefixStart: string;
  /** Inclusive end of BIN prefix. Same length as prefixStart. */
  prefixEnd: string;
  /** Valid card lengths for this range. */
  lengths: number[];
  network: CardNetwork;
}

/**
 * BIN ranges in priority order.
 * Rules derived from public BIN registry knowledge (as of 2024).
 */
export const BIN_RANGES: readonly BinRange[] = [
  // Amex: 34, 37 (15 digits)
  { prefixStart: "34", prefixEnd: "34", lengths: [15], network: "Amex" },
  { prefixStart: "37", prefixEnd: "37", lengths: [15], network: "Amex" },

  // Discover: 6011, 622126–622925, 644–649, 65
  { prefixStart: "6011", prefixEnd: "6011", lengths: [16, 19], network: "Discover" },
  { prefixStart: "622126", prefixEnd: "622925", lengths: [16], network: "Discover" },
  { prefixStart: "644", prefixEnd: "649", lengths: [16], network: "Discover" },
  { prefixStart: "65", prefixEnd: "65", lengths: [16, 19], network: "Discover" },

  // Mastercard: 2221–2720 (16 digits), 51–55 (16 digits)
  { prefixStart: "2221", prefixEnd: "2720", lengths: [16], network: "Mastercard" },
  { prefixStart: "51", prefixEnd: "55", lengths: [16], network: "Mastercard" },

  // UnionPay: 62 (excluding already matched discover 622126-622925)
  { prefixStart: "62", prefixEnd: "62", lengths: [16, 17, 18, 19], network: "UnionPay" },

  // Visa: starts with 4 (13 or 16 digits)
  { prefixStart: "4", prefixEnd: "4", lengths: [13, 16, 19], network: "Visa" },
] as const;

/** Detect card network from a normalized (digits-only) PAN. */
export function detectCardNetwork(pan: string): CardNetwork {
  for (const range of BIN_RANGES) {
    const prefixLen = range.prefixStart.length;
    const prefix = pan.slice(0, prefixLen);
    if (prefix.length < prefixLen) continue;
    if (prefix >= range.prefixStart && prefix <= range.prefixEnd) {
      if (range.lengths.includes(pan.length)) {
        return range.network;
      }
    }
  }
  return "Unknown";
}
