export type Language = "python" | "javascript" | "typescript" | "rust" | "go";

export interface ImportEntry {
  name: string;
  raw: string; // original import statement
}

export type RegistryStatus = "valid" | "hallucinated" | "unknown";

export interface CheckedImport {
  name: string;
  raw: string;
  status: RegistryStatus;
  registry?: string; // e.g. "pypi", "npm", "crates.io"
  registryUrl?: string;
  error?: string;
}

export interface ValidateImportsInput {
  language: Language;
  code: string;
  /** Timeout per registry request in ms. Default: 5000 */
  timeoutMs?: number;
}

export interface ValidateImportsResult {
  language: Language;
  valid: CheckedImport[];
  hallucinated: CheckedImport[];
  unknown: CheckedImport[];
  totalImports: number;
  hallucinationRate: number; // 0–1
  latencyMs: number;
}
