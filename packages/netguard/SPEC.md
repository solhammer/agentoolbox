# @agentoolbox/netguard — Specification

## Overview

`scanUrl` is a deterministic, offline-by-default function that analyses a URL string for SSRF risks and dangerous egress patterns, returning a signed verdict. It does NOT make network calls unless `policy.resolve === true`.

## Public API

```ts
async function scanUrl(input: UrlScanInput): Promise<UrlScanResult>
```

### Input

```ts
interface UrlScanInput {
  url: string;
  policy?: UrlScanPolicy;
}

interface UrlScanPolicy {
  allowSchemes?: string[];              // default ["http","https"]
  allowHosts?: string[];               // default: all hosts allowed
  denyHosts?: string[];                // default: none denied
  denyPrivate?: boolean;               // default true
  allowedPorts?: number[];             // default: any explicit port flagged
  resolve?: boolean;                   // default false — DNS is opt-in
  blockSeverityAtOrAbove?: Severity;  // default "high"
}
```

### Output

```ts
interface UrlScanResult {
  verdict: "PASS" | "FLAG" | "BLOCK";
  target: UrlTarget;
  findings: UrlFinding[];
  counts: Record<"low"|"medium"|"high"|"critical", number>;
  certificate: string; // "sha256:<64-char hex>"
  latencyMs: number;
}

interface UrlTarget {
  scheme: string;
  host: string;                      // unbracketed; "" for opaque-host schemes
  hostType: "ipv4" | "ipv6" | "hostname";
  ipClass: IpClass;                  // "unknown" for hostnames without DNS
  port: number | null;               // null when scheme default is used
  normalizedUrl: string;             // WHATWG href
}

interface UrlFinding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}
```

## URL Parsing

URLs are parsed with the WHATWG URL API (`new URL(...)`). If parsing throws, NET-MALFORMED-URL is emitted and a best-effort target is constructed from the raw string.

The WHATWG URL API normalises many IP obfuscation forms before the rule engine sees them:
- Decimal integer: `2130706433` → `127.0.0.1`
- Octal-dotted: `0177.0.0.1` → `127.0.0.1`
- Hex-dotted: `0x7f.0.0.1` → `127.0.0.1`
- Full hex: `0x7f000001` → `127.0.0.1`

Obfuscation is detected by comparing the raw host string (extracted before normalization) to the parsed hostname. If they differ and the normalized form is a dotted-decimal IPv4, the appropriate obfuscation rule fires in addition to any IP-range rules.

IPv4-mapped IPv6 addresses (e.g. `::ffff:7f00:1` = `::ffff:127.0.0.1`) are classified via their embedded IPv4 address.

## IP Classification Tables

### IPv4

| Range | IpClass |
|---|---|
| 127.0.0.0/8 | loopback |
| 10.0.0.0/8 | private |
| 172.16.0.0/12 | private |
| 192.168.0.0/16 | private |
| 169.254.0.0/16 | link-local |
| 0.0.0.0/8 | reserved |
| 100.64.0.0/10 | reserved (CGNAT) |
| 192.0.2.0/24 | reserved (TEST-NET-1) |
| 240.0.0.0/4 | reserved (class E) |
| everything else | public |

### IPv6

| Range | IpClass |
|---|---|
| ::1/128 | loopback |
| fc00::/7 (fc00::/8, fd00::/8) | private (ULA) |
| fe80::/10 | link-local |
| ::ffff:0:0/96 | inherits IPv4 classification |
| ::/128 | reserved |
| everything else | public |

## Rules

### NET-METADATA-ENDPOINT · critical

Fires when the host matches a known cloud instance metadata endpoint:
- IPv4: `169.254.169.254`
- IPv6: `fd00:ec2::254` (WHATWG-canonical)
- Hostnames: `metadata.google.internal`, `metadata.goog`, `metadata`

Not suppressed by any policy toggle.

### NET-MALFORMED-URL · high

Fires when `new URL(input.url)` throws. A best-effort UrlTarget is returned so callers always receive a structured result.

### NET-NO-HOST · high

Fires when the URL parses successfully but the hostname is empty (e.g. `file:///path`, `data:...`). No further host-dependent rules fire.

### NET-SCHEME-DENIED · high

Fires when the URL scheme is not in `policy.allowSchemes` (default `["http","https"]`).

### NET-LOOPBACK · high

Fires when the host is a loopback IP (`127/8`, `::1`). No policy toggle.

### NET-PRIVATE-IP · high

Fires when the host is in a private IP range (RFC 1918 / IPv6 ULA) and `policy.denyPrivate !== false`. Default `denyPrivate` is `true`.

### NET-LINK-LOCAL · high

Fires when the host is a link-local address (`169.254/16`, `fe80::/10`). No policy toggle.

### NET-DECIMAL-IP-OBFUSCATION · high

Fires when the raw host string is a pure decimal integer (no dots) that the WHATWG URL API normalises to a dotted-decimal IPv4 address.

### NET-OCTAL-HEX-IP · high

Fires when the raw host uses octal (e.g. `0177.0.0.1`) or hexadecimal (e.g. `0x7f000001`, `0x7f.0.0.1`) notation that the WHATWG URL API normalises to a dotted-decimal IPv4 address.

### NET-OFF-ALLOWLIST · high

Fires when `policy.allowHosts` is set (non-empty) and the normalized host is not in the list. Applies to both IP addresses and hostnames.

### NET-DENYLISTED-HOST · high

Fires when `policy.denyHosts` is set and the normalized host matches an entry. Applies to both IP addresses and hostnames.

### NET-RESOLVES-TO-PRIVATE · high

Fires ONLY when `policy.resolve === true`. Resolves the hostname via `node:dns/promises` and flags if any returned IP address is loopback, private, link-local, or a metadata endpoint. Designed to catch DNS-rebinding attacks. No DNS call is made when `resolve` is false (the default).

### NET-CREDENTIALS-IN-URL · medium

Fires when the URL contains a userinfo component (`username` or `password` is non-empty in the parsed URL).

### NET-PUNYCODE-HOMOGRAPH · medium

Fires when the normalised hostname contains an `xn--` Punycode label, which may indicate a homograph attack.

### NET-RESERVED-IP · medium

Fires when the host is in a reserved-but-not-private IP range: `0/8`, `100.64/10` (CGNAT), `192.0.2/24` (TEST-NET-1), `240/4` (class E).

### NET-NONSTANDARD-PORT · low

Fires when an explicit non-default port is specified in the URL (`url.port !== ""`):
- If `policy.allowedPorts` is set: fires when the port is not in the allowed list.
- If `policy.allowedPorts` is not set: fires for any explicit non-default port.

## Verdict logic

```
severity_order = { low:0, medium:1, high:2, critical:3 }
block_level    = severity_order[policy.blockSeverityAtOrAbove]  // default high=2

if any finding where severity_order[finding.severity] >= block_level → BLOCK
else if any findings                                                   → FLAG
else                                                                   → PASS
```

## Certificate

```ts
certificate = "sha256:" + sha256Hex(
  sha256Hex(url) + ":" + verdict + ":" + findings.length + ":" + Date.now()
)
```

The timestamp ensures uniqueness across repeated calls; the hash binds the verdict to the exact URL input and finding count.
