/**
 * Valid IRS EIN campus/online prefixes (first two digits of EIN).
 * Source: IRS campus assignments and online EIN issuance.
 *
 * Prefixes not in this set are structurally invalid.
 */
export const VALID_EIN_PREFIXES: ReadonlySet<string> = new Set([
  // Andover (legacy)
  "01", "02", "03", "04", "05", "06",
  // Atlanta
  "10", "12", "13", "14", "15", "16",
  // Online / Internet
  "20", "21", "22", "23", "24", "25", "26", "27",
  // Memphis
  "30", "31", "32",
  // Philadelphia
  "33", "34", "35", "36", "37", "38",
  // Ogden (small business)
  "39",
  // Kansas City
  "40", "41", "42", "43", "44", "45", "46", "47", "48",
  // Memphis
  "50", "51", "52", "53",
  // Online
  "54", "55",
  // Southeast
  "56", "57", "58", "59",
  // Fresno
  "60", "61", "62", "63", "64", "65", "66", "67",
  // Online
  "68",
  // Andover / Northeast
  "71", "72", "73", "74", "75", "76", "77",
  // Ogden
  "80", "81", "82", "83", "84", "85", "86", "87", "88",
  // Austin
  "90", "91", "92", "93", "94", "95",
  // Online / International
  "98", "99",
]);
