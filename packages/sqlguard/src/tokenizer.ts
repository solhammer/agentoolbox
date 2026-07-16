export type TokenType =
  | "keyword"
  | "identifier"
  | "number"
  | "string"
  | "comment"
  | "operator"
  | "punctuation"
  | "semicolon"
  | "whitespace"
  | "placeholder"
  | "unknown";

export interface Token {
  type: TokenType;
  /** Uppercase-normalised value (meaningful for keywords/identifiers/numbers/operators). */
  upper: string;
  /** Original verbatim text. */
  raw: string;
}

// ---------------------------------------------------------------------------
// SQL keyword set – used to classify bare identifiers as keywords so that
// rule patterns can match without worrying about case.
// ---------------------------------------------------------------------------
const SQL_KEYWORDS = new Set<string>([
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "LIKE",
  "BETWEEN",
  "EXISTS",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "CROSS",
  "FULL",
  "ON",
  "GROUP",
  "BY",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "TOP",
  "FETCH",
  "NEXT",
  "ROWS",
  "ONLY",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "MERGE",
  "CREATE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "RENAME",
  "TABLE",
  "VIEW",
  "INDEX",
  "SCHEMA",
  "DATABASE",
  "SEQUENCE",
  "GRANT",
  "REVOKE",
  "DENY",
  "USER",
  "ROLE",
  "PROCEDURE",
  "FUNCTION",
  "TRIGGER",
  "UNION",
  "ALL",
  "INTERSECT",
  "EXCEPT",
  "DISTINCT",
  "AS",
  "WITH",
  "RECURSIVE",
  "TRUE",
  "FALSE",
  "PRIMARY",
  "KEY",
  "FOREIGN",
  "REFERENCES",
  "UNIQUE",
  "CHECK",
  "DEFAULT",
  "CONSTRAINT",
  "COLUMN",
  "ADD",
  "IF",
  "EXEC",
  "EXECUTE",
  "CALL",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "TRANSACTION",
  "RETURNING",
  "OUTPUT",
  "USING",
  "OVER",
  "PARTITION",
  "ROW",
  "RANGE",
  "CURRENT",
  "PRECEDING",
  "FOLLOWING",
  "UNBOUNDED",
  "WINDOW",
]);

// ---------------------------------------------------------------------------
// Character helpers – use charAt() so they always return "" (not undefined)
// for out-of-bounds indices, keeping noUncheckedIndexedAccess happy.
// ---------------------------------------------------------------------------
function isAlpha(ch: string): boolean {
  return /^[a-zA-Z_]$/.test(ch);
}

