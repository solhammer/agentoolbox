import type {
  InfraPlanInput,
  InfraPlanResult,
  Finding,
  Severity,
  Verdict,
} from "./types.js";
import { generateCertificate } from "./certificate.js";
import { analyzeTerraform } from "./analyzers/terraform.js";
import { analyzeIam } from "./analyzers/iam.js";
import { analyzeK8s } from "./analyzers/k8s.js";

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Determine the overall verdict given the findings and the blocking threshold.
 * - BLOCK: at least one finding whose severity is >= threshold
 * - FLAG:  findings exist but all are below threshold
 * - PASS:  no findings
 */
function computeVerdict(findings: Finding[], threshold: Severity): Verdict {
  const thresholdLevel = SEVERITY_ORDER[threshold];
  let hasBlock = false;
  let hasFlag = false;

  for (const finding of findings) {
    const level = SEVERITY_ORDER[finding.severity];
    if (level >= thresholdLevel) {
      hasBlock = true;
    } else {
      hasFlag = true;
    }
  }

  if (hasBlock) return "BLOCK";
  if (hasFlag) return "FLAG";
  return "PASS";
}

/** Count findings by severity. */
function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) {
    counts[f.severity]++;
  }
  return counts;
}

/**
 * Statically analyse an IaC document and return a risk verdict.
 *
 * - Fully deterministic and offline — makes no network calls.
 * - Supported formats: "terraform" (terraform show -json), "iam" (AWS IAM policy),
 *   "k8s" (Kubernetes manifest or List).
 * - The returned certificate binds the format + document hash to the verdict,
 *   finding count, and call timestamp.
 */
export function checkInfraPlan(input: InfraPlanInput): InfraPlanResult {
  const start = Date.now();

  const { format, document } = input;
  const threshold: Severity = input.policy?.blockSeverityAtOrAbove ?? "high";

  let findings: Finding[] = [];

  switch (format) {
    case "terraform":
      findings = analyzeTerraform(document);
      break;
    case "iam":
      findings = analyzeIam(document);
      break;
    case "k8s":
      findings = analyzeK8s(document);
      break;
  }

  const verdict = computeVerdict(findings, threshold);
  const counts = countBySeverity(findings);

  const subject = `${format}:${JSON.stringify(document)}`;
  const certificate = generateCertificate(subject, verdict, findings.length, start);

  const latencyMs = Date.now() - start;

  return { verdict, findings, counts, certificate, latencyMs };
}
