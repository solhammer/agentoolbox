/**
 * Shell command parser for cmdguard.
 *
 * Splits a shell command string into top-level SEGMENTS on the separators:
 *   ;  &&  ||  |  \n
 * while respecting:
 *   - single-quoted strings  '...'  (no escaping inside; ' ends the literal)
 *   - double-quoted strings  "..."  (backslash escapes honoured)
 *   - backslash escaping outside quotes
 *   - command substitution   $(...)  and  `...`  (balanced, may nest)
 *
 * Content inside quoted strings is NOT split and does NOT trigger rules —
 * the segment's argv-style token list marks quoted content as a single
 * "quoted" token.
 *
 * The argv token list is used for structural matching by the rule engine.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArgvTokenKind =
  | "word"        // bare unquoted word / identifier
  | "quoted"      // content of a quoted string (single or double)
  | "redirect"    // redirection operators: > >> < |
  | "subst"       // $(...) or `...` command substitution
  | "dollar-var"  // $VAR or ${VAR}
  | "sep"         // separator tokens that were the split point (not in argv)
  | "unknown";

export interface ArgvToken {
  kind: ArgvTokenKind;
  /** Normalised value (trimmed, upper-cased for comparisons). */
  value: string;
  /** Original verbatim text, used to reconstruct the snippet. */
  raw: string;
}

