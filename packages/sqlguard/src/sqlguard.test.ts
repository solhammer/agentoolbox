import { describe, it, expect } from "vitest";
import { scanSql } from "./scanner.js";
import { generateCertificate, sha256Hex } from "./certificate.js";
import { tokenize, splitStatements } from "./tokenizer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hasFinding(sql: string, ruleId: string): boolean {
  const r = scanSql({ sql });
  return r.findings.some((f) => f.ruleId === ruleId);
}

function findingFor(sql: string, ruleId: string) {
  const r = scanSql({ sql });
  return r.findings.find((f) => f.ruleId === ruleId);
}

// ---------------------------------------------------------------------------
// Tokeniser basics
// ---------------------------------------------------------------------------
describe("tokenizer", () => {
  it("tokenizes a simple SELECT", () => {
    const tokens = tokenize("SELECT id FROM users WHERE id = 1");
    const kws = tokens.filter((t) => t.type === "keyword").map((t) => t.upper);
    expect(kws).toContain("SELECT");
    expect(kws).toContain("FROM");
    expect(kws).toContain("WHERE");
  });

  it("treats content inside single-quoted strings as a single opaque string token", () => {
    const tokens = tokenize("SELECT * FROM t WHERE name = 'WHERE 1=1'");
    const stringToks = tokens.filter((t) => t.type === "string");
    expect(stringToks).toHaveLength(1);
    expect(stringToks[0]?.raw).toBe("'WHERE 1=1'");
    // No keyword tokens for WHERE/1=1 inside the string
    const kwUppers = tokens.filter((t) => t.type === "keyword").map((t) => t.upper);
    expect(kwUppers.filter((k) => k === "WHERE")).toHaveLength(1); // only the real WHERE
  });

  it("treats content inside block comments as a single opaque comment token", () => {
    const tokens = tokenize("SELECT id /* WHERE 1=1 */ FROM t");
    const commentToks = tokens.filter((t) => t.type === "comment");
    expect(commentToks).toHaveLength(1);
    // Comment content is not parsed as keywords
    const kwUppers = tokens.filter((t) => t.type === "keyword").map((t) => t.upper);
    expect(kwUppers).not.toContain("WHERE");
  });

  it("handles Postgres dollar-quoting as a string token", () => {
    const tokens = tokenize("SELECT $$ DROP TABLE users $$");
    const stringToks = tokens.filter((t) => t.type === "string");
    expect(stringToks).toHaveLength(1);
    expect(stringToks[0]?.raw).toContain("DROP TABLE users");
  });

  it("handles tagged dollar-quoting", () => {
    const tokens = tokenize("$body$ DROP TABLE users $body$");
    const stringToks = tokens.filter((t) => t.type === "string");
    expect(stringToks).toHaveLength(1);
  });

  it("tokenizes '' escaped single quotes correctly", () => {
    const tokens = tokenize("WHERE name = 'o''brien'");
    const stringToks = tokens.filter((t) => t.type === "string");
    expect(stringToks).toHaveLength(1);
    expect(stringToks[0]?.raw).toBe("'o''brien'");
  });

  it("tokenizes double-quoted identifiers", () => {
    const tokens = tokenize(`SELECT "Order" FROM "public"."orders"`);
    const identifiers = tokens.filter((t) => t.type === "identifier");
    expect(identifiers.map((t) => t.upper)).toContain("ORDER");
  });

  it("tokenizes backtick identifiers (MySQL style)", () => {
    const tokens = tokenize("SELECT `order` FROM `users`");
    const identifiers = tokens.filter((t) => t.type === "identifier");
    expect(identifiers.map((t) => t.upper)).toContain("ORDER");
  });

  it("tokenizes positional placeholders ($1, $2)", () => {
    const tokens = tokenize("SELECT * FROM t WHERE id = $1 AND name = $2");
    const placeholders = tokens.filter((t) => t.type === "placeholder");
    expect(placeholders).toHaveLength(2);
    expect(placeholders[0]?.upper).toBe("$N");
  });

  it("tokenizes ? placeholders", () => {
    const tokens = tokenize("SELECT * FROM t WHERE id = ?");
    const placeholders = tokens.filter((t) => t.type === "placeholder");
    expect(placeholders).toHaveLength(1);
  });

  it("tokenizes :name placeholders", () => {
    const tokens = tokenize("INSERT INTO t (a) VALUES (:name)");
    const placeholders = tokens.filter((t) => t.type === "placeholder");
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0]?.upper).toBe(":NAME");
  });
});

