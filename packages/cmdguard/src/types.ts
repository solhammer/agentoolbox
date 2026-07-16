export type ShellKind = "bash" | "sh" | "zsh" | "powershell" | "generic";

export type Severity = "low" | "medium" | "high" | "critical";

export type Verdict = "PASS" | "FLAG" | "BLOCK";

export interface CommandScanPolicy {
  /**
   * Severity at or above which the verdict becomes BLOCK.
   * Defaults to "high". Findings below this threshold produce FLAG.
   */
  blockSeverityAtOrAbove?: Severity;
  /**
   * Rule IDs to skip (downgrade/suppress) — those rules will not produce findings.
   */
  allow?: string[];
  /**
   * Git refs treated as protected for CMD-GIT-FORCE-PUSH-PROTECTED.
   * Defaults to ["main", "master"].
   */
  protectedRefs?: string[];
  /**
   * Maximum number of pipeline segments allowed.
   * Defaults to 50. Exceeding triggers CMD-TOO-MANY-SEGMENTS (high).
   */
  maxSegments?: number;
}

export interface CommandScanInput {
  command: string;
  shell?: ShellKind;
  policy?: CommandScanPolicy;
}

export interface CommandFinding {
  ruleId: string;
  severity: Severity;
  /** 0-based index of the segment that triggered the finding. */
  segmentIndex: number;
  message: string;
  /** Trimmed, capped (~120 chars) snippet of the offending segment. Never echoes secrets in full. */
  snippet: string;
}

export interface CommandScanResult {
  verdict: Verdict;
  /** Number of top-level segments the command was split into. */
  segments: number;
  findings: CommandFinding[];
  counts: Record<Severity, number>;
  /** Tamper-evident SHA-256 certificate. */
  certificate: string;
  latencyMs: number;
}