function isAlphaNum(ch: string): boolean {
  return /^\w$/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isHexDigit(ch: string): boolean {
  return isDigit(ch) || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
}

function isWS(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql.charAt(i);

    // ── Whitespace ────────────────────────────────────────────────────────
    if (isWS(ch)) {
      const start = i;
      while (i < len && isWS(sql.charAt(i))) i++;
      tokens.push({ type: "whitespace", upper: " ", raw: sql.slice(start, i) });
      continue;
    }

    // ── Line comment: -- ──────────────────────────────────────────────────
    if (ch === "-" && sql.charAt(i + 1) === "-") {
      const start = i;
      while (i < len && sql.charAt(i) !== "\n") i++;
      tokens.push({ type: "comment", upper: "", raw: sql.slice(start, i) });
      continue;
    }

    // ── Block comment: /* … */ ────────────────────────────────────────────
    if (ch === "/" && sql.charAt(i + 1) === "*") {
      const start = i;
      i += 2;
      while (i < len && !(sql.charAt(i) === "*" && sql.charAt(i + 1) === "/")) {
        i++;
      }
      if (i < len) i += 2; // consume closing */
      tokens.push({ type: "comment", upper: "", raw: sql.slice(start, i) });
      continue;
    }

    // ── Single-quoted string: '…' with '' escaping ────────────────────────
    if (ch === "'") {
      const start = i;
      i++;
      while (i < len) {
        const c = sql.charAt(i);
        if (c === "'") {
          if (sql.charAt(i + 1) === "'") {
            i += 2; // escaped ''
          } else {
            i++; // closing '
            break;
          }
        } else {
          i++;
        }
      }
      tokens.push({ type: "string", upper: "", raw: sql.slice(start, i) });
      continue;
    }

    // ── Double-quoted identifier: "…" ─────────────────────────────────────
    if (ch === '"') {
      const start = i;
      i++;
      while (i < len && sql.charAt(i) !== '"') {
        if (sql.charAt(i) === "\\") i++; // skip escaped char
        i++;
      }
      if (i < len) i++; // closing "
      const raw = sql.slice(start, i);
      const inner = raw.length >= 2 ? raw.slice(1, -1) : raw;
      tokens.push({ type: "identifier", upper: inner.toUpperCase(), raw });
      continue;
    }

    // ── Backtick identifier: `…` ──────────────────────────────────────────
    if (ch === "`") {
      const start = i;
      i++;
      while (i < len && sql.charAt(i) !== "`") i++;
      if (i < len) i++; // closing `
      const raw = sql.slice(start, i);
      const inner = raw.length >= 2 ? raw.slice(1, -1) : raw;
      tokens.push({ type: "identifier", upper: inner.toUpperCase(), raw });
      continue;
    }

    // ── Dollar: $1 placeholder OR $$/$tag$ dollar-quoting ────────────────
    if (ch === "$") {
      const nextCh = sql.charAt(i + 1);

      // $1, $2 … positional placeholder
      if (isDigit(nextCh)) {
        const start = i;
        i++; // skip $
        while (i < len && isDigit(sql.charAt(i))) i++;
        tokens.push({ type: "placeholder", upper: "$N", raw: sql.slice(start, i) });
        continue;
      }

      // $$ or $tag$ dollar-quoting
      let j = i + 1;
      while (j < len && sql.charAt(j) !== "$" && isAlphaNum(sql.charAt(j))) j++;

      if (j < len && sql.charAt(j) === "$") {
        // We found an opening dollar-quote tag: sql[i..j+1)
        const tag = sql.slice(i, j + 1); // e.g. "$$" or "$body$"
        const start = i;
        i = j + 1; // advance past opening tag
        const closeIdx = sql.indexOf(tag, i);
        i = closeIdx === -1 ? len : closeIdx + tag.length;
        tokens.push({ type: "string", upper: "", raw: sql.slice(start, i) });
        continue;
      }

      // Bare $ with no recognised continuation – treat as unknown
      tokens.push({ type: "unknown", upper: "$", raw: "$" });
      i++;
      continue;
    }

    // ── Named placeholder: :name ──────────────────────────────────────────
    if (ch === ":" && isAlpha(sql.charAt(i + 1))) {
      const start = i;
      i++; // skip :
      while (i < len && isAlphaNum(sql.charAt(i))) i++;
      tokens.push({ type: "placeholder", upper: ":NAME", raw: sql.slice(start, i) });
      continue;
    }

    // ── ? placeholder ─────────────────────────────────────────────────────
    if (ch === "?") {
      tokens.push({ type: "placeholder", upper: "?", raw: "?" });
      i++;
      continue;
    }

    // ── Semicolon ──────────────────────────────────────────────────────────
    if (ch === ";") {
      tokens.push({ type: "semicolon", upper: ";", raw: ";" });
      i++;
      continue;
    }

    // ── Numbers ───────────────────────────────────────────────────────────
    if (isDigit(ch)) {
      const start = i;
      // Hex: 0x…
      if (ch === "0" && (sql.charAt(i + 1) === "x" || sql.charAt(i + 1) === "X")) {
        i += 2;
        while (i < len && isHexDigit(sql.charAt(i))) i++;
      } else {
        // Decimal / float
        while (i < len && (isDigit(sql.charAt(i)) || sql.charAt(i) === ".")) i++;
        // Scientific notation: 1e10, 1.5e-3
        const eCh = sql.charAt(i);
        if (eCh === "e" || eCh === "E") {
          i++;
          const signCh = sql.charAt(i);
          if (signCh === "+" || signCh === "-") i++;
          while (i < len && isDigit(sql.charAt(i))) i++;
        }
      }
      const raw = sql.slice(start, i);
      tokens.push({ type: "number", upper: raw.toUpperCase(), raw });
      continue;
    }

    // ── Identifiers and keywords ──────────────────────────────────────────
    if (isAlpha(ch)) {
      const start = i;
      while (i < len && isAlphaNum(sql.charAt(i))) i++;
      const raw = sql.slice(start, i);
      const upper = raw.toUpperCase();
      const type: TokenType = SQL_KEYWORDS.has(upper) ? "keyword" : "identifier";
      tokens.push({ type, upper, raw });
      continue;
    }

    // ── Multi-character operators ─────────────────────────────────────────
    if (ch === "!" && sql.charAt(i + 1) === "=") {
      tokens.push({ type: "operator", upper: "!=", raw: "!=" });
      i += 2;
      continue;
    }
    if (ch === "<" && sql.charAt(i + 1) === "=") {
      tokens.push({ type: "operator", upper: "<=", raw: "<=" });
      i += 2;
      continue;
    }
    if (ch === ">" && sql.charAt(i + 1) === "=") {
      tokens.push({ type: "operator", upper: ">=", raw: ">=" });
      i += 2;
      continue;
    }
    if (ch === "<" && sql.charAt(i + 1) === ">") {
      tokens.push({ type: "operator", upper: "<>", raw: "<>" });
      i += 2;
      continue;
    }
    if (ch === "|" && sql.charAt(i + 1) === "|") {
      tokens.push({ type: "operator", upper: "||", raw: "||" });
      i += 2;
      continue;
    }
    if (ch === ":" && sql.charAt(i + 1) === ":") {
      tokens.push({ type: "operator", upper: "::", raw: "::" });
      i += 2;
      continue;
    }

    // ── Single-char operators and punctuation ─────────────────────────────
    if ("=<>+-*/%&|^~".includes(ch)) {
      tokens.push({ type: "operator", upper: ch, raw: ch });
      i++;
      continue;
    }
    if ("()[].,".includes(ch)) {
      tokens.push({ type: "punctuation", upper: ch, raw: ch });
      i++;
      continue;
    }

    // ── Fallthrough: unknown character ────────────────────────────────────
    tokens.push({ type: "unknown", upper: ch, raw: ch });
    i++;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Statement splitter
//
// Splits on semicolons that are not inside string literals, comments, or
// dollar-quoted blocks (the tokenizer has already absorbed all of those into
// single opaque tokens, so we simply look for semicolon tokens).
//
// A segment is counted as a real statement only if it contains at least one
// token that is neither whitespace nor a comment (comment-only segments, e.g.
// the trailing `-- bypass` after the final `;`, are not counted).
// ---------------------------------------------------------------------------
export function splitStatements(tokens: Token[]): Token[][] {
  const statements: Token[][] = [];
  let current: Token[] = [];

  for (const token of tokens) {
    if (token.type === "semicolon") {
      if (hasSubstantiveContent(current)) {
        statements.push(current);
      }
      current = [];
    } else {
      current.push(token);
    }
  }

  if (hasSubstantiveContent(current)) {
    statements.push(current);
  }

  return statements;
}

function hasSubstantiveContent(tokens: Token[]): boolean {
  return tokens.some((t) => t.type !== "whitespace" && t.type !== "comment");
}
