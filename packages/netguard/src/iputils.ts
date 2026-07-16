import type { IpClass } from "./types.js";

// ---------------------------------------------------------------------------
// IPv4 classification
// ---------------------------------------------------------------------------

/**
 * Classify a normalized dotted-decimal IPv4 address string into an IpClass.
 * Returns "unknown" if the string cannot be parsed as IPv4.
 */
export function classifyIPv4(addr: string): IpClass {
  const parts = addr.split(".");
  if (parts.length !== 4) return "unknown";

  const a = parseInt(parts[0] ?? "NaN", 10);
  const b = parseInt(parts[1] ?? "NaN", 10);
  const c = parseInt(parts[2] ?? "NaN", 10);

  if (isNaN(a) || isNaN(b) || isNaN(c)) return "unknown";

  // 127.0.0.0/8 — loopback
  if (a === 127) return "loopback";

  // 10.0.0.0/8 — private (RFC 1918)
  if (a === 10) return "private";

  // 172.16.0.0/12 — private (RFC 1918): 172.16.0.0 – 172.31.255.255
  if (a === 172 && b >= 16 && b <= 31) return "private";

  // 192.168.0.0/16 — private (RFC 1918)
  if (a === 192 && b === 168) return "private";

  // 169.254.0.0/16 — link-local (RFC 3927)
  if (a === 169 && b === 254) return "link-local";

  // 0.0.0.0/8 — "this" network / unspecified
  if (a === 0) return "reserved";

  // 100.64.0.0/10 — shared address space / CGNAT (RFC 6598): 100.64.0.0 – 100.127.255.255
  if (a === 100 && (b & 0xc0) === 64) return "reserved";

  // 192.0.2.0/24 — TEST-NET-1 (RFC 5737)
  if (a === 192 && b === 0 && c === 2) return "reserved";

  // 240.0.0.0/4 — reserved / future use (RFC 1112 class E): 240.0.0.0 – 255.255.255.255
  if (a >= 240) return "reserved";

  return "public";
}

// ---------------------------------------------------------------------------
// IPv6 classification
// ---------------------------------------------------------------------------

/**
 * Expand a WHATWG-canonical IPv6 address string into an array of 8 16-bit numbers.
 * Returns null if parsing fails.
 *
 * Handles the standard compressed form ("::" for a run of zeros).
 * Does NOT handle embedded IPv4 notation ("::ffff:127.0.0.1") — the WHATWG
 * URL serialiser converts those to hex groups before we see them.
 */
function expandIPv6Groups(addr: string): number[] | null {
  const doubleColonIdx = addr.indexOf("::");

  let left: string[];
  let right: string[];

  if (doubleColonIdx === -1) {
    const parts = addr.split(":");
    if (parts.length !== 8) return null;
    left = parts;
    right = [];
  } else {
    const leftStr = addr.slice(0, doubleColonIdx);
    const rightStr = addr.slice(doubleColonIdx + 2);
    left = leftStr ? leftStr.split(":") : [];
    right = rightStr ? rightStr.split(":") : [];
  }

  const zeros = Array<number>(8 - left.length - right.length).fill(0);
  const all = [...left.map((g) => parseInt(g || "0", 16)), ...zeros, ...right.map((g) => parseInt(g || "0", 16))];

  if (all.length !== 8) return null;
  return all;
}

/**
 * Classify a WHATWG-canonical IPv6 address string (without surrounding brackets).
 */
export function classifyIPv6(addr: string): IpClass {
  const groups = expandIPv6Groups(addr);
  if (groups === null || groups.length !== 8) return "unknown";

  const g0 = groups[0] ?? 0;
  const g1 = groups[1] ?? 0;
  const g2 = groups[2] ?? 0;
  const g3 = groups[3] ?? 0;
  const g4 = groups[4] ?? 0;
  const g5 = groups[5] ?? 0;
  const g6 = groups[6] ?? 0;
  const g7 = groups[7] ?? 0;

  // ::1/128 — loopback
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 === 1) {
    return "loopback";
  }

  // fc00::/7 — unique local (ULA / private): covers fc00::/8 and fd00::/8
  // First byte must match pattern 1111110x (0xfc or 0xfd).
  const firstByte = (g0 >> 8) & 0xff;
  if ((firstByte & 0xfe) === 0xfc) return "private";

  // fe80::/10 — link-local: first 10 bits = 1111111010
  if ((g0 & 0xffc0) === 0xfe80) return "link-local";

  // ::ffff:0:0/96 — IPv4-mapped (WHATWG serialises embedded IPv4 to hex groups)
  // e.g. ::ffff:127.0.0.1 becomes ::ffff:7f00:1
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    const embeddedIPv4 = `${(g6 >> 8) & 0xff}.${g6 & 0xff}.${(g7 >> 8) & 0xff}.${g7 & 0xff}`;
    return classifyIPv4(embeddedIPv4);
  }

  // ::/128 — unspecified
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 === 0) {
    return "reserved";
  }

  return "public";
}

