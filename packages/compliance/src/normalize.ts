/**
 * Common organizational suffixes stripped before matching so that
 * "Acme Trading LLC" and "Acme Trading" compare equal.
 */
const ORG_SUFFIXES = new Set<string>([
  "LLC", "LTD", "LIMITED", "INC", "INCORPORATED", "CO", "CORP", "CORPORATION",
  "COMPANY", "PLC", "GMBH", "AG", "SA", "SAS", "SL", "LP", "LLP", "PJSC",
  "OJSC", "OAO", "JSC", "ZAO", "PT", "BV", "NV", "SPA", "SRL", "PTE", "PVT",
]);

/**
 * Deterministically normalizes a name for comparison:
 * strips diacritics, uppercases, removes punctuation, and collapses
 * whitespace. Returns "" for input that contains no alphanumerics.
 */
export function normalizeName(input: string): string {
  const noDiacritics = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const upper = noDiacritics.toUpperCase();
  return upper.replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Splits a normalized name into tokens. */
export function tokenize(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/** Removes org suffixes, never returning an empty list. */
export function stripSuffixes(toks: string[]): string[] {
  const out = toks.filter((t) => !ORG_SUFFIXES.has(t));
  return out.length > 0 ? out : toks;
}

/**
 * Produces an order-independent comparison key: normalize, drop org
 * suffixes, sort tokens, rejoin. "Bank Melli Iran" and "Iran Melli Bank"
 * yield the same key.
 */
export function tokenSortKey(normalized: string): string {
  return stripSuffixes(tokenize(normalized)).slice().sort().join(" ");
}
