export type {
  Language,
  ImportEntry,
  RegistryStatus,
  CheckedImport,
  ValidateImportsInput,
  ValidateImportsResult,
} from "./types.js";

export { extractImports } from "./extractor.js";
export { checkRegistries } from "./registry.js";

import { extractImports } from "./extractor.js";
import { checkRegistries } from "./registry.js";
import type { ValidateImportsInput, ValidateImportsResult } from "./types.js";

/**
 * Validate all imports/packages in AI-generated code against live registries.
 *
 * @example
 * const result = await validateImports({
 *   language: "python",
 *   code: "import numpy\nfrom superlogger import magic_log",
 * });
 * // result.hallucinated -> [{ name: "superlogger", ... }]
 */
export async function validateImports(
  input: ValidateImportsInput
): Promise<ValidateImportsResult> {
  const start = Date.now();
  const { language, code, timeoutMs } = input;

  const imports = extractImports(code, language);
  const checked = await checkRegistries(imports, language, timeoutMs);

  const valid = checked.filter((c) => c.status === "valid");
  const hallucinated = checked.filter((c) => c.status === "hallucinated");
  const unknown = checked.filter((c) => c.status === "unknown");
  const total = checked.length;

  return {
    language,
    valid,
    hallucinated,
    unknown,
    totalImports: total,
    hallucinationRate: total > 0 ? hallucinated.length / total : 0,
    latencyMs: Date.now() - start,
  };
}
