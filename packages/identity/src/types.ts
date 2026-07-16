export type Verdict = "PASS" | "FLAG" | "BLOCK";

export type IdentifierType =
  | "iban"
  | "aba_routing"
  | "swift_bic"
  | "credit_card"
  | "ein"
  | "vat_eu"
  | "vin"
  | "npi"
  | "ssn"
  | "eth_address"
  | "sol_address";

export type ChecksumResult = "pass" | "fail" | "not_applicable";

export interface IdentifierInput {
  /** A single value to validate. */
  value?: string;
  /** Multiple values to validate in one call. */
  values?: string[];
  /** Explicit type for all values. If omitted, type is auto-detected. */
  type?: IdentifierType;
  /** Restrict auto-detection to these types. */
  types?: IdentifierType[];
}

export interface IdentifierEntry {
  /** The (possibly masked) identifier value. */
  value: string;
  /** Detected or specified type. */
  type: IdentifierType | "unknown";
  /** Whether the identifier passed all format and checksum checks. */
  valid: boolean;
  /** Checksum outcome. */
  checksum: ChecksumResult;
  /** Normalized form (e.g. stripped whitespace/dashes), possibly masked. */
  normalized?: string;
  /** Human-readable detail (country code, card network, error reason, etc.). */
  detail?: string;
}

export interface IdentifierResult {
  /** PASS — all valid; FLAG — unknown/unrecognized; BLOCK — any invalid. */
  verdict: Verdict;
  /** Per-identifier results. */
  results: IdentifierEntry[];
  /** Summary counts. */
  counts: { total: number; invalid: number };
  /** Tamper-evident certificate: `sha256:<hex>`. */
  certificate: string;
  latencyMs: number;
}
