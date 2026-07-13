export type {
  Verdict,
  OutputType,
  EnforcementMode,
  FirewallInput,
  ClaimVerdict,
  FirewallResult,
} from "./types.js";

import { validateImports } from "@agentoolbox/validator";
import { checkUrls, checkCitations, checkNumericContradictions, checkNliConsistency } from "./checks.js";
import { generateCertificate } from "./certificate.js";
import type { ClaimVerdict, FirewallInput, FirewallResult, Verdict } from "./types.js";

function verdictScore(verdict: Verdict): number {
  switch (verdict) {
    case "PASS": return 1;
    case "FLAG": return 0.5;
    case "BLOCK": return 0;
  }
}

function aggregateVerdict(claims: ClaimVerdict[], enforcementMode: string): Verdict {
  if (claims.some((c) => c.verdict === "BLOCK")) {
    return enforcementMode === "audit" ? "FLAG" : "BLOCK";
  }
  if (claims.some((c) => c.verdict === "FLAG")) return "FLAG";
  return "PASS";
}

/**
 * Run the hallucination firewall on an LLM output.
 *
 * @example
 * const result = await runFirewall({
 *   outputType: "code",
 *   language: "python",
 *   llmResponse: "import numpy\nfrom ghostpkg import magic",
 * });
 * // result.verdict -> "BLOCK"
 * // result.importValidation.hallucinated -> ["ghostpkg"]
 */
export async function runFirewall(input: FirewallInput): Promise<FirewallResult> {
  const start = Date.now();
  const timestamp = start;
  const enforcementMode = input.enforcementMode ?? "block";
  const timeoutMs = input.timeoutMs ?? 5000;

  const allClaims: ClaimVerdict[] = [];
  let importValidation: FirewallResult["importValidation"];

  // ── Layer 1: Code-specific checks ─────────────────────────────────────────
  if (input.outputType === "code" && input.language) {
    const validationResult = await validateImports({
      language: input.language,
      code: input.llmResponse,
      timeoutMs,
    });

    importValidation = {
      valid: validationResult.valid.map((v) => v.name),
      hallucinated: validationResult.hallucinated.map((v) => v.name),
      unknown: validationResult.unknown.map((v) => v.name),
      hallucinationRate: validationResult.hallucinationRate,
    };

    for (const pkg of validationResult.hallucinated) {
      allClaims.push({
        text: pkg.raw,
        verdict: "BLOCK",
        confidence: 0.95,
        checkType: "hallucinated_package",
        evidence: `Package "${pkg.name}" not found in ${pkg.registry ?? "registry"}`,
        suggestedFix: `Remove or replace "${pkg.name}" with a real package.`,
      });
    }

    for (const pkg of validationResult.unknown) {
      allClaims.push({
        text: pkg.raw,
        verdict: "FLAG",
        confidence: 0.4,
        checkType: "unknown_package",
        evidence: pkg.error ?? "Registry check failed",
      });
    }
  }

  // ── Layer 2: URL existence checks (all output types) ─────────────────────
  const urlClaims = await checkUrls(input.llmResponse, timeoutMs);
  allClaims.push(...urlClaims);

  // ── Layer 3: Citation format checks ──────────────────────────────────────
  const citationClaims = checkCitations(input.llmResponse);
  allClaims.push(...citationClaims);

  // ── Layer 4: Numeric contradiction heuristics ─────────────────────────────
  const numericClaims = checkNumericContradictions(input.llmResponse);
  allClaims.push(...numericClaims);

  // ── Layer 5: NLI factual consistency (Vectara HHEM v2) ───────────────────
  if (input.sourceTexts && input.sourceTexts.length > 0) {
    const nliClaims = await checkNliConsistency(
      input.llmResponse,
      input.sourceTexts,
      timeoutMs
    );
    allClaims.push(...nliClaims);
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const verdict = aggregateVerdict(allClaims, enforcementMode);

  const overallScore =
    allClaims.length === 0
      ? 1.0
      : allClaims.reduce((sum, c) => sum + verdictScore(c.verdict), 0) / allClaims.length;

  const certificate = generateCertificate(input.llmResponse, verdict, timestamp);

  return {
    verdict,
    overallScore,
    claims: allClaims,
    outputType: input.outputType,
    enforcementMode,
    latencyMs: Date.now() - start,
    certificate,
    ...(importValidation !== undefined ? { importValidation } : {}),
  };
}
