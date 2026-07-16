import type { UrlFinding, UrlScanPolicy, UrlTarget } from "./types.js";

// ---------------------------------------------------------------------------
// Known metadata endpoint constants
// ---------------------------------------------------------------------------

/** IPv4 addresses of well-known cloud instance metadata endpoints. */
const METADATA_IPV4 = new Set<string>(["169.254.169.254"]);

/**
 * WHATWG-canonical IPv6 addresses of cloud metadata endpoints.
 * AWS EC2 IMDSv2 over IPv6 uses fd00:ec2::254.
 */
const METADATA_IPV6 = new Set<string>(["fd00:ec2::254"]);

/** Hostnames that are cloud metadata endpoints regardless of DNS resolution. */
const METADATA_HOSTNAMES = new Set<string>([
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
]);

function isMetadataEndpoint(host: string, hostType: "ipv4" | "ipv6" | "hostname"): boolean {
  const lower = host.toLowerCase();
  if (hostType === "ipv4") return METADATA_IPV4.has(lower);
  if (hostType === "ipv6") return METADATA_IPV6.has(lower);
  return METADATA_HOSTNAMES.has(lower);
}

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

/**
 * Run all URL rules against a fully-parsed target and policy.
 * Does NOT include the NET-MALFORMED-URL finding (handled in scanner.ts)
 * or NET-RESOLVES-TO-PRIVATE (requires async DNS, also in scanner.ts).
 *
 * Rules are evaluated independently — multiple findings can fire for the
 * same URL.  No rule suppresses another.
 */
export function checkUrl(
  target: UrlTarget,
  rawHost: string,
  hasUserinfo: boolean,
  obfuscation: "decimal" | "octal-hex" | null,
  policy: UrlScanPolicy,
): UrlFinding[] {
  const findings: UrlFinding[] = [];
  const { scheme, host, hostType, ipClass, port } = target;
  const allowSchemes = policy.allowSchemes ?? ["http", "https"];

  // ── NET-SCHEME-DENIED ────────────────────────────────────────────────────
  if (!allowSchemes.includes(scheme)) {
    findings.push({
      ruleId: "NET-SCHEME-DENIED",
      severity: "high",
      message: `Scheme "${scheme}" is not in the allowed list [${allowSchemes.join(", ")}]`,
    });
  }

  // ── NET-NO-HOST ──────────────────────────────────────────────────────────
  if (!host) {
    findings.push({
      ruleId: "NET-NO-HOST",
      severity: "high",
      message: "URL has no host component",
    });
    // No further host-dependent rules can fire without a host
    return findings;
  }

  // ── NET-CREDENTIALS-IN-URL ───────────────────────────────────────────────
  if (hasUserinfo) {
    findings.push({
      ruleId: "NET-CREDENTIALS-IN-URL",
      severity: "medium",
      message: "URL contains credentials (userinfo) in the authority component",
    });
  }

  // ── Obfuscation checks ───────────────────────────────────────────────────
  if (obfuscation === "decimal") {
    findings.push({
      ruleId: "NET-DECIMAL-IP-OBFUSCATION",
      severity: "high",
      message: `IP address encoded as a decimal integer: "${rawHost}"`,
    });
  } else if (obfuscation === "octal-hex") {
    findings.push({
      ruleId: "NET-OCTAL-HEX-IP",
      severity: "high",
      message: `IP address uses octal or hexadecimal encoding: "${rawHost}"`,
    });
  }

  // ── NET-METADATA-ENDPOINT (critical) ─────────────────────────────────────
  // This is checked independently of and in addition to NET-LINK-LOCAL /
  // NET-PRIVATE-IP, because the metadata endpoint deserves a critical flag
  // beyond the general IP-range finding.
  if (isMetadataEndpoint(host, hostType)) {
    findings.push({
      ruleId: "NET-METADATA-ENDPOINT",
      severity: "critical",
      message: `Host "${host}" is a cloud instance metadata endpoint (SSRF risk)`,
    });
  }

  // ── IP-address-specific checks ───────────────────────────────────────────
  if (hostType !== "hostname") {
    // NET-LOOPBACK
    if (ipClass === "loopback") {
      findings.push({
        ruleId: "NET-LOOPBACK",
        severity: "high",
        message: `Host "${host}" is a loopback address`,
      });
    }

    // NET-PRIVATE-IP (gated by denyPrivate, default true)
    if (ipClass === "private" && policy.denyPrivate !== false) {
      findings.push({
        ruleId: "NET-PRIVATE-IP",
        severity: "high",
        message: `Host "${host}" is in a private IP range (RFC 1918 / ULA)`,
      });
    }

    // NET-LINK-LOCAL
    if (ipClass === "link-local") {
      findings.push({
        ruleId: "NET-LINK-LOCAL",
        severity: "high",
        message: `Host "${host}" is a link-local address`,
      });
    }

    // NET-RESERVED-IP
    if (ipClass === "reserved") {
      findings.push({
        ruleId: "NET-RESERVED-IP",
        severity: "medium",
        message: `Host "${host}" is in a reserved IP range`,
      });
    }
  } else {
    // ── Hostname-specific checks ─────────────────────────────────────────

    // NET-PUNYCODE-HOMOGRAPH
    // The WHATWG URL API normalises IDN hostnames to punycode (xn-- labels),
    // so checking the normalised hostname is sufficient.
    if (/xn--/i.test(host)) {
      findings.push({
        ruleId: "NET-PUNYCODE-HOMOGRAPH",
        severity: "medium",
        message: `Host "${host}" contains a Punycode label (possible homograph attack)`,
      });
    }
  }

  // ── NET-OFF-ALLOWLIST (applies to all host types) ────────────────────────
  if (policy.allowHosts !== undefined && policy.allowHosts.length > 0) {
    const lowerHost = host.toLowerCase();
    const allowed = policy.allowHosts.some((h) => h.toLowerCase() === lowerHost);
    if (!allowed) {
      findings.push({
        ruleId: "NET-OFF-ALLOWLIST",
        severity: "high",
        message: `Host "${host}" is not in the allowed host list`,
      });
    }
  }

  // ── NET-DENYLISTED-HOST (applies to all host types) ──────────────────────
  if (policy.denyHosts !== undefined && policy.denyHosts.length > 0) {
    const lowerHost = host.toLowerCase();
    const denied = policy.denyHosts.some((h) => h.toLowerCase() === lowerHost);
    if (denied) {
      findings.push({
        ruleId: "NET-DENYLISTED-HOST",
        severity: "high",
        message: `Host "${host}" is in the denied host list`,
      });
    }
  }

  // ── NET-NONSTANDARD-PORT ─────────────────────────────────────────────────
  // `target.port` is non-null only when an explicit, non-default port was
  // specified (the WHATWG URL API returns port="" for scheme-default ports).
  if (port !== null) {
    if (policy.allowedPorts !== undefined) {
      if (!policy.allowedPorts.includes(port)) {
        findings.push({
          ruleId: "NET-NONSTANDARD-PORT",
          severity: "low",
          message: `Port ${port} is not in the allowed ports list [${policy.allowedPorts.join(", ")}]`,
        });
      }
    } else {
      // No allowedPorts set — flag any explicit non-default port
      findings.push({
        ruleId: "NET-NONSTANDARD-PORT",
        severity: "low",
        message: `Port ${port} is not the default port for scheme "${scheme}"`,
      });
    }
  }

  return findings;
}
