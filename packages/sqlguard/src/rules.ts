import type { Token } from "./tokenizer.js";
import type { SqlFinding, SqlScanPolicy } from "./types.js";

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/** Tokens excluding whitespace (comments are kept). */
function withoutWS(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.type !== "whitespace");
}

/** Tokens excluding whitespace AND comments – the "clean" stream used by most rules. */
function cleanStream(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.type !== "whitespace" && t.type !== "comment");
}

function makeSnippet(tokens: Token[]): string {
  const raw = tokens.map((t) => t.raw).join("").trim();
  return raw.length > 120 ? raw.slice(0, 117) + "..." : raw;
}

function firstKeyword(tokens: Token[]): string | undefined {
  for (const t of tokens) {
    if (t.type === "keyword") return t.upper;
  }
  return undefined;
}

function hasKeyword(tokens: Token[], kw: string): boolean {
  return tokens.some((t) => t.type === "keyword" && t.upper === kw);
}

// ---------------------------------------------------------------------------
// Per-rule checks
// ---------------------------------------------------------------------------

/**
 * SQL-ALWAYS-TRUE
 * Detects tautologies: NUMBER=NUMBER (same literal), STRING=STRING (same literal),
 * or the bare `OR TRUE` pattern.
 */
function findAlwaysTrue(clean: Token[]): string | null {
  // Scan for three-token patterns: VALUE = VALUE
  for (let i = 0; i + 2 < clean.length; i++) {
    const a = clean[i];
    const op = clean[i + 1];
    const b = clean[i + 2];
    if (a === undefined || op === undefined || b === undefined) break;

    if (op.type !== "operator" || op.upper !== "=") continue;

    // NUMBER = NUMBER (same numeric literal)
    if (a.type === "number" && b.type === "number" && a.upper === b.upper) {
      return `Tautology: ${a.raw}=${b.raw}`;
    }

    // STRING = STRING (identical literal text, including quotes)
    if (a.type === "string" && b.type === "string" && a.raw === b.raw) {
      return `Tautology: ${a.raw}=${b.raw}`;
    }
  }

  // Scan for OR TRUE
  for (let i = 0; i + 1 < clean.length; i++) {
    const a = clean[i];
    const b = clean[i + 1];
    if (a === undefined || b === undefined) break;

    if (a.type === "keyword" && a.upper === "OR" && b.type === "keyword" && b.upper === "TRUE") {
      return "Tautology: OR TRUE";
    }
  }

  return null;
}

/**
 * SQL-UNION-INJECTION
 * Detects UNION [ALL] SELECT anywhere in the token stream.
 */
function hasUnionInjection(clean: Token[]): boolean {
  for (let i = 0; i < clean.length; i++) {
    const tok = clean[i];
    if (tok === undefined) break;

    if (tok.type !== "keyword" || tok.upper !== "UNION") continue;

    let j = i + 1;
    const maybeAll = clean[j];
    if (maybeAll !== undefined && maybeAll.type === "keyword" && maybeAll.upper === "ALL") {
      j++;
    }

    const maybeSelect = clean[j];
    if (maybeSelect !== undefined && maybeSelect.type === "keyword" && maybeSelect.upper === "SELECT") {
      return true;
    }
  }
  return false;
}

/**
 * SQL-COMMENT-TAIL
 * Returns true when a comment token appears after at least one non-whitespace,
 * non-comment token in the statement – indicating a trailing/injected comment.
 */
function hasCommentTail(noWS: Token[]): boolean {
  let seenSubstantive = false;
  for (const tok of noWS) {
    if (tok.type === "comment") {
      if (seenSubstantive) return true;
    } else {
      seenSubstantive = true;
    }
  }
  return false;
}

/**
 * SQL-SELECT-STAR-NO-LIMIT
 * Detects SELECT * (or table.*) that is not inside parentheses (to avoid COUNT(*))
 * and the statement has no WHERE, LIMIT, TOP, or FETCH clause.
 *
 * The scan tracks whether we are inside the SELECT list (between SELECT and the
 * first FROM at paren depth 0) and whether `*` appears there without being
 * immediately preceded by `(`.
 */
