/** Supported deterministic format names */
export type FormatName = "date" | "date-time" | "email" | "uuid" | "uri" | "ipv4";

/** Map of format name → validation regex */
export const FORMAT_PATTERNS: Record<FormatName, RegExp> = {
  // YYYY-MM-DD (approximate — does not validate calendar correctness)
  "date": /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,

  // ISO 8601 date-time with optional fractional seconds and timezone
  "date-time":
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/i,

  // Simplified RFC-5322 email (no folding whitespace, no comments)
  "email": /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // RFC 4122 UUID (any variant/version)
  "uuid":
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  // URI — scheme + at least one char after ://
  "uri": /^[a-zA-Z][a-zA-Z0-9+\-.]*:[^\s]+$/,

  // IPv4 dotted-decimal
  "ipv4":
    /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
};

/** The set of all known format names (for guarding unknown ones). */
export const KNOWN_FORMATS = new Set<string>(Object.keys(FORMAT_PATTERNS));

/** Returns true if value matches the given format, or if the format is unknown (ignored). */
export function validateFormat(format: unknown, value: string): boolean {
  if (typeof format !== "string") return true;
  if (!KNOWN_FORMATS.has(format)) return true; // unknown formats are ignored
  const pattern = FORMAT_PATTERNS[format as FormatName];
  return pattern.test(value);
}
