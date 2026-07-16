/**
 * EU VAT number patterns and checksum metadata per country code.
 *
 * The format regex matches the national part (everything after the 2-letter country code).
 * checksumImpl: "de" | "it" | "nl" | "none" indicates which algorithm to run.
 */
export interface VatCountryRule {
  /** Country name (informational). */
  country: string;
  /** Regex for the national portion (after country prefix). */
  pattern: RegExp;
  /** Which checksum implementation to use. */
  checksumImpl: "de" | "it" | "nl" | "none";
}

export const VAT_RULES: Readonly<Record<string, VatCountryRule>> = {
  AT: { country: "Austria",     pattern: /^U\d{8}$/,                     checksumImpl: "none" },
  BE: { country: "Belgium",     pattern: /^0\d{9}$/,                     checksumImpl: "none" },
  BG: { country: "Bulgaria",    pattern: /^\d{9,10}$/,                   checksumImpl: "none" },
  CY: { country: "Cyprus",      pattern: /^\d{8}[A-Z]$/,                 checksumImpl: "none" },
  CZ: { country: "Czechia",     pattern: /^\d{8,10}$/,                   checksumImpl: "none" },
  DE: { country: "Germany",     pattern: /^\d{9}$/,                      checksumImpl: "de"   },
  DK: { country: "Denmark",     pattern: /^\d{8}$/,                      checksumImpl: "none" },
  EE: { country: "Estonia",     pattern: /^\d{9}$/,                      checksumImpl: "none" },
  EL: { country: "Greece",      pattern: /^\d{9}$/,                      checksumImpl: "none" },
  ES: { country: "Spain",       pattern: /^[A-Z0-9]\d{7}[A-Z0-9]$/,     checksumImpl: "none" },
  FI: { country: "Finland",     pattern: /^\d{8}$/,                      checksumImpl: "none" },
  FR: { country: "France",      pattern: /^[A-Z0-9]{2}\d{9}$/,          checksumImpl: "none" },
  GR: { country: "Greece",      pattern: /^\d{9}$/,                      checksumImpl: "none" },
  HR: { country: "Croatia",     pattern: /^\d{11}$/,                     checksumImpl: "none" },
  HU: { country: "Hungary",     pattern: /^\d{8}$/,                      checksumImpl: "none" },
  IE: { country: "Ireland",     pattern: /^\d{7}[A-Z]{1,2}$/,            checksumImpl: "none" },
  IT: { country: "Italy",       pattern: /^\d{11}$/,                     checksumImpl: "it"   },
  LT: { country: "Lithuania",   pattern: /^(\d{9}|\d{12})$/,             checksumImpl: "none" },
  LU: { country: "Luxembourg",  pattern: /^\d{8}$/,                      checksumImpl: "none" },
  LV: { country: "Latvia",      pattern: /^\d{11}$/,                     checksumImpl: "none" },
  MT: { country: "Malta",       pattern: /^\d{8}$/,                      checksumImpl: "none" },
  NL: { country: "Netherlands", pattern: /^\d{9}B\d{2}$/,                checksumImpl: "nl"   },
  PL: { country: "Poland",      pattern: /^\d{10}$/,                     checksumImpl: "none" },
  PT: { country: "Portugal",    pattern: /^\d{9}$/,                      checksumImpl: "none" },
  RO: { country: "Romania",     pattern: /^\d{2,10}$/,                   checksumImpl: "none" },
  SE: { country: "Sweden",      pattern: /^\d{12}$/,                     checksumImpl: "none" },
  SI: { country: "Slovenia",    pattern: /^\d{8}$/,                      checksumImpl: "none" },
  SK: { country: "Slovakia",    pattern: /^\d{10}$/,                     checksumImpl: "none" },
} as const;
