/**
 * Redaction helpers. The scanner never echoes raw personal data back to the
 * caller — matches are masked in `entity.match`, and `redactText` produces a
 * safe copy of the input with each finding replaced by a typed placeholder.
 */

/**
 * Format-preserving mask: replaces every alphanumeric character with `*` while
 * keeping separators (spaces, dashes, dots, `@`), so `123-45-6789` becomes
 * `***-**-****`. Output is capped to avoid returning arbitrarily long strings.
 */
export function maskMatch(raw: string): string {
  let out = "";
  for (const ch of raw) out += /[A-Za-z0-9]/.test(ch) ? "*" : ch;
  return out.length > 64 ? `${out.slice(0, 64)}…` : out;
}

export interface RedactSpan {
  start: number;
  end: number;
  type: string;
}

/**
 * Replaces every span in `text` with `[REDACTED_<TYPE>]`. Spans are applied
 * from the end of the string backwards so earlier offsets stay valid.
 */
export function redactText(text: string, spans: RedactSpan[]): string {
  if (spans.length === 0) return text;
  const ordered = [...spans].sort((a, b) => b.start - a.start);
  let out = text;
  for (const s of ordered) {
    out = `${out.slice(0, s.start)}[REDACTED_${s.type.toUpperCase()}]${out.slice(s.end)}`;
  }
  return out;
}