export interface Segment {
  /** Raw text of this segment (before any shell expansion). */
  raw: string;
  /** Argv-style structural tokens, in order. Quoted/substitution content is opaque. */
  argv: ArgvToken[];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse the given command string into top-level segments.
 * Never throws — malformed quoting is handled gracefully.
 */
export function parseCommand(command: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  const len = command.length;

  /** Accumulated characters for the current segment (raw text). */
  let segRaw = "";
  /** Accumulated tokens for the current segment. */
  let segArgv: ArgvToken[] = [];
  /** Current bare-word accumulator. */
  let wordBuf = "";

  function flushWord(): void {
    if (wordBuf.length === 0) return;
    segArgv.push({ kind: "word", value: wordBuf.trim(), raw: wordBuf });
    wordBuf = "";
  }

  function pushSegment(): void {
    flushWord();
    const raw = segRaw.trim();
    if (raw.length > 0 || segArgv.length > 0) {
      segments.push({ raw, argv: segArgv });
    }
    segRaw = "";
    segArgv = [];
    wordBuf = "";
  }

  function ch(offset = 0): string {
    return command.charAt(i + offset);
  }

  while (i < len) {
    const c = ch();

    // ── Single-quoted string '...' ──────────────────────────────────────────
    if (c === "'") {
      flushWord();
      const start = i;
      i++; // consume opening '
      while (i < len && command.charAt(i) !== "'") {
        i++;
      }
      if (i < len) i++; // consume closing '
      const raw = command.slice(start, i);
      const inner = raw.length >= 2 ? raw.slice(1, -1) : "";
      segRaw += raw;
      segArgv.push({ kind: "quoted", value: inner, raw });
      continue;
    }

    // ── Double-quoted string "..." ──────────────────────────────────────────
    if (c === '"') {
      flushWord();
      const start = i;
      i++; // consume opening "
      while (i < len && command.charAt(i) !== '"') {
        if (command.charAt(i) === '\\') i++; // skip escaped char
        i++;
      }
      if (i < len) i++; // consume closing "
      const raw = command.slice(start, i);
      const inner = raw.length >= 2 ? raw.slice(1, -1) : "";
      segRaw += raw;
      segArgv.push({ kind: "quoted", value: inner, raw });
      continue;
    }

    // ── Backslash escape (outside quotes) ───────────────────────────────────
    if (c === '\\') {
      const nextCh = command.charAt(i + 1);
      if (nextCh === '\n') {
        // line continuation — skip both
        segRaw += '\\\n';
        i += 2;
        continue;
      }
      // escaped character — treat as part of word
      const raw = '\\' + nextCh;
      wordBuf += raw;
      segRaw += raw;
      i += 2;
      continue;
    }

    // ── $( ... ) command substitution ───────────────────────────────────────
    if (c === '$' && command.charAt(i + 1) === '(') {
      flushWord();
      const start = i;
      i += 2; // consume $(
      let depth = 1;
      while (i < len && depth > 0) {
        const cc = command.charAt(i);
        if (cc === '(') depth++;
        else if (cc === ')') depth--;
        else if (cc === "'" || cc === '"') {
          // skip quoted content inside substitution
          const q = cc;
          i++;
          while (i < len && command.charAt(i) !== q) {
            if (q === '"' && command.charAt(i) === '\\') i++;
            i++;
          }
        }
        if (depth > 0) i++;
      }
      if (i < len) i++; // consume closing )
      const raw = command.slice(start, i);
      segRaw += raw;
      segArgv.push({ kind: "subst", value: raw, raw });
      continue;
    }

    // ── $VAR or ${VAR} ───────────────────────────────────────────────────────
    if (c === '$') {
      const next = command.charAt(i + 1);
      if (next === '{') {
        const start = i;
        i += 2;
        while (i < len && command.charAt(i) !== '}') i++;
        if (i < len) i++; // consume }
        const raw = command.slice(start, i);
        segRaw += raw;
        flushWord();
        segArgv.push({ kind: "dollar-var", value: raw, raw });
        continue;
      } else if (/[A-Za-z_]/.test(next)) {
        const start = i;
        i++; // skip $
        while (i < len && /\w/.test(command.charAt(i))) i++;
        const raw = command.slice(start, i);
        segRaw += raw;
        flushWord();
        segArgv.push({ kind: "dollar-var", value: raw, raw });
        continue;
      } else {
        // bare $ — treat as part of word
        wordBuf += c;
        segRaw += c;
        i++;
        continue;
      }
    }

    // ── Backtick command substitution `...` ─────────────────────────────────
    if (c === '`') {
      flushWord();
      const start = i;
      i++; // consume opening `
      while (i < len && command.charAt(i) !== '`') {
        if (command.charAt(i) === '\\') i++;
        i++;
      }
      if (i < len) i++; // consume closing `
      const raw = command.slice(start, i);
      segRaw += raw;
      segArgv.push({ kind: "subst", value: raw, raw });
      continue;
    }

    // ── && separator ─────────────────────────────────────────────────────────
    if (c === '&' && command.charAt(i + 1) === '&') {
      flushWord();
      pushSegment();
      i += 2;
      continue;
    }

    // ── || separator ─────────────────────────────────────────────────────────
    if (c === '|' && command.charAt(i + 1) === '|') {
      flushWord();
      pushSegment();
      i += 2;
      continue;
    }

    // ── | pipe separator ────────────────────────────────────────────────────
    if (c === '|') {
      flushWord();
      pushSegment();
      i++;
      continue;
    }

    // ── ; separator ──────────────────────────────────────────────────────────
    if (c === ';') {
      flushWord();
      pushSegment();
      i++;
      continue;
    }

    // ── Newline separator ────────────────────────────────────────────────────
    if (c === '\n') {
      flushWord();
      pushSegment();
      i++;
      continue;
    }

    // ── Redirection operators > >> < ────────────────────────────────────────
    if (c === '>' && command.charAt(i + 1) === '>') {
      flushWord();
      segRaw += '>>';
      segArgv.push({ kind: "redirect", value: ">>", raw: ">>" });
      i += 2;
      continue;
    }
    if (c === '>' || c === '<') {
      flushWord();
      segRaw += c;
      segArgv.push({ kind: "redirect", value: c, raw: c });
      i++;
      continue;
    }

    // ── Whitespace (intra-segment word separator) ────────────────────────────
    if (c === ' ' || c === '\t' || c === '\r') {
      flushWord();
      segRaw += c;
      i++;
      continue;
    }

    // ── Regular character — accumulate into word ─────────────────────────────
    wordBuf += c;
    segRaw += c;
    i++;
  }

  pushSegment();
  return segments;
}

// ---------------------------------------------------------------------------
// Helpers used by the rule engine
// ---------------------------------------------------------------------------

/**
 * Return the words (bare unquoted tokens) from an argv list, lower-cased.
 * Quoted content is excluded — rules must not fire on quoted strings.
 */
export function words(argv: ArgvToken[]): string[] {
  return argv
    .filter((t) => t.kind === "word")
    .map((t) => t.value.toLowerCase().replace(/^-+/, "").trim());
}

/**
 * All word-kind token values (lower-case, with dashes preserved for flags).
 */
export function rawWords(argv: ArgvToken[]): string[] {
  return argv.filter((t) => t.kind === "word").map((t) => t.value.toLowerCase());
}

/**
 * First word (command name) in the argv, lower-cased, or undefined.
 */
export function firstWord(argv: ArgvToken[]): string | undefined {
  const tok = argv.find((t) => t.kind === "word");
  return tok !== undefined ? tok.value.toLowerCase() : undefined;
}

/**
 * Check whether the argv contains a flag (e.g. "-f", "--force") anywhere.
 */
export function hasFlag(argv: ArgvToken[], ...flags: string[]): boolean {
  const flagSet = new Set(flags.map((f) => f.toLowerCase()));
  return argv.some((t) => t.kind === "word" && flagSet.has(t.value.toLowerCase()));
}

/**
 * Make a snippet from raw segment text: trimmed, capped at 120 chars.
 */
export function makeSnippet(raw: string): string {
  const t = raw.trim();
  return t.length > 120 ? t.slice(0, 117) + "..." : t;
}
