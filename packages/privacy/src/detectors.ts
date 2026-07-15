import { ibanValid, luhn, nhsValid } from "./checksums.js";
import { maskMatch } from "./redact.js";
import type { Category, PiiEntity, Severity } from "./types.js";

interface DetectorDef {
  type: string;
  category: Category;
  severity: Severity;
  /** `null` = universal detector (not tied to a jurisdiction). */
  jurisdiction: string | null;
  regex: RegExp;
  /** Optional checksum/structural validator run against the raw match. */
  validate?: (raw: string) => boolean;
  /** When true, matches that fail `validate` are discarded (kills false positives). */
  requireValid: boolean;
  /** `validated` flag to use when there is no `validate` function. */
  structuralValidated: boolean;
  /** Confidence when a match is not checksum-validated. */
  baseConfidence: number;
  /** Confidence when a match is checksum-validated. */
  validConfidence: number;
}

const stripDigits = (s: string): string => s.replace(/\D/g, "");

/**
 * Detector definitions, ordered roughly by severity. All regexes are global.
 * Detectors with a `validate` + `requireValid` only emit checksum-valid matches,
 * which is what keeps structured-identifier false positives near zero.
 */
const DETECTORS: DetectorDef[] = [
  {
    type: "credit_card",
    category: "PCI",
    severity: "critical",
    jurisdiction: null,
    regex: /\b\d(?:[ -]?\d){12,18}\b/g,
    validate: (raw) => {
      const d = stripDigits(raw);
      return d.length >= 13 && d.length <= 19 && luhn(d);
    },
    requireValid: true,
    structuralValidated: true,
    baseConfidence: 0.5,
    validConfidence: 0.99,
  },
  {
    type: "us_ssn",
    category: "PII",
    severity: "critical",
    jurisdiction: "US",
    // SSA structural rules: area != 000/666/9xx, group != 00, serial != 0000.
    // A separator is required to avoid matching arbitrary 9-digit runs.
    regex: /\b(?!000|666|9\d\d)\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b/g,
    requireValid: false,
    structuralValidated: true,
    baseConfidence: 0.9,
    validConfidence: 0.9,
  },
  {
    type: "iban",
    category: "PCI",
    severity: "high",
    jurisdiction: null,
    regex: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g,
    validate: (raw) => ibanValid(raw),
    requireValid: true,
    structuralValidated: true,
    baseConfidence: 0.5,
    validConfidence: 0.98,
  },
  {
    type: "uk_nhs",
    category: "PHI",
    severity: "high",
    jurisdiction: "UK",
    regex: /\b\d{3}[ -]?\d{3}[ -]?\d{4}\b/g,
    validate: (raw) => nhsValid(raw),
    requireValid: true,
    structuralValidated: true,
    baseConfidence: 0.5,
    validConfidence: 0.97,
  },
  {
    type: "ca_sin",
    category: "PII",
    severity: "high",
    jurisdiction: "CA",
    regex: /\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/g,
    validate: (raw) => luhn(stripDigits(raw)),
    requireValid: true,
    structuralValidated: true,
    baseConfidence: 0.5,
    validConfidence: 0.9,
  },
  {
    type: "email",
    category: "PII",
    severity: "medium",
    jurisdiction: null,
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    requireValid: false,
    structuralValidated: true,
    baseConfidence: 0.9,
    validConfidence: 0.9,
  },
  {
    type: "phone",
    category: "PII",
    severity: "low",
    jurisdiction: null,
    // NANP-style, separator required to limit false positives.
    regex: /(?<!\w)(?:\+?1[ .\-]?)?(?:\(\d{3}\)[ .\-]?|\d{3}[ .\-])\d{3}[ .\-]\d{4}(?!\w)/g,
    requireValid: false,
    structuralValidated: false,
    baseConfidence: 0.5,
    validConfidence: 0.5,
  },
  {
    type: "ip_address",
    category: "PII",
    severity: "low",
    jurisdiction: null,
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    requireValid: false,
    structuralValidated: true,
    baseConfidence: 0.6,
    validConfidence: 0.6,
  },
];

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

/** Returns the 1-based line number for a character index within `text`. */
function lineNumberAt(text: string, index: number): number {
  let line = 1;
  const bound = Math.min(index, text.length);
  for (let i = 0; i < bound; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

export interface DetectOptions {
  allowTypes?: string[];
  jurisdictions?: string[];
}

/**
 * Runs every applicable detector over `text` and returns the surviving entities
 * (checksum-filtered, jurisdiction-filtered, and de-overlapped).
 */
export function runDetectors(text: string, opts: DetectOptions = {}): PiiEntity[] {
  const allow = new Set(opts.allowTypes ?? []);
  const jurisdictions = opts.jurisdictions;
  const found: PiiEntity[] = [];

  for (const d of DETECTORS) {
    if (allow.has(d.type)) continue;
    if (jurisdictions && d.jurisdiction !== null && !jurisdictions.includes(d.jurisdiction)) {
      continue;
    }

    for (const m of text.matchAll(d.regex)) {
      const raw = m[0];
      if (raw === undefined || m.index === undefined) continue;

      let validated = d.structuralValidated;
      if (d.validate) {
        validated = d.validate(raw);
        if (d.requireValid && !validated) continue;
      }

      const start = m.index;
      const entity: PiiEntity = {
        type: d.type,
        category: d.category,
        severity: d.severity,
        match: maskMatch(raw),
        start,
        end: start + raw.length,
        line: lineNumberAt(text, start),
        validated,
        confidence: validated ? d.validConfidence : d.baseConfidence,
        ...(d.jurisdiction !== null ? { jurisdiction: d.jurisdiction } : {}),
      };
      found.push(entity);
    }
  }

  return resolveOverlaps(found);
}

/**
 * Drops overlapping matches, preferring (in order) higher severity, checksum
 * validation, then longer spans. Prevents the same characters from being
 * double-counted (e.g. a card fragment also matching a phone pattern).
 */
function resolveOverlaps(entities: PiiEntity[]): PiiEntity[] {
  const sorted = [...entities].sort(
    (a, b) =>
      a.start - b.start ||
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      (b.validated === a.validated ? 0 : b.validated ? 1 : -1) ||
      b.end - b.start - (a.end - a.start)
  );

  const accepted: PiiEntity[] = [];
  for (const e of sorted) {
    const overlaps = accepted.some((a) => e.start < a.end && a.start < e.end);
    if (!overlaps) accepted.push(e);
  }
  return accepted.sort((a, b) => a.start - b.start);
}
