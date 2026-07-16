export type SqlDialect = "postgres" | "mysql" | "sqlite" | "tsql" | "generic";

export type Severity = "low" | "medium" | "high" | "critical";

export type Verdict = "PASS" | "FLAG" | "BLOCK";

export interface SqlScanPolicy {
  /** Allow DDL statements (ALTER, CREATE). Defaults to false. */
  allowDdl?: boolean;
  /** Allow DELETE/UPDATE without a WHERE clause. Defaults to false. */
  allowUnboundedWrites?: boolean;
  /** Maximum number of statements allowed. Defaults to 1. */
  maxStatements?: number;
  /**
   * Severity at or above which the verdict becomes BLOCK.
   * Defaults to "high". Findings below this threshold produce FLAG.
   */
  blockSeverityAtOrAbove?: Severity;
}

export interface SqlScanInput {
  sql: string;
  dialect?: SqlDialect;
  policy?: SqlScanPolicy;
}

export interface SqlFinding {
  ruleId: string;
  severity: Severity;
  statementIndex: number;
  message: string;
  snippet: string;
}

export interface SqlScanResult {
  verdict: Verdict;
  statements: number;
  findings: SqlFinding[];
  counts: Record<Severity, number>;
  certificate: string;
  latencyMs: number;
}
