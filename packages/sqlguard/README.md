# @agentoolbox/sqlguard

Deterministic, offline SQL safety gate for AI agents.

Scans SQL strings for dangerous patterns — without a database connection, without network calls, and without any mutable global state. Returns a signed verdict every time.

## Features

- **Token-aware**: comment- and string-literal-aware tokenizer prevents false positives from keywords inside quoted values or comments
- **Offline**: no database connection, no network calls, pure function
- **Deterministic**: same input → same findings (timestamp is included in the certificate, not the analysis)
- **Signed**: every result carries a `sha256:` certificate over the SQL, verdict, and finding count
- **Policy-configurable**: DDL allowlist, unbounded-write allowlist, statement count limit, block threshold

## Install

This package is private to the Agentoolbox monorepo.

## Usage

```ts
import { scanSql } from "@agentoolbox/sqlguard";

const result = scanSql({
  sql: "DELETE FROM users",
  dialect: "postgres",           // optional hint
  policy: {
    allowDdl: false,             // block CREATE/ALTER (default: false)
    allowUnboundedWrites: false, // block DELETE/UPDATE without WHERE (default: false)
    maxStatements: 1,            // block multi-statement batches (default: 1)
    blockSeverityAtOrAbove: "high", // BLOCK threshold (default: "high")
  },
});

console.log(result.verdict);     // "PASS" | "FLAG" | "BLOCK"
console.log(result.findings);    // SqlFinding[]
console.log(result.certificate); // "sha256:<64-char hex>"
```

## Rules

| Rule ID | Severity | Description |
|---|---|---|
| `SQL-UNBOUNDED-WRITE` | critical | DELETE or UPDATE with no WHERE clause |
| `SQL-DROP` | critical | DROP statement |
| `SQL-TRUNCATE` | critical | TRUNCATE statement |
| `SQL-ALWAYS-TRUE` | high | Tautology: `1=1`, `'x'='x'`, `OR TRUE` |
| `SQL-STACKED` | high | More statements than `maxStatements` |
| `SQL-GRANT-ALTER` | high | GRANT/REVOKE (always); ALTER/CREATE unless `allowDdl` |
| `SQL-UNION-INJECTION` | high | UNION [ALL] SELECT injection shape |
| `SQL-COMMENT-TAIL` | medium | Trailing `--` or `/*` after SQL content |
| `SQL-SELECT-STAR-NO-LIMIT` | low | SELECT * with no WHERE/LIMIT/TOP |

## Verdict logic

```
worst finding severity >= blockSeverityAtOrAbove → BLOCK
any findings                                     → FLAG
no findings                                      → PASS
```

Default `blockSeverityAtOrAbove` = `"high"`, so `critical` and `high` findings → BLOCK.

## Development

```bash
pnpm --filter @agentoolbox/sqlguard build
pnpm --filter @agentoolbox/sqlguard typecheck
pnpm --filter @agentoolbox/sqlguard test
```