// ---------------------------------------------------------------------------
// Host type detection
// ---------------------------------------------------------------------------

/**
 * Determine whether a WHATWG-normalised hostname is an IPv4 address, IPv6
 * address (unbracketed, as returned by url.hostname), or a DNS hostname.
 */
export function detectHostType(hostname: string): "ipv4" | "ipv6" | "hostname" {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return "ipv4";
  if (hostname.includes(":")) return "ipv6";
  return "hostname";
}

/**
 * Classify a host string by IP class.
 * For hostname type returns "unknown" (DNS resolution needed).
 */
export function classifyHost(hostname: string, hostType: "ipv4" | "ipv6" | "hostname"): IpClass {
  if (hostType === "ipv4") return classifyIPv4(hostname);
  if (hostType === "ipv6") return classifyIPv6(hostname);
  return "unknown";
}

// ---------------------------------------------------------------------------
// Raw-host extraction (pre-WHATWG normalization)
// ---------------------------------------------------------------------------

/**
 * Extract the host component from a raw URL string BEFORE WHATWG normalization.
 * Used to detect IP obfuscation by comparing the raw host to the normalized one.
 */
export function extractRawHost(rawUrl: string): string {
  const schemeEnd = rawUrl.indexOf("://");
  if (schemeEnd === -1) return "";

  const afterScheme = rawUrl.slice(schemeEnd + 3);

  // Authority ends at the first /, ?, or # (or end of string)
  const pathStart = afterScheme.search(/[/?#]/);
  const authority = pathStart === -1 ? afterScheme : afterScheme.slice(0, pathStart);

  // Strip userinfo (everything up to and including the last @)
  const atIdx = authority.lastIndexOf("@");
  const hostAndPort = atIdx >= 0 ? authority.slice(atIdx + 1) : authority;

  // Handle IPv6 bracket notation: [::1] or [::1]:8080
  if (hostAndPort.startsWith("[")) {
    const closeIdx = hostAndPort.indexOf("]");
    if (closeIdx >= 0) return hostAndPort.slice(0, closeIdx + 1); // include brackets
    return hostAndPort;
  }

  // Strip port (everything after the last colon)
  const colonIdx = hostAndPort.lastIndexOf(":");
  return colonIdx >= 0 ? hostAndPort.slice(0, colonIdx) : hostAndPort;
}

// ---------------------------------------------------------------------------
// Obfuscation detection
// ---------------------------------------------------------------------------

/**
 * Compare the raw host extracted from the original URL string to the
 * WHATWG-normalised hostname.  If they differ in a way that indicates IP
 * encoding obfuscation, return the type; otherwise return null.
 *
 * Detected kinds:
 *   "decimal"   — pure decimal integer notation  (e.g. 2130706433)
 *   "octal-hex" — octal-dotted or hex notation   (e.g. 0177.0.0.1, 0x7f000001)
 */
export function detectObfuscation(
  rawHost: string,
  normalizedHost: string,
): "decimal" | "octal-hex" | null {
  const lowerRaw = rawHost.toLowerCase();
  const lowerNorm = normalizedHost.toLowerCase();

  // No change — not obfuscated
  if (lowerRaw === lowerNorm) return null;

  // IPv6 bracket removal is not obfuscation (e.g. [::1] → ::1)
  if (lowerRaw === `[${lowerNorm}]`) return null;

  // WHATWG normalized to a dotted-decimal IPv4 address but the raw form was different
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lowerNorm)) {
    // Pure decimal integer: no dots, all digits (e.g. 2130706433)
    if (/^\d+$/.test(rawHost)) return "decimal";

    // Hex notation: 0x prefix on any part (e.g. 0x7f000001, 0x7f.0.0.1)
    if (/(?:^|\.)0x/i.test(rawHost)) return "octal-hex";

    // Octal notation: an octet starts with 0 followed by more digits (e.g. 0177.0.0.1)
    if (/(?:^|\.)0\d/.test(rawHost)) return "octal-hex";

    // Any other IP normalization that changed the host
    return "octal-hex";
  }

  return null;
}
