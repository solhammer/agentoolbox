# @agentoolbox/netguard

Deterministic, offline URL / egress / SSRF gate for AI agents.

Parses and classifies URLs against bundled reserved-range tables — without network calls, without DNS resolution by default, and without any mutable global state. Returns a signed verdict every time.

## Features

- **SSRF-aware**: detects cloud instance metadata endpoints (169.254.169.254, fd00:ec2::254, metadata.google.internal, …) at critical severity
- **IP classification**: classifies IPv4 and IPv6 addresses against RFC-1918, loopback, link-local, and reserved ranges using bundled tables
- **Obfuscation detection**: normalizes and flags decimal-integer IPs (2130706433), octal (0177.0.0.1), and hex (0x7f000001, 0x7f.0.0.1) encodings
- **Offline by default**: fully deterministic with no network calls; DNS resolution is opt-in only
- **Policy-configurable**: scheme allowlist, host allowlist/denylist, private-range toggle, port restrictions, block threshold
- **Signed**: every result carries a `sha256:` certificate over the URL, verdict, and finding count

## Install

This package is private to the Agentoolbox monorepo.

## Usage

```ts
import { scanUrl } from "@agentoolbox/netguard";

const result = await scanUrl({
  url: "http://169.254.169.254/latest/meta-data/",
  policy: {
    allowSchemes: ["http", "https"],  // default
    denyPrivate: true,                // block RFC-1918 ranges (default)
    blockSeverityAtOrAbove: "high",   // BLOCK threshold (default)
  },
});

console.log(result.verdict);     // "PASS" | "FLAG" | "BLOCK"
console.log(result.target);      // parsed UrlTarget
console.log(result.findings);    // UrlFinding[]
console.log(result.certificate); // "sha256:<64-char hex>"
```

## Rules

| Rule ID | Severity | Description |
|---|---|---|
| `NET-METADATA-ENDPOINT` | critical | Cloud instance metadata host (SSRF exfiltration) |
| `NET-MALFORMED-URL` | high | URL could not be parsed by the WHATWG URL API |
| `NET-NO-HOST` | high | URL has no host component (file:, data:, …) |
| `NET-SCHEME-DENIED` | high | Scheme not in `allowSchemes` |
| `NET-LOOPBACK` | high | Loopback IP (127/8, ::1) |
| `NET-PRIVATE-IP` | high | RFC-1918 / ULA private range (when `denyPrivate`) |
| `NET-LINK-LOCAL` | high | Link-local IP (169.254/16, fe80::/10) |
| `NET-DECIMAL-IP-OBFUSCATION` | high | IP as decimal integer (2130706433) |
| `NET-OCTAL-HEX-IP` | high | IP in octal (0177.0.0.1) or hex (0x7f000001) notation |
| `NET-OFF-ALLOWLIST` | high | Host not in `allowHosts` (when set) |
| `NET-DENYLISTED-HOST` | high | Host in `denyHosts` |
| `NET-RESOLVES-TO-PRIVATE` | high | Hostname DNS-resolves to private/loopback/metadata IP (opt-in) |
| `NET-CREDENTIALS-IN-URL` | medium | Userinfo (user:pass@host) present in URL |
| `NET-PUNYCODE-HOMOGRAPH` | medium | Host contains xn-- Punycode label |
| `NET-RESERVED-IP` | medium | Reserved/unspecified IP (0/8, 100.64/10, 192.0.2/24, 240/4) |
| `NET-NONSTANDARD-PORT` | low | Explicit non-default port (or port not in `allowedPorts`) |

## Verdict logic

```
worst finding severity >= blockSeverityAtOrAbove → BLOCK
any findings                                     → FLAG
no findings                                      → PASS
```

Default `blockSeverityAtOrAbove` = `"high"`, so `critical` and `high` findings → BLOCK.

## Development

```bash
pnpm --filter @agentoolbox/netguard build
pnpm --filter @agentoolbox/netguard typecheck
pnpm --filter @agentoolbox/netguard test
```