// ---------------------------------------------------------------------------
// Statement splitter
// ---------------------------------------------------------------------------
describe("splitStatements", () => {
  it("returns one statement for a single query without semicolon", () => {
    const stmts = splitStatements(tokenize("SELECT 1"));
    expect(stmts).toHaveLength(1);
  });

  it("returns two statements when separated by semicolon", () => {
    const stmts = splitStatements(tokenize("SELECT 1; SELECT 2"));
    expect(stmts).toHaveLength(2);
  });

  it("does not count trailing comment-only segment as a statement", () => {
    const stmts = splitStatements(tokenize("SELECT 1; -- trailing comment"));
    expect(stmts).toHaveLength(1);
  });

  it("does not count whitespace-only trailing segment as a statement", () => {
    const stmts = splitStatements(tokenize("SELECT 1;   "));
    expect(stmts).toHaveLength(1);
  });

  it("correctly splits three statements", () => {
    const stmts = splitStatements(tokenize("SELECT 1; SELECT 2; SELECT 3"));
    expect(stmts).toHaveLength(3);
  });

  it("does not split on semicolons inside string literals", () => {
    const stmts = splitStatements(tokenize("SELECT 'a;b;c' FROM t"));
    expect(stmts).toHaveLength(1);
  });

  it("does not split on semicolons inside block comments", () => {
    const stmts = splitStatements(tokenize("SELECT 1 /* a;b;c */"));
    expect(stmts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// SQL-UNBOUNDED-WRITE (critical)
// ---------------------------------------------------------------------------
describe("SQL-UNBOUNDED-WRITE", () => {
  it("BLOCK: DELETE with no WHERE", () => {
    const r = scanSql({ sql: "DELETE FROM users" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-UNBOUNDED-WRITE")).toBe(true);
    expect(r.counts.critical).toBeGreaterThanOrEqual(1);
  });

  it("PASS: DELETE with WHERE clause", () => {
    const r = scanSql({ sql: "DELETE FROM t WHERE id = 1" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings.some((f) => f.ruleId === "SQL-UNBOUNDED-WRITE")).toBe(false);
  });

  it("BLOCK: UPDATE with no WHERE", () => {
    const r = scanSql({ sql: "UPDATE users SET active = 0" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-UNBOUNDED-WRITE")).toBe(true);
  });

  it("PASS: UPDATE with WHERE clause", () => {
    const r = scanSql({ sql: "UPDATE users SET active = 0 WHERE id = 5" });
    expect(r.verdict).toBe("PASS");
  });

  it("PASS when allowUnboundedWrites policy is enabled", () => {
    const r = scanSql({
      sql: "DELETE FROM temp_log",
      policy: { allowUnboundedWrites: true },
    });
    expect(r.findings.some((f) => f.ruleId === "SQL-UNBOUNDED-WRITE")).toBe(false);
  });

  it("finding has critical severity", () => {
    const f = findingFor("DELETE FROM users", "SQL-UNBOUNDED-WRITE");
    expect(f?.severity).toBe("critical");
  });

  it("snippet is populated", () => {
    const f = findingFor("DELETE FROM users", "SQL-UNBOUNDED-WRITE");
    expect(f?.snippet).toContain("DELETE");
  });
});

// ---------------------------------------------------------------------------
// SQL-DROP (critical)
// ---------------------------------------------------------------------------
describe("SQL-DROP", () => {
  it("BLOCK: DROP TABLE", () => {
    const r = scanSql({ sql: "DROP TABLE users" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-DROP")).toBe(true);
  });

  it("BLOCK: DROP TABLE IF EXISTS", () => {
    const r = scanSql({ sql: "DROP TABLE IF EXISTS temp_staging" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("BLOCK: DROP VIEW", () => {
    expect(hasFinding("DROP VIEW v_users", "SQL-DROP")).toBe(true);
  });

  it("finding has critical severity", () => {
    const f = findingFor("DROP TABLE users", "SQL-DROP");
    expect(f?.severity).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// SQL-TRUNCATE (critical)
// ---------------------------------------------------------------------------
describe("SQL-TRUNCATE", () => {
  it("BLOCK: TRUNCATE TABLE", () => {
    const r = scanSql({ sql: "TRUNCATE TABLE users" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-TRUNCATE")).toBe(true);
  });

  it("BLOCK: TRUNCATE (short form)", () => {
    const r = scanSql({ sql: "TRUNCATE users" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("finding has critical severity", () => {
    const f = findingFor("TRUNCATE users", "SQL-TRUNCATE");
    expect(f?.severity).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// SQL-ALWAYS-TRUE (high)
// ---------------------------------------------------------------------------
describe("SQL-ALWAYS-TRUE", () => {
  it("flags WHERE 1=1", () => {
    expect(hasFinding("SELECT id FROM t WHERE 1=1", "SQL-ALWAYS-TRUE")).toBe(true);
  });

  it("flags WHERE 1 = 1 (with spaces)", () => {
    expect(hasFinding("SELECT id FROM t WHERE 1 = 1", "SQL-ALWAYS-TRUE")).toBe(true);
  });

  it("flags WHERE '1'='1' (same string tautology)", () => {
    expect(hasFinding("SELECT id FROM t WHERE '1'='1'", "SQL-ALWAYS-TRUE")).toBe(true);
  });

  it("flags WHERE 'x'='x'", () => {
    expect(hasFinding("SELECT id FROM t WHERE 'x'='x'", "SQL-ALWAYS-TRUE")).toBe(true);
  });

  it("flags OR TRUE", () => {
    expect(hasFinding("SELECT id FROM t WHERE id = 5 OR TRUE", "SQL-ALWAYS-TRUE")).toBe(true);
  });

  it("does NOT flag WHERE 1=2 (different numbers)", () => {
    expect(hasFinding("SELECT id FROM t WHERE 1=2", "SQL-ALWAYS-TRUE")).toBe(false);
  });

  it("does NOT flag WHERE 'a'='b' (different strings)", () => {
    expect(hasFinding("SELECT id FROM t WHERE 'a'='b'", "SQL-ALWAYS-TRUE")).toBe(false);
  });

  it("does NOT flag id=1 (identifier vs number)", () => {
    expect(hasFinding("SELECT id FROM t WHERE id=1", "SQL-ALWAYS-TRUE")).toBe(false);
  });

  it("string literal containing '1=1' does NOT fire (content is opaque)", () => {
    // The '1=1' is inside a string literal – it must NOT trigger the rule
    expect(hasFinding("SELECT * FROM t WHERE name = '1=1'", "SQL-ALWAYS-TRUE")).toBe(false);
  });

  it("string literal containing 'WHERE' does NOT trigger any keyword-based rule", () => {
    const r = scanSql({ sql: "SELECT * FROM t WHERE name = 'WHERE 1=1 OR TRUE'" });
    const alwaysTrue = r.findings.filter((f) => f.ruleId === "SQL-ALWAYS-TRUE");
    expect(alwaysTrue).toHaveLength(0);
  });

  it("finding has high severity", () => {
    const f = findingFor("SELECT id FROM t WHERE 1=1", "SQL-ALWAYS-TRUE");
    expect(f?.severity).toBe("high");
  });

  it("finding is BLOCK with default threshold", () => {
    const r = scanSql({ sql: "SELECT id FROM t WHERE 1=1" });
    expect(r.verdict).toBe("BLOCK");
  });
});

// ---------------------------------------------------------------------------
// SQL-STACKED (high)
// ---------------------------------------------------------------------------
describe("SQL-STACKED", () => {
  it("flags two statements with default maxStatements=1", () => {
    expect(hasFinding("SELECT 1; SELECT 2", "SQL-STACKED")).toBe(true);
  });

  it("BLOCK for stacked statements (default threshold)", () => {
    const r = scanSql({ sql: "SELECT 1; SELECT 2" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("passes two statements when maxStatements=2", () => {
    const r = scanSql({ sql: "SELECT 1; SELECT 2", policy: { maxStatements: 2 } });
    expect(r.findings.some((f) => f.ruleId === "SQL-STACKED")).toBe(false);
  });

  it("flags three statements when maxStatements=2", () => {
    const r = scanSql({ sql: "SELECT 1; SELECT 2; SELECT 3", policy: { maxStatements: 2 } });
    expect(r.findings.some((f) => f.ruleId === "SQL-STACKED")).toBe(true);
  });

  it("finding has high severity", () => {
    const f = findingFor("SELECT 1; SELECT 2", "SQL-STACKED");
    expect(f?.severity).toBe("high");
  });

  it("statementIndex points to the first extra statement", () => {
    const f = findingFor("SELECT 1; SELECT 2", "SQL-STACKED");
    expect(f?.statementIndex).toBe(1); // index of second stmt (first extra with maxStatements=1)
  });

  it("a single statement does NOT fire SQL-STACKED", () => {
    expect(hasFinding("SELECT 1", "SQL-STACKED")).toBe(false);
  });

  it("semicolons inside string literals are not counted as statement separators", () => {
    const r = scanSql({ sql: "SELECT 'a;b;c' FROM t" });
    expect(r.statements).toBe(1);
    expect(hasFinding("SELECT 'a;b;c' FROM t", "SQL-STACKED")).toBe(false);
  });

  it("trailing comment after semicolon is not a statement", () => {
    const r = scanSql({ sql: "SELECT 1; -- trailing" });
    expect(r.statements).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SQL-GRANT-ALTER (high)
// ---------------------------------------------------------------------------
describe("SQL-GRANT-ALTER", () => {
  it("flags GRANT", () => {
    const f = findingFor("GRANT SELECT ON users TO app_user", "SQL-GRANT-ALTER");
    expect(f?.severity).toBe("high");
  });

  it("flags REVOKE", () => {
    expect(hasFinding("REVOKE ALL ON users FROM app_user", "SQL-GRANT-ALTER")).toBe(true);
  });

  it("flags ALTER when allowDdl is not set", () => {
    expect(hasFinding("ALTER TABLE users ADD COLUMN age INT", "SQL-GRANT-ALTER")).toBe(true);
  });

  it("does NOT flag ALTER when allowDdl=true", () => {
    const r = scanSql({
      sql: "ALTER TABLE users ADD COLUMN age INT",
      policy: { allowDdl: true },
    });
    expect(r.findings.some((f) => f.ruleId === "SQL-GRANT-ALTER")).toBe(false);
  });

  it("flags CREATE when allowDdl is not set", () => {
    expect(hasFinding("CREATE TABLE tmp (id INT)", "SQL-GRANT-ALTER")).toBe(true);
  });

  it("does NOT flag CREATE when allowDdl=true", () => {
    const r = scanSql({
      sql: "CREATE TABLE tmp (id INT)",
      policy: { allowDdl: true },
    });
    expect(r.findings.some((f) => f.ruleId === "SQL-GRANT-ALTER")).toBe(false);
  });

  it("GRANT is flagged even when allowDdl=true (privileges are not DDL-gated)", () => {
    const r = scanSql({
      sql: "GRANT SELECT ON users TO app",
      policy: { allowDdl: true },
    });
    expect(r.findings.some((f) => f.ruleId === "SQL-GRANT-ALTER")).toBe(true);
  });

  it("REVOKE is flagged even when allowDdl=true", () => {
    const r = scanSql({
      sql: "REVOKE ALL ON users FROM app",
      policy: { allowDdl: true },
    });
    expect(r.findings.some((f) => f.ruleId === "SQL-GRANT-ALTER")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SQL-UNION-INJECTION (high)
// ---------------------------------------------------------------------------
describe("SQL-UNION-INJECTION", () => {
  it("flags UNION SELECT", () => {
    const f = findingFor(
      "SELECT id FROM t WHERE id=1 UNION SELECT username FROM users",
      "SQL-UNION-INJECTION",
    );
    expect(f?.severity).toBe("high");
  });

  it("flags UNION ALL SELECT", () => {
    expect(
      hasFinding(
        "SELECT id FROM t WHERE 1=1 UNION ALL SELECT password FROM accounts",
        "SQL-UNION-INJECTION",
      ),
    ).toBe(true);
  });

  it("UNION without SELECT does NOT fire (not injection shape)", () => {
    // INTERSECT, EXCEPT don't fire SQL-UNION-INJECTION
    expect(hasFinding("SELECT a FROM t1 INTERSECT SELECT b FROM t2", "SQL-UNION-INJECTION")).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// SQL-COMMENT-TAIL (medium)
// ---------------------------------------------------------------------------
describe("SQL-COMMENT-TAIL", () => {
  it("flags trailing -- comment after query content", () => {
    expect(
      hasFinding("SELECT id FROM users WHERE id = 1 -- end", "SQL-COMMENT-TAIL"),
    ).toBe(true);
  });

  it("flags trailing /* */ comment after query content", () => {
    expect(
      hasFinding("SELECT id FROM users WHERE id = 1 /* end */", "SQL-COMMENT-TAIL"),
    ).toBe(true);
  });

  it("does NOT flag a leading comment before any query content", () => {
    const r = scanSql({ sql: "-- Safe header\nSELECT id FROM t WHERE id = 1" });
    expect(r.findings.some((f) => f.ruleId === "SQL-COMMENT-TAIL")).toBe(false);
  });

  it("a block comment whose content contains keywords does NOT trigger other rules", () => {
    // The comment contains '1=1' but the rule must NOT fire for SQL-ALWAYS-TRUE
    const r = scanSql({ sql: "SELECT id FROM t /* WHERE 1=1 */" });
    expect(r.findings.some((f) => f.ruleId === "SQL-ALWAYS-TRUE")).toBe(false);
    // SQL-COMMENT-TAIL DOES fire (the comment appears after meaningful tokens)
    expect(r.findings.some((f) => f.ruleId === "SQL-COMMENT-TAIL")).toBe(true);
  });

  it("finding has medium severity", () => {
    const f = findingFor("SELECT 1 -- comment", "SQL-COMMENT-TAIL");
    expect(f?.severity).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// SQL-SELECT-STAR-NO-LIMIT (low)
// ---------------------------------------------------------------------------
describe("SQL-SELECT-STAR-NO-LIMIT", () => {
  it("flags SELECT * with no WHERE or LIMIT", () => {
    const f = findingFor("SELECT * FROM users", "SQL-SELECT-STAR-NO-LIMIT");
    expect(f?.severity).toBe("low");
  });

  it("does NOT flag SELECT * with WHERE clause", () => {
    expect(hasFinding("SELECT * FROM t WHERE id = 1", "SQL-SELECT-STAR-NO-LIMIT")).toBe(false);
  });

  it("does NOT flag SELECT * with LIMIT clause", () => {
    expect(hasFinding("SELECT * FROM t LIMIT 10", "SQL-SELECT-STAR-NO-LIMIT")).toBe(false);
  });

  it("does NOT flag SELECT * with TOP clause (T-SQL)", () => {
    expect(hasFinding("SELECT TOP 10 * FROM t", "SQL-SELECT-STAR-NO-LIMIT")).toBe(false);
  });

  it("does NOT flag SELECT COUNT(*) with no WHERE (aggregate, not wildcard)", () => {
    expect(hasFinding("SELECT COUNT(*) FROM users", "SQL-SELECT-STAR-NO-LIMIT")).toBe(false);
  });

  it("does NOT flag when placeholder acts as filter", () => {
    expect(hasFinding("SELECT * FROM t WHERE id = $1", "SQL-SELECT-STAR-NO-LIMIT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Parameterized placeholders – should all PASS clean
// ---------------------------------------------------------------------------
describe("parameterized placeholders", () => {
  it("$1 positional placeholder passes clean", () => {
    const r = scanSql({ sql: "SELECT * FROM users WHERE id = $1" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });

  it("? placeholder passes clean", () => {
    const r = scanSql({ sql: "SELECT * FROM users WHERE id = ?" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });

  it(":name placeholder passes clean", () => {
    const r = scanSql({ sql: "SELECT * FROM users WHERE id = :user_id" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });

  it("multiple placeholders ($1, ?, :name) pass clean", () => {
    const r = scanSql({
      sql: "INSERT INTO t (a, b, c) VALUES ($1, ?, :name)",
      policy: { maxStatements: 1 },
    });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Policy – blockSeverityAtOrAbove
// ---------------------------------------------------------------------------
describe("policy.blockSeverityAtOrAbove", () => {
  it("FLAG (not BLOCK) when threshold raised to critical", () => {
    // SELECT * with no WHERE/LIMIT is low; raising threshold to critical → FLAG
    const r = scanSql({
      sql: "SELECT * FROM users",
      policy: { blockSeverityAtOrAbove: "critical" },
    });
    expect(r.verdict).toBe("FLAG");
  });

  it("BLOCK for critical finding even when threshold is 'high'", () => {
    const r = scanSql({ sql: "DROP TABLE users" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("PASS when no findings", () => {
    const r = scanSql({ sql: "SELECT id FROM t WHERE id = 1" });
    expect(r.verdict).toBe("PASS");
  });

  it("FLAG for medium finding with threshold 'low' does not block", () => {
    // SQL-COMMENT-TAIL is medium; with blockSeverityAtOrAbove='high', verdict is FLAG
    const r = scanSql({
      sql: "SELECT 1 -- comment",
      policy: { blockSeverityAtOrAbove: "high" },
    });
    expect(r.verdict).toBe("FLAG");
  });
});

// ---------------------------------------------------------------------------
// Severity counts
// ---------------------------------------------------------------------------
describe("severity counts", () => {
  it("counts are zero for a clean query", () => {
    const r = scanSql({ sql: "SELECT id FROM t WHERE id = 1" });
    expect(r.counts).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
  });

  it("counts critical for DROP TABLE", () => {
    const r = scanSql({ sql: "DROP TABLE users" });
    expect(r.counts.critical).toBe(1);
  });

  it("counts low for SELECT * no limit", () => {
    const r = scanSql({ sql: "SELECT * FROM t" });
    expect(r.counts.low).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Statement count
// ---------------------------------------------------------------------------
describe("statement count", () => {
  it("is 1 for a single query", () => {
    expect(scanSql({ sql: "SELECT 1" }).statements).toBe(1);
  });

  it("is 2 for two semicolon-separated queries", () => {
    expect(scanSql({ sql: "SELECT 1; SELECT 2" }).statements).toBe(2);
  });

  it("is 0 for empty SQL", () => {
    expect(scanSql({ sql: "" }).statements).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Certificate format and determinism
// ---------------------------------------------------------------------------
describe("certificate", () => {
  it("result certificate starts with 'sha256:'", () => {
    const r = scanSql({ sql: "SELECT 1" });
    expect(r.certificate.startsWith("sha256:")).toBe(true);
  });

  it("result certificate has 64 hex chars after the prefix", () => {
    const r = scanSql({ sql: "SELECT 1" });
    const hex = r.certificate.slice("sha256:".length);
    expect(hex).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
  });

  it("generateCertificate is a pure deterministic function", () => {
    const a = generateCertificate("SELECT 1", "PASS", 0, 1_000_000);
    const b = generateCertificate("SELECT 1", "PASS", 0, 1_000_000);
    expect(a).toBe(b);
  });

  it("generateCertificate differs when any argument changes", () => {
    const base = generateCertificate("SELECT 1", "PASS", 0, 1_000_000);
    expect(generateCertificate("SELECT 2", "PASS", 0, 1_000_000)).not.toBe(base);
    expect(generateCertificate("SELECT 1", "BLOCK", 0, 1_000_000)).not.toBe(base);
    expect(generateCertificate("SELECT 1", "PASS", 1, 1_000_000)).not.toBe(base);
    expect(generateCertificate("SELECT 1", "PASS", 0, 1_000_001)).not.toBe(base);
  });

  it("sha256Hex returns a 64-char lowercase hex string", () => {
    const h = sha256Hex("hello");
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it("sha256Hex is deterministic", () => {
    expect(sha256Hex("test")).toBe(sha256Hex("test"));
  });

  it("latencyMs is a non-negative number", () => {
    const r = scanSql({ sql: "SELECT 1" });
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// End-to-end injection scenarios
// ---------------------------------------------------------------------------
describe("injection scenarios", () => {
  it("classic OR 1=1 injection is BLOCK", () => {
    const r = scanSql({ sql: "SELECT * FROM users WHERE password = '' OR '1'='1'" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-ALWAYS-TRUE")).toBe(true);
  });

  it("UNION SELECT password injection is BLOCK", () => {
    const r = scanSql({
      sql: "SELECT id FROM t WHERE id=1 UNION SELECT password FROM users",
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-UNION-INJECTION")).toBe(true);
  });

  it("trailing -- comment bypass is detected (FLAG/BLOCK)", () => {
    const r = scanSql({ sql: "SELECT * FROM users WHERE id=1 --" });
    expect(["FLAG", "BLOCK"]).toContain(r.verdict);
    expect(r.findings.some((f) => f.ruleId === "SQL-COMMENT-TAIL")).toBe(true);
  });

  it("DROP via stacked statements is BLOCK", () => {
    const r = scanSql({ sql: "SELECT 1; DROP TABLE users" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "SQL-DROP")).toBe(true);
  });
});