function hasSelectStarNoLimit(clean: Token[]): boolean {
  let inSelectList = false;
  let depth = 0;
  let prevTok: Token | undefined;

  for (const tok of clean) {
    if (tok.type === "keyword" && tok.upper === "SELECT") {
      inSelectList = true;
      depth = 0;
      prevTok = tok;
      continue;
    }

    if (inSelectList) {
      if (tok.type === "punctuation" && tok.upper === "(") {
        depth++;
      } else if (tok.type === "punctuation" && tok.upper === ")") {
        depth--;
      } else if (tok.type === "keyword" && tok.upper === "FROM" && depth === 0) {
        inSelectList = false;
      } else if (tok.type === "operator" && tok.upper === "*" && depth === 0) {
        // Exclude COUNT(*) and similar: skip if directly preceded by (
        const isAggArg =
          prevTok !== undefined &&
          prevTok.type === "punctuation" &&
          prevTok.upper === "(";
        if (!isAggArg) {
          return true;
        }
      }
    }

    prevTok = tok;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public: check a single statement
// ---------------------------------------------------------------------------
export function checkStatement(
  stmtTokens: Token[],
  stmtIndex: number,
  policy: SqlScanPolicy,
): SqlFinding[] {
  const findings: SqlFinding[] = [];

  const noWS = withoutWS(stmtTokens);
  const clean = cleanStream(stmtTokens);
  const snippet = makeSnippet(stmtTokens);
  const fkw = firstKeyword(clean);

  // ── SQL-DROP ─────────────────────────────────────────────────────────────
  if (fkw === "DROP") {
    findings.push({
      ruleId: "SQL-DROP",
      severity: "critical",
      statementIndex: stmtIndex,
      message: "DROP statement detected",
      snippet,
    });
  }

  // ── SQL-TRUNCATE ──────────────────────────────────────────────────────────
  if (fkw === "TRUNCATE") {
    findings.push({
      ruleId: "SQL-TRUNCATE",
      severity: "critical",
      statementIndex: stmtIndex,
      message: "TRUNCATE statement detected",
      snippet,
    });
  }

  // ── SQL-UNBOUNDED-WRITE ───────────────────────────────────────────────────
  if (
    (fkw === "DELETE" || fkw === "UPDATE") &&
    !hasKeyword(clean, "WHERE") &&
    !(policy.allowUnboundedWrites === true)
  ) {
    findings.push({
      ruleId: "SQL-UNBOUNDED-WRITE",
      severity: "critical",
      statementIndex: stmtIndex,
      message: `${fkw} statement has no WHERE clause (unbounded write)`,
      snippet,
    });
  }

  // ── SQL-GRANT-ALTER ───────────────────────────────────────────────────────
  // GRANT / REVOKE: always flagged (privilege changes are never DDL-gated).
  // ALTER / CREATE: flagged unless policy.allowDdl is true.
  if (fkw === "GRANT" || fkw === "REVOKE") {
    findings.push({
      ruleId: "SQL-GRANT-ALTER",
      severity: "high",
      statementIndex: stmtIndex,
      message: `${fkw} statement modifies database privileges`,
      snippet,
    });
  } else if ((fkw === "ALTER" || fkw === "CREATE") && !(policy.allowDdl === true)) {
    findings.push({
      ruleId: "SQL-GRANT-ALTER",
      severity: "high",
      statementIndex: stmtIndex,
      message: `${fkw} statement (DDL) is not permitted by policy`,
      snippet,
    });
  }

  // ── SQL-ALWAYS-TRUE ───────────────────────────────────────────────────────
  const tautologyMsg = findAlwaysTrue(clean);
  if (tautologyMsg !== null) {
    findings.push({
      ruleId: "SQL-ALWAYS-TRUE",
      severity: "high",
      statementIndex: stmtIndex,
      message: tautologyMsg,
      snippet,
    });
  }

  // ── SQL-UNION-INJECTION ───────────────────────────────────────────────────
  if (hasUnionInjection(clean)) {
    findings.push({
      ruleId: "SQL-UNION-INJECTION",
      severity: "high",
      statementIndex: stmtIndex,
      message: "UNION SELECT injection shape detected",
      snippet,
    });
  }

  // ── SQL-COMMENT-TAIL ──────────────────────────────────────────────────────
  if (hasCommentTail(noWS)) {
    findings.push({
      ruleId: "SQL-COMMENT-TAIL",
      severity: "medium",
      statementIndex: stmtIndex,
      message: "Trailing comment detected after SQL content",
      snippet,
    });
  }

  // ── SQL-SELECT-STAR-NO-LIMIT ──────────────────────────────────────────────
  if (
    fkw === "SELECT" &&
    !hasKeyword(clean, "WHERE") &&
    !hasKeyword(clean, "LIMIT") &&
    !hasKeyword(clean, "TOP") &&
    !hasKeyword(clean, "FETCH") &&
    hasSelectStarNoLimit(clean)
  ) {
    findings.push({
      ruleId: "SQL-SELECT-STAR-NO-LIMIT",
      severity: "low",
      statementIndex: stmtIndex,
      message: "SELECT * with no WHERE or LIMIT/TOP clause",
      snippet,
    });
  }

  return findings;
}
