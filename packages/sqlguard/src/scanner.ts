import { performance } from "node:perf_hooks";
import { generateCertificate } from "./certificate.js";
import { tokenize, splitStatements } from "./tokenizer.js";
import { checkStatement } from "./rules.js";
import type { SqlScanInput, SqlScanResult, SqlFinding, Severity, Verdict } from "./types.js";

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Deterministic, offline SQL safety gate.
 *
 * Tokenises `input.sql` into a comment- and string-aware token stream, splits
 * it into statements, and runs each statement through the rule engine.
 * Returns a signed verdict with per-finding details and severity counts.
 *
 * No network calls, no database connections, no global state.
 */
export function scanSql(input: SqlScanInput): SqlScanResult {
  const t0 = performance.now();

  const { sql } = input;
  const policy = input.policy ?? {};
  const maxStatements = policy.maxStatements ?? 1;
  const blockSeverityAtOrAbove = policy.blockSeverityAtOrAbove ?? "high";

  // Tokenise and split
  const allTokens = tokenize(sql);
  const stmtList = splitStatements(allTokens);
  const stmtCount = stmtList.length;

  const findings: SqlFinding[] = [];

  // ── SQL-STACKED: too many statements ────────────────────────────────────
  if (stmtCount > maxStatements) {
    const extraIdx = maxStatements; // 0-based index of first "extra" statement
    const extraTokens = stmtList[extraIdx];
    const snippet =
      extraTokens !== undefined
        ? extraTokens
            .map((t) => t.raw)
            .join("")
            .trim()
            .slice(0, 120)
        : "";

    findings.push({
      ruleId: "SQL-STACKED",
      severity: "high",
      statementIndex: extraIdx,
      message: `Query contains ${stmtCount} statement(s); maximum allowed is ${maxStatements}`,
      snippet,
    });
  }

  // ── Per-statement rule checks ────────────────────────────────────────────
  for (let idx = 0; idx < stmtList.length; idx++) {
    const stmtTokens = stmtList[idx];
    if (stmtTokens === undefined) continue;

    const stmtFindings = checkStatement(stmtTokens, idx, policy);
    for (const f of stmtFindings) {
      findings.push(f);
    }
  }

  // ── Severity counts ──────────────────────────────────────────────────────
  const counts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) {
    counts[f.severity]++;
  }

  // ── Verdict ──────────────────────────────────────────────────────────────
  const blockLevel = SEVERITY_ORDER[blockSeverityAtOrAbove];
  let verdict: Verdict = "PASS";
  for (const f of findings) {
    if (SEVERITY_ORDER[f.severity] >= blockLevel) {
      verdict = "BLOCK";
      break;
    }
    verdict = "FLAG";
  }

  // ── Certificate ──────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const certificate = generateCertificate(sql, verdict, findings.length, timestamp);

  const latencyMs = performance.now() - t0;

  return {
    verdict,
    statements: stmtCount,
    findings,
    counts,
    certificate,
    latencyMs,
  };
}
