# @agentoolbox/sqlguard — Specification

## Overview

`scanSql` is a deterministic, offline function that analyses a SQL string for dangerous patterns and returns a signed verdict. It does NOT connect to a database, make network calls, or mutate global state.

## Public API

```ts
function scanSql(input: SqlScanInput): SqlScanResult
```

### Input

```ts
interface SqlScanInput {
  sql: string;
  dialect?: "postgres" | "mysql" | "sqlite" | "tsql" | "generic";
  policy?: SqlScanPolicy;
}

interface SqlScanPolicy {
  allowDdl?: boolean;                               // default false
  allowUnboundedWrites?: boolean;                   // default false
  maxStatements?: number;                           // default 1
  blockSeverityAtOrAbove?: "low"|"medium"|"high"|"critical"; // default "high"
}
```

### Output

```ts
interface SqlScanResult {
  verdict: "PASS" | "FLAG" | "BLOCK";
  statements: number;
  findings: SqlFinding[];
  counts: Record<"low"|"medium"|"high"|"critical", number>;
  certificate: string; // "sha256:<64-char hex>"
  latencyMs: number;
}

interface SqlFinding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  statementIndex: number; // 0-based index into the statement list
  message: string;
  snippet: string;        // first ≤120 chars of the offending statement
}
```

## Tokenizer

The tokenizer is comment- and string-literal-aware. It produces an opaque token for each of the following constructs, preventing their content from triggering keyword-based rules:

- `'...'` — single-quoted string literals (with `''` escaping)
- `"..."` — double-quoted identifiers (ANSI SQL / PostgreSQL)
- `` `...` `` — backtick identifiers (MySQL)
- `--` … `\n` — line comments
- `/* … */` — block comments (including nested whitespace)
- `$$…$$` / `$tag$…$tag$` — PostgreSQL dollar-quoting

Parameterized placeholders (`$1`, `?`, `:name`) are tokenized as `placeholder` tokens and never classified as keywords.

Semicolons inside any of the above constructs are not treated as statement separators.

## Statement splitting

After tokenizing, the token stream is split on bare semicolons into a list of statements. Segments containing only whitespace or comments are not counted as statements.

## Rules

### SQL-UNBOUNDED-WRITE · critical

Fires when the first action keyword of a statement is `DELETE` or `UPDATE` and the statement contains no `WHERE` keyword in its clean token stream.

Suppressed when `policy.allowUnboundedWrites === true`.

### SQL-DROP · critical

Fires when the first keyword of a statement is `DROP`.

Not suppressed by any policy toggle.

### SQL-TRUNCATE · critical

Fires when the first keyword of a statement is `TRUNCATE`.

Not suppressed by any policy toggle.

### SQL-ALWAYS-TRUE · high

Fires when any of the following tautology patterns appear in the clean token stream of a statement:

- `<number> = <same-number>` (e.g. `1=1`, `0=0`)
- `<string-literal> = <identical-string-literal>` (e.g. `'x'='x'`)
- `OR TRUE` (keyword sequence)

String and comment content is opaque; only the token type and normalized value are examined.

### SQL-STACKED · high

Fires once when the total number of substantive statements exceeds `policy.maxStatements` (default 1). The `statementIndex` is the 0-based index of the first extra statement.

### SQL-GRANT-ALTER · high

- `GRANT` or `REVOKE` as first keyword → always fires (not DDL-gated)
- `ALTER` or `CREATE` as first keyword → fires unless `policy.allowDdl === true`

### SQL-UNION-INJECTION · high

Fires when the token sequence `UNION [ALL] SELECT` appears anywhere in the clean token stream of a statement.

### SQL-COMMENT-TAIL · medium

Fires when a comment token appears after at least one non-whitespace, non-comment token within the same statement. Leading-only comments (before any SQL content) do not fire this rule.

### SQL-SELECT-STAR-NO-LIMIT · low

Fires when:
1. The first keyword is `SELECT`
2. A `*` operator appears between `SELECT` and `FROM` at paren depth 0 (not directly preceded by `(`, to exclude `COUNT(*)`)
3. The statement has no `WHERE`, `LIMIT`, `TOP`, or `FETCH` keyword

## Verdict logic

```
severity_order = { low:0, medium:1, high:2, critical:3 }
block_level    = severity_order[policy.blockSeverityAtOrAbove]  // default high=2

if any finding where severity_order[finding.severity] >= block_level → BLOCK
else if any findings                                                  → FLAG
else                                                                  → PASS
```

## Certificate

```ts
certificate = "sha256:" + sha256Hex(
  sha256Hex(sql) + ":" + verdict + ":" + findings.length + ":" + Date.now()
)
```

The timestamp ensures uniqueness across repeated calls; the hash binds the verdict to the exact SQL input and finding count.
