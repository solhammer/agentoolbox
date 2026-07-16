import { performance } from "node:perf_hooks";
import { generateCertificate } from "./certificate.js";
import { parseCommand } from "./parser.js";
import { checkSegments } from "./rules.js";
import type {
  CommandScanInput,
  CommandScanResult,
  CommandFinding,
  Severity,
  Verdict,
} from "./types.js";

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Deterministic, offline shell command safety gate.
 *
 * Parses `input.command` into top-level segments using a quote- and
 * substitution-aware parser, then runs every CMD-* rule against the structural
 * token list.  Content inside quoted strings is opaque and never triggers a
 * rule.
 *
 * Returns a signed verdict with per-finding details and severity counts.
 *
 * No network calls, no shell execution, no global state.
 */
export function scanCommand(input: CommandScanInput): CommandScanResult {
  const t0 = performance.now();

  const { command } = input;
  const policy = input.policy ?? {};
  const maxSegments = policy.maxSegments ?? 50;
  const blockSeverityAtOrAbove = policy.blockSeverityAtOrAbove ?? "high";
  const allowSet = new Set(policy.allow ?? []);

  // ── Parse ─────────────────────────────────────────────────────────────────
  const segmentList = parseCommand(command);
  const segmentCount = segmentList.length;

  const findings: CommandFinding[] = [];

  // ── CMD-TOO-MANY-SEGMENTS ─────────────────────────────────────────────────
  if (segmentCount > maxSegments) {
    const extraIdx = maxSegments; // 0-based index of first extra segment
    const extraSeg = segmentList[extraIdx];
    const snippet =
      extraSeg !== undefined ? extraSeg.raw.trim().slice(0, 120) : "";

    findings.push({
      ruleId: "CMD-TOO-MANY-SEGMENTS",
      severity: "high",
      segmentIndex: extraIdx,
      message: `Command contains ${segmentCount} segment(s); maximum allowed is ${maxSegments}`,
      snippet,
    });
  }

  // ── Rule engine ───────────────────────────────────────────────────────────
  const rawFindings = checkSegments(segmentList, policy);
  for (const f of rawFindings) {
    // Apply policy.allow suppression
    if (!allowSet.has(f.ruleId)) {
      findings.push(f);
    }
  }

  // ── Severity counts ───────────────────────────────────────────────────────
  const counts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) {
    counts[f.severity]++;
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const blockLevel = SEVERITY_ORDER[blockSeverityAtOrAbove];
  let verdict: Verdict = "PASS";
  for (const f of findings) {
    if (SEVERITY_ORDER[f.severity] >= blockLevel) {
      verdict = "BLOCK";
      break;
    }
    verdict = "FLAG";
  }

  // ── Certificate ───────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const certificate = generateCertificate(command, verdict, findings.length, timestamp);

  const latencyMs = performance.now() - t0;

  return {
    verdict,
    segments: segmentCount,
    findings,
    counts,
    certificate,
    latencyMs,
  };
}
