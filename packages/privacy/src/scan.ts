import { generateCertificate } from "./certificate.js";
import { runDetectors, type DetectOptions } from "./detectors.js";
import { redactText } from "./redact.js";
import type {
  Category,
  EnforcementMode,
  PiiScanInput,
  PiiScanResult,
  Severity,
  Verdict,
} from "./types.js";

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const SEVERITY_SCORE: Record<Severity, number> = { low: 15, medium: 40, high: 70, critical: 100 };

/**
 * PII/PHI/PCI egress firewall.
 *
 * Deterministically detects personal data in `text`, applies a policy to derive
 * a PASS/FLAG/BLOCK verdict, redacts the input, and returns a signed
 * certificate. No network calls and no state — safe to run inline before any
 * egress (logging, third-party call, persistence).
 */
export function scanPii(input: PiiScanInput): PiiScanResult {
  const start = Date.now();
  const { text } = input;
  const policy = input.policy ?? {};
  const mode: EnforcementMode = policy.mode ?? "block";
  const threshold: Severity = policy.blockSeverityAtOrAbove ?? "high";
  const doRedact = policy.redact !== false;

  const detectOpts: DetectOptions = {
    ...(policy.allowTypes !== undefined ? { allowTypes: policy.allowTypes } : {}),
    ...(policy.jurisdictions !== undefined ? { jurisdictions: policy.jurisdictions } : {}),
  };
  const entities = runDetectors(text, detectOpts);

  const counts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const categorySet = new Set<Category>();
  let maxScore = 0;
  let maxRank = 0;
  for (const e of entities) {
    counts[e.severity] += 1;
    categorySet.add(e.category);
    if (SEVERITY_SCORE[e.severity] > maxScore) maxScore = SEVERITY_SCORE[e.severity];
    if (SEVERITY_RANK[e.severity] > maxRank) maxRank = SEVERITY_RANK[e.severity];
  }

  // Raw verdict from the most severe finding.
  let base: Verdict;
  if (entities.length === 0) base = "PASS";
  else if (maxRank >= SEVERITY_RANK[threshold]) base = "BLOCK";
  else base = "FLAG";

  // Apply enforcement mode.
  let verdict: Verdict;
  if (mode === "audit") verdict = "PASS";
  else if (mode === "flag") verdict = base === "BLOCK" ? "FLAG" : base;
  else verdict = base;

  const timestamp = Date.now();
  return {
    verdict,
    safe: entities.length === 0,
    score: maxScore,
    categories: [...categorySet],
    totalFindings: entities.length,
    counts,
    entities,
    certificate: generateCertificate(text, verdict, entities.length, timestamp),
    enforcementMode: mode,
    latencyMs: Date.now() - start,
    ...(doRedact ? { redactedText: redactText(text, entities) } : {}),
    ...(input.filename !== undefined ? { filename: input.filename } : {}),
  };
}
