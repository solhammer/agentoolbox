import { describe, it, expect } from "vitest";
import { scanUrl } from "./scanner.js";
import { generateCertificate, sha256Hex } from "./certificate.js";
import {
  classifyIPv4,
  classifyIPv6,
  detectHostType,
  extractRawHost,
  detectObfuscation,
} from "./iputils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hasFinding(url: string, ruleId: string): Promise<boolean> {
  const r = await scanUrl({ url });
  return r.findings.some((f) => f.ruleId === ruleId);
}

async function findingFor(url: string, ruleId: string) {
  const r = await scanUrl({ url });
  return r.findings.find((f) => f.ruleId === ruleId);
}

// ---------------------------------------------------------------------------
// Clean / PASS cases
// ---------------------------------------------------------------------------
describe("clean PASS cases", () => {
  it("http public hostname is PASS", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });

  it("https with path and query is PASS", async () => {
    const r = await scanUrl({ url: "https://api.example.com/v1/data?page=1" });
    expect(r.verdict).toBe("PASS");
  });

  it("https with fragment is PASS", async () => {
    const r = await scanUrl({ url: "https://example.com/page#section" });
    expect(r.verdict).toBe("PASS");
  });

  it("public IPv4 is PASS", async () => {
    const r = await scanUrl({ url: "https://8.8.8.8/" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });

  it("target.normalizedUrl is set for clean URL", async () => {
    const r = await scanUrl({ url: "https://example.com" });
    expect(r.target.normalizedUrl).toBe("https://example.com/");
  });
});

// ---------------------------------------------------------------------------
// NET-MALFORMED-URL (high)
// ---------------------------------------------------------------------------
describe("NET-MALFORMED-URL", () => {
  it("empty string is BLOCK (malformed)", async () => {
    const r = await scanUrl({ url: "" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-MALFORMED-URL")).toBe(true);
  });

  it("bare word without scheme is BLOCK (malformed)", async () => {
    const r = await scanUrl({ url: "not-a-url" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-MALFORMED-URL")).toBe(true);
  });

  it("missing host after scheme is BLOCK (malformed)", async () => {
    const r = await scanUrl({ url: "http://" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("finding has high severity", async () => {
    const f = await findingFor("not-a-url", "NET-MALFORMED-URL");
    expect(f?.severity).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// NET-NO-HOST (high)
// ---------------------------------------------------------------------------
describe("NET-NO-HOST", () => {
  it("file:///etc/passwd has no host", async () => {
    const r = await scanUrl({ url: "file:///etc/passwd" });
    expect(r.findings.some((f) => f.ruleId === "NET-NO-HOST")).toBe(true);
  });

  it("data: URL has no host", async () => {
    const r = await scanUrl({ url: "data:text/html,<h1>hi</h1>" });
    expect(r.findings.some((f) => f.ruleId === "NET-NO-HOST")).toBe(true);
  });

  it("NET-NO-HOST finding has high severity", async () => {
    const f = await findingFor("file:///etc/passwd", "NET-NO-HOST");
    expect(f?.severity).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// NET-METADATA-ENDPOINT (critical)
// ---------------------------------------------------------------------------
describe("NET-METADATA-ENDPOINT", () => {
  it("BLOCK: 169.254.169.254 (AWS/GCP/Azure IMDS)", async () => {
    const r = await scanUrl({ url: "http://169.254.169.254/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
  });

  it("finding has critical severity", async () => {
    const f = await findingFor("http://169.254.169.254/", "NET-METADATA-ENDPOINT");
    expect(f?.severity).toBe("critical");
  });

  it("BLOCK: 169.254.169.254 with metadata path", async () => {
    const r = await scanUrl({ url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
  });

  it("BLOCK: fd00:ec2::254 (EC2 IPv6 IMDS)", async () => {
    const r = await scanUrl({ url: "http://[fd00:ec2::254]/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
  });

  it("BLOCK: metadata.google.internal hostname", async () => {
    const r = await scanUrl({ url: "http://metadata.google.internal/computeMetadata/v1/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
  });

  it("BLOCK: metadata.goog hostname", async () => {
    const r = await scanUrl({ url: "http://metadata.goog/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
  });

  it("BLOCK: bare 'metadata' hostname", async () => {
    const r = await scanUrl({ url: "http://metadata/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
  });

  it("169.254.169.254 also fires NET-LINK-LOCAL (rules are independent)", async () => {
    const r = await scanUrl({ url: "http://169.254.169.254/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LINK-LOCAL")).toBe(true);
  });

  it("other 169.254.x.x is link-local but NOT metadata", async () => {
    const r = await scanUrl({ url: "http://169.254.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LINK-LOCAL")).toBe(true);
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-PRIVATE-IP (high) — IPv4
// ---------------------------------------------------------------------------
describe("NET-PRIVATE-IP (IPv4)", () => {
  it("BLOCK: 10.0.0.1 (10/8)", async () => {
    const r = await scanUrl({ url: "http://10.0.0.1/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("BLOCK: 10.255.255.255 (10/8 upper bound)", async () => {
    const r = await scanUrl({ url: "http://10.255.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("BLOCK: 172.16.0.1 (172.16/12 lower bound)", async () => {
    const r = await scanUrl({ url: "http://172.16.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("BLOCK: 172.31.255.255 (172.16/12 upper bound)", async () => {
    const r = await scanUrl({ url: "http://172.31.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("PASS: 172.15.255.255 (just outside 172.16/12)", async () => {
    const r = await scanUrl({ url: "http://172.15.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(false);
  });

  it("PASS: 172.32.0.0 (just outside 172.16/12)", async () => {
    const r = await scanUrl({ url: "http://172.32.0.0/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(false);
  });

  it("BLOCK: 192.168.1.1 (192.168/16)", async () => {
    const r = await scanUrl({ url: "http://192.168.1.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await findingFor("http://10.0.0.1/", "NET-PRIVATE-IP");
    expect(f?.severity).toBe("high");
  });

  it("PASS when denyPrivate=false", async () => {
    const r = await scanUrl({ url: "http://10.0.0.1/", policy: { denyPrivate: false } });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-PRIVATE-IP — IPv6 ULA (fc00::/7)
// ---------------------------------------------------------------------------
describe("NET-PRIVATE-IP (IPv6 ULA)", () => {
  it("BLOCK: fc00::1 (fc00::/8)", async () => {
    const r = await scanUrl({ url: "http://[fc00::1]/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("BLOCK: fd00::1 (fd00::/8, ULA)", async () => {
    const r = await scanUrl({ url: "http://[fd00::1]/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("PASS when denyPrivate=false for ULA", async () => {
    const r = await scanUrl({ url: "http://[fc00::1]/", policy: { denyPrivate: false } });
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-LOOPBACK (high)
// ---------------------------------------------------------------------------
describe("NET-LOOPBACK", () => {
  it("BLOCK: 127.0.0.1", async () => {
    const r = await scanUrl({ url: "http://127.0.0.1/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("BLOCK: 127.255.255.255 (upper bound of 127/8)", async () => {
    const r = await scanUrl({ url: "http://127.255.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("BLOCK: IPv6 ::1", async () => {
    const r = await scanUrl({ url: "http://[::1]/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await findingFor("http://127.0.0.1/", "NET-LOOPBACK");
    expect(f?.severity).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// NET-LINK-LOCAL (high)
// ---------------------------------------------------------------------------
describe("NET-LINK-LOCAL", () => {
  it("BLOCK: 169.254.0.1 (link-local, not metadata)", async () => {
    const r = await scanUrl({ url: "http://169.254.0.1/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-LINK-LOCAL")).toBe(true);
  });

  it("BLOCK: 169.254.255.255 (upper bound)", async () => {
    const r = await scanUrl({ url: "http://169.254.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LINK-LOCAL")).toBe(true);
  });

  it("BLOCK: IPv6 fe80::1", async () => {
    const r = await scanUrl({ url: "http://[fe80::1]/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-LINK-LOCAL")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await findingFor("http://169.254.0.1/", "NET-LINK-LOCAL");
    expect(f?.severity).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// NET-RESERVED-IP (medium)
// ---------------------------------------------------------------------------
describe("NET-RESERVED-IP", () => {
  it("FLAG: 0.0.0.0 (unspecified)", async () => {
    const r = await scanUrl({ url: "http://0.0.0.0/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(true);
  });

  it("finding has medium severity", async () => {
    const f = await findingFor("http://0.0.0.0/", "NET-RESERVED-IP");
    expect(f?.severity).toBe("medium");
  });

  it("FLAG: 100.64.0.1 (CGNAT / shared address space)", async () => {
    const r = await scanUrl({ url: "http://100.64.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(true);
  });

  it("FLAG: 100.127.255.255 (upper bound of CGNAT block)", async () => {
    const r = await scanUrl({ url: "http://100.127.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(true);
  });

  it("PASS: 100.128.0.0 (just outside CGNAT block)", async () => {
    const r = await scanUrl({ url: "http://100.128.0.0/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(false);
  });

  it("FLAG: 192.0.2.1 (TEST-NET-1)", async () => {
    const r = await scanUrl({ url: "http://192.0.2.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(true);
  });

  it("FLAG: 240.0.0.1 (class E / future use)", async () => {
    const r = await scanUrl({ url: "http://240.0.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(true);
  });

  it("FLAG: 255.255.255.255 (broadcast)", async () => {
    const r = await scanUrl({ url: "http://255.255.255.255/" });
    expect(r.findings.some((f) => f.ruleId === "NET-RESERVED-IP")).toBe(true);
  });

  it("verdict is FLAG (not BLOCK) at default threshold for reserved-only URL", async () => {
    // NET-RESERVED-IP is medium; default blockSeverityAtOrAbove = high → FLAG
    const r = await scanUrl({ url: "http://0.0.0.0/" });
    expect(r.verdict).toBe("FLAG");
  });
});

// ---------------------------------------------------------------------------
// NET-DECIMAL-IP-OBFUSCATION (high)
// ---------------------------------------------------------------------------
describe("NET-DECIMAL-IP-OBFUSCATION", () => {
  it("BLOCK: 2130706433 (= 127.0.0.1 as decimal integer)", async () => {
    const r = await scanUrl({ url: "http://2130706433/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-DECIMAL-IP-OBFUSCATION")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await findingFor("http://2130706433/", "NET-DECIMAL-IP-OBFUSCATION");
    expect(f?.severity).toBe("high");
  });

  it("decimal-obfuscated IP also fires NET-LOOPBACK (normalizes to 127.0.0.1)", async () => {
    const r = await scanUrl({ url: "http://2130706433/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("decimal-obfuscated private IP fires NET-DECIMAL-IP-OBFUSCATION and NET-PRIVATE-IP", async () => {
    // 167772161 = 10.0.0.1
    const r = await scanUrl({ url: "http://167772161/" });
    expect(r.findings.some((f) => f.ruleId === "NET-DECIMAL-IP-OBFUSCATION")).toBe(true);
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("normal dotted-decimal IP does NOT fire NET-DECIMAL-IP-OBFUSCATION", async () => {
    const r = await scanUrl({ url: "http://127.0.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-DECIMAL-IP-OBFUSCATION")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-OCTAL-HEX-IP (high)
// ---------------------------------------------------------------------------
describe("NET-OCTAL-HEX-IP", () => {
  it("BLOCK: 0177.0.0.1 (octal first octet = 127)", async () => {
    const r = await scanUrl({ url: "http://0177.0.0.1/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-OCTAL-HEX-IP")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await findingFor("http://0177.0.0.1/", "NET-OCTAL-HEX-IP");
    expect(f?.severity).toBe("high");
  });

  it("BLOCK: 0x7f000001 (full hex, = 127.0.0.1)", async () => {
    const r = await scanUrl({ url: "http://0x7f000001/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-OCTAL-HEX-IP")).toBe(true);
  });

  it("BLOCK: 0x7f.0.0.1 (hex first octet)", async () => {
    const r = await scanUrl({ url: "http://0x7f.0.0.1/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-OCTAL-HEX-IP")).toBe(true);
  });

  it("octal-encoded IP also fires NET-LOOPBACK", async () => {
    const r = await scanUrl({ url: "http://0177.0.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("hex-encoded IP also fires NET-LOOPBACK", async () => {
    const r = await scanUrl({ url: "http://0x7f000001/" });
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("normal dotted-decimal does NOT fire NET-OCTAL-HEX-IP", async () => {
    const r = await scanUrl({ url: "http://127.0.0.1/" });
    expect(r.findings.some((f) => f.ruleId === "NET-OCTAL-HEX-IP")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-SCHEME-DENIED (high)
// ---------------------------------------------------------------------------
describe("NET-SCHEME-DENIED", () => {
  it("BLOCK: file:// is denied by default", async () => {
    const r = await scanUrl({ url: "file:///etc/passwd" });
    expect(r.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(true);
  });

  it("BLOCK: ftp:// is denied by default", async () => {
    const r = await scanUrl({ url: "ftp://files.example.com/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(true);
  });

  it("BLOCK: gopher:// is denied by default", async () => {
    const r = await scanUrl({ url: "gopher://example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await findingFor("ftp://files.example.com/", "NET-SCHEME-DENIED");
    expect(f?.severity).toBe("high");
  });

  it("http and https are allowed by default (no NET-SCHEME-DENIED)", async () => {
    const http = await scanUrl({ url: "http://example.com/" });
    const https = await scanUrl({ url: "https://example.com/" });
    expect(http.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(false);
    expect(https.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(false);
  });

  it("custom allowSchemes permits ftp", async () => {
    const r = await scanUrl({
      url: "ftp://files.example.com/",
      policy: { allowSchemes: ["http", "https", "ftp"] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(false);
  });

  it("custom allowSchemes set to https-only blocks http", async () => {
    const r = await scanUrl({
      url: "http://example.com/",
      policy: { allowSchemes: ["https"] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-SCHEME-DENIED")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NET-CREDENTIALS-IN-URL (medium)
// ---------------------------------------------------------------------------
describe("NET-CREDENTIALS-IN-URL", () => {
  it("flags user:pass@host", async () => {
    const r = await scanUrl({ url: "http://user:pass@example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-CREDENTIALS-IN-URL")).toBe(true);
  });

  it("finding has medium severity", async () => {
    const f = await findingFor("http://user:pass@example.com/", "NET-CREDENTIALS-IN-URL");
    expect(f?.severity).toBe("medium");
  });

  it("flags username-only@ userinfo", async () => {
    const r = await scanUrl({ url: "http://user@example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-CREDENTIALS-IN-URL")).toBe(true);
  });

  it("no credentials does not fire NET-CREDENTIALS-IN-URL", async () => {
    const r = await scanUrl({ url: "http://example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-CREDENTIALS-IN-URL")).toBe(false);
  });

  it("verdict is FLAG for credentials-only finding (medium < default block threshold)", async () => {
    const r = await scanUrl({ url: "http://user:pass@example.com/" });
    expect(r.verdict).toBe("FLAG");
  });
});

// ---------------------------------------------------------------------------
// NET-PUNYCODE-HOMOGRAPH (medium)
// ---------------------------------------------------------------------------
describe("NET-PUNYCODE-HOMOGRAPH", () => {
  it("flags xn-- punycode label in hostname", async () => {
    const r = await scanUrl({ url: "http://xn--bcher-kva.example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PUNYCODE-HOMOGRAPH")).toBe(true);
  });

  it("finding has medium severity", async () => {
    const f = await findingFor("http://xn--bcher-kva.example.com/", "NET-PUNYCODE-HOMOGRAPH");
    expect(f?.severity).toBe("medium");
  });

  it("plain ASCII hostname does not fire NET-PUNYCODE-HOMOGRAPH", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-PUNYCODE-HOMOGRAPH")).toBe(false);
  });

  it("verdict is FLAG for punycode-only finding (medium < default block threshold)", async () => {
    const r = await scanUrl({ url: "http://xn--bcher-kva.example.com/" });
    expect(r.verdict).toBe("FLAG");
  });
});

// ---------------------------------------------------------------------------
// NET-OFF-ALLOWLIST (high)
// ---------------------------------------------------------------------------
describe("NET-OFF-ALLOWLIST", () => {
  it("BLOCK: host not in allowHosts list", async () => {
    const r = await scanUrl({
      url: "https://evil.com/",
      policy: { allowHosts: ["api.example.com"] },
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-OFF-ALLOWLIST")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await (async () => {
      const r = await scanUrl({ url: "https://evil.com/", policy: { allowHosts: ["good.com"] } });
      return r.findings.find((f) => f.ruleId === "NET-OFF-ALLOWLIST");
    })();
    expect(f?.severity).toBe("high");
  });

  it("PASS: host in allowHosts list", async () => {
    const r = await scanUrl({
      url: "https://api.example.com/",
      policy: { allowHosts: ["api.example.com"] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-OFF-ALLOWLIST")).toBe(false);
    expect(r.verdict).toBe("PASS");
  });

  it("allowHosts comparison is case-insensitive", async () => {
    const r = await scanUrl({
      url: "https://API.EXAMPLE.COM/",
      policy: { allowHosts: ["api.example.com"] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-OFF-ALLOWLIST")).toBe(false);
  });

  it("no allowHosts set does NOT fire NET-OFF-ALLOWLIST", async () => {
    const r = await scanUrl({ url: "https://any-site.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-OFF-ALLOWLIST")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-DENYLISTED-HOST (high)
// ---------------------------------------------------------------------------
describe("NET-DENYLISTED-HOST", () => {
  it("BLOCK: host in denyHosts", async () => {
    const r = await scanUrl({
      url: "https://evil.com/",
      policy: { denyHosts: ["evil.com"] },
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.findings.some((f) => f.ruleId === "NET-DENYLISTED-HOST")).toBe(true);
  });

  it("finding has high severity", async () => {
    const f = await (async () => {
      const r = await scanUrl({ url: "https://evil.com/", policy: { denyHosts: ["evil.com"] } });
      return r.findings.find((f) => f.ruleId === "NET-DENYLISTED-HOST");
    })();
    expect(f?.severity).toBe("high");
  });

  it("PASS: host not in denyHosts", async () => {
    const r = await scanUrl({
      url: "https://good.com/",
      policy: { denyHosts: ["evil.com"] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-DENYLISTED-HOST")).toBe(false);
  });

  it("denyHosts comparison is case-insensitive", async () => {
    const r = await scanUrl({
      url: "https://EVIL.COM/",
      policy: { denyHosts: ["evil.com"] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-DENYLISTED-HOST")).toBe(true);
  });

  it("empty denyHosts array does NOT fire NET-DENYLISTED-HOST", async () => {
    const r = await scanUrl({ url: "https://example.com/", policy: { denyHosts: [] } });
    expect(r.findings.some((f) => f.ruleId === "NET-DENYLISTED-HOST")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NET-NONSTANDARD-PORT (low)
// ---------------------------------------------------------------------------
describe("NET-NONSTANDARD-PORT", () => {
  it("FLAG: explicit non-default port 8080 for http", async () => {
    const r = await scanUrl({ url: "http://example.com:8080/" });
    expect(r.findings.some((f) => f.ruleId === "NET-NONSTANDARD-PORT")).toBe(true);
  });

  it("finding has low severity", async () => {
    const f = await findingFor("http://example.com:8080/", "NET-NONSTANDARD-PORT");
    expect(f?.severity).toBe("low");
  });

  it("verdict is FLAG (not BLOCK) for port-only finding", async () => {
    const r = await scanUrl({ url: "http://example.com:8080/" });
    expect(r.verdict).toBe("FLAG");
  });

  it("no finding for http://example.com/ (default port 80)", async () => {
    const r = await scanUrl({ url: "http://example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-NONSTANDARD-PORT")).toBe(false);
  });

  it("no finding for https://example.com/ (default port 443)", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.findings.some((f) => f.ruleId === "NET-NONSTANDARD-PORT")).toBe(false);
  });

  it("allowedPorts: port in list does NOT fire", async () => {
    const r = await scanUrl({
      url: "http://example.com:8080/",
      policy: { allowedPorts: [8080] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-NONSTANDARD-PORT")).toBe(false);
  });

  it("allowedPorts: port not in list DOES fire", async () => {
    const r = await scanUrl({
      url: "http://example.com:9000/",
      policy: { allowedPorts: [8080, 8443] },
    });
    expect(r.findings.some((f) => f.ruleId === "NET-NONSTANDARD-PORT")).toBe(true);
  });

  it("target.port is set to the explicit port number", async () => {
    const r = await scanUrl({ url: "http://example.com:3000/" });
    expect(r.target.port).toBe(3000);
  });

  it("target.port is null when using the scheme default", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.target.port).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// IPv6 specifics
// ---------------------------------------------------------------------------
describe("IPv6 edge cases", () => {
  it("IPv4-mapped loopback ::ffff:127.0.0.1 is classified as loopback", async () => {
    // WHATWG normalises ::ffff:127.0.0.1 to ::ffff:7f00:1
    const r = await scanUrl({ url: "http://[::ffff:127.0.0.1]/" });
    expect(r.target.hostType).toBe("ipv6");
    expect(r.target.ipClass).toBe("loopback");
    expect(r.findings.some((f) => f.ruleId === "NET-LOOPBACK")).toBe(true);
  });

  it("IPv4-mapped private ::ffff:10.0.0.1 is classified as private", async () => {
    const r = await scanUrl({ url: "http://[::ffff:10.0.0.1]/" });
    expect(r.target.ipClass).toBe("private");
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("public IPv6 2001:db8:: is PASS (no RFC-special meaning for routing)", async () => {
    // 2001:db8::/32 is documentation range, classified as public here
    const r = await scanUrl({ url: "http://[2001:db8::1]/" });
    expect(r.target.hostType).toBe("ipv6");
    expect(r.target.ipClass).toBe("public");
    expect(r.verdict).toBe("PASS");
  });

  it("::/128 unspecified IPv6 is reserved", async () => {
    const r = await scanUrl({ url: "http://[::]/" });
    expect(r.target.ipClass).toBe("reserved");
  });

  it("fe80::1 is link-local IPv6", async () => {
    const r = await scanUrl({ url: "http://[fe80::1]/" });
    expect(r.target.ipClass).toBe("link-local");
    expect(r.findings.some((f) => f.ruleId === "NET-LINK-LOCAL")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UrlTarget structure
// ---------------------------------------------------------------------------
describe("UrlTarget structure", () => {
  it("scheme is extracted correctly", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.target.scheme).toBe("https");
  });

  it("host is the unbracketed hostname / IP", async () => {
    const r = await scanUrl({ url: "http://[::1]/" });
    expect(r.target.host).toBe("::1");
  });

  it("hostType 'ipv4' set for dotted-decimal address", async () => {
    const r = await scanUrl({ url: "http://1.2.3.4/" });
    expect(r.target.hostType).toBe("ipv4");
  });

  it("hostType 'ipv6' set for IPv6 address", async () => {
    const r = await scanUrl({ url: "http://[::1]/" });
    expect(r.target.hostType).toBe("ipv6");
  });

  it("hostType 'hostname' set for DNS name", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.target.hostType).toBe("hostname");
  });

  it("ipClass 'unknown' for DNS hostname (no resolution)", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.target.ipClass).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Policy — blockSeverityAtOrAbove
// ---------------------------------------------------------------------------
describe("policy.blockSeverityAtOrAbove", () => {
  it("default 'high' → reserved IP (medium) gives FLAG not BLOCK", async () => {
    const r = await scanUrl({ url: "http://0.0.0.0/" });
    expect(r.verdict).toBe("FLAG");
  });

  it("blockSeverityAtOrAbove='medium' → reserved IP (medium) gives BLOCK", async () => {
    const r = await scanUrl({
      url: "http://0.0.0.0/",
      policy: { blockSeverityAtOrAbove: "medium" },
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("blockSeverityAtOrAbove='critical' → private IP (high) gives FLAG not BLOCK", async () => {
    const r = await scanUrl({
      url: "http://10.0.0.1/",
      policy: { blockSeverityAtOrAbove: "critical" },
    });
    expect(r.verdict).toBe("FLAG");
  });

  it("blockSeverityAtOrAbove='critical' → metadata endpoint (critical) still BLOCK", async () => {
    const r = await scanUrl({
      url: "http://169.254.169.254/",
      policy: { blockSeverityAtOrAbove: "critical" },
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("blockSeverityAtOrAbove='low' → port finding (low) gives BLOCK", async () => {
    const r = await scanUrl({
      url: "http://example.com:9000/",
      policy: { blockSeverityAtOrAbove: "low" },
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("PASS when no findings regardless of threshold", async () => {
    const r = await scanUrl({
      url: "https://example.com/",
      policy: { blockSeverityAtOrAbove: "low" },
    });
    expect(r.verdict).toBe("PASS");
  });
});

// ---------------------------------------------------------------------------
// Severity counts
// ---------------------------------------------------------------------------
describe("severity counts", () => {
  it("all counts zero for clean URL", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.counts).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
  });

  it("counts critical for metadata endpoint", async () => {
    const r = await scanUrl({ url: "http://169.254.169.254/" });
    expect(r.counts.critical).toBeGreaterThanOrEqual(1);
  });

  it("counts medium for reserved IP", async () => {
    const r = await scanUrl({ url: "http://0.0.0.0/" });
    expect(r.counts.medium).toBeGreaterThanOrEqual(1);
  });

  it("counts low for nonstandard port", async () => {
    const r = await scanUrl({ url: "http://example.com:9000/" });
    expect(r.counts.low).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Certificate format and determinism
// ---------------------------------------------------------------------------
describe("certificate", () => {
  it("certificate starts with 'sha256:'", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(r.certificate.startsWith("sha256:")).toBe(true);
  });

  it("certificate has 64 hex chars after the prefix", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    const hex = r.certificate.slice("sha256:".length);
    expect(hex).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
  });

  it("generateCertificate is a pure deterministic function", () => {
    const a = generateCertificate("https://example.com/", "PASS", 0, 1_000_000);
    const b = generateCertificate("https://example.com/", "PASS", 0, 1_000_000);
    expect(a).toBe(b);
  });

  it("generateCertificate differs when any argument changes", () => {
    const base = generateCertificate("https://example.com/", "PASS", 0, 1_000_000);
    expect(generateCertificate("https://other.com/", "PASS", 0, 1_000_000)).not.toBe(base);
    expect(generateCertificate("https://example.com/", "BLOCK", 0, 1_000_000)).not.toBe(base);
    expect(generateCertificate("https://example.com/", "PASS", 1, 1_000_000)).not.toBe(base);
    expect(generateCertificate("https://example.com/", "PASS", 0, 1_000_001)).not.toBe(base);
  });

  it("sha256Hex returns a 64-char lowercase hex string", () => {
    const h = sha256Hex("hello");
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it("sha256Hex is deterministic", () => {
    expect(sha256Hex("test")).toBe(sha256Hex("test"));
  });

  it("latencyMs is a non-negative number", async () => {
    const r = await scanUrl({ url: "https://example.com/" });
    expect(typeof r.latencyMs).toBe("number");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// iputils unit tests
// ---------------------------------------------------------------------------
describe("classifyIPv4", () => {
  it("127.0.0.1 → loopback", () => expect(classifyIPv4("127.0.0.1")).toBe("loopback"));
  it("127.255.255.255 → loopback", () => expect(classifyIPv4("127.255.255.255")).toBe("loopback"));
  it("10.0.0.1 → private", () => expect(classifyIPv4("10.0.0.1")).toBe("private"));
  it("172.16.0.1 → private", () => expect(classifyIPv4("172.16.0.1")).toBe("private"));
  it("172.31.255.255 → private", () => expect(classifyIPv4("172.31.255.255")).toBe("private"));
  it("172.15.255.255 → public (just outside)", () => expect(classifyIPv4("172.15.255.255")).toBe("public"));
  it("192.168.1.1 → private", () => expect(classifyIPv4("192.168.1.1")).toBe("private"));
  it("169.254.0.1 → link-local", () => expect(classifyIPv4("169.254.0.1")).toBe("link-local"));
  it("169.254.169.254 → link-local", () => expect(classifyIPv4("169.254.169.254")).toBe("link-local"));
  it("0.0.0.0 → reserved", () => expect(classifyIPv4("0.0.0.0")).toBe("reserved"));
  it("100.64.0.0 → reserved (CGNAT)", () => expect(classifyIPv4("100.64.0.0")).toBe("reserved"));
  it("100.127.255.255 → reserved (CGNAT upper)", () => expect(classifyIPv4("100.127.255.255")).toBe("reserved"));
  it("100.128.0.0 → public (outside CGNAT)", () => expect(classifyIPv4("100.128.0.0")).toBe("public"));
  it("192.0.2.1 → reserved (TEST-NET-1)", () => expect(classifyIPv4("192.0.2.1")).toBe("reserved"));
  it("240.0.0.1 → reserved (class E)", () => expect(classifyIPv4("240.0.0.1")).toBe("reserved"));
  it("1.1.1.1 → public", () => expect(classifyIPv4("1.1.1.1")).toBe("public"));
  it("8.8.8.8 → public", () => expect(classifyIPv4("8.8.8.8")).toBe("public"));
});

describe("classifyIPv6", () => {
  it("::1 → loopback", () => expect(classifyIPv6("::1")).toBe("loopback"));
  it(":: → reserved (unspecified)", () => expect(classifyIPv6("::")).toBe("reserved"));
  it("fc00::1 → private (ULA)", () => expect(classifyIPv6("fc00::1")).toBe("private"));
  it("fd00::1 → private (ULA)", () => expect(classifyIPv6("fd00::1")).toBe("private"));
  it("fe80::1 → link-local", () => expect(classifyIPv6("fe80::1")).toBe("link-local"));
  it("::ffff:7f00:1 → loopback (IPv4-mapped 127.0.0.1)", () => expect(classifyIPv6("::ffff:7f00:1")).toBe("loopback"));
  it("::ffff:a00:1 → private (IPv4-mapped 10.0.0.1)", () => expect(classifyIPv6("::ffff:a00:1")).toBe("private"));
  it("2001:db8::1 → public", () => expect(classifyIPv6("2001:db8::1")).toBe("public"));
});

describe("detectHostType", () => {
  it("detects IPv4", () => expect(detectHostType("127.0.0.1")).toBe("ipv4"));
  it("detects IPv6", () => expect(detectHostType("::1")).toBe("ipv6"));
  it("detects hostname", () => expect(detectHostType("example.com")).toBe("hostname"));
});

describe("extractRawHost", () => {
  it("extracts host from simple URL", () => expect(extractRawHost("http://example.com/")).toBe("example.com"));
  it("strips port", () => expect(extractRawHost("http://example.com:8080/")).toBe("example.com"));
  it("strips userinfo", () => expect(extractRawHost("http://user:pass@example.com/")).toBe("example.com"));
  it("handles IPv6 brackets", () => expect(extractRawHost("http://[::1]/")).toBe("[::1]"));
  it("returns raw decimal IP", () => expect(extractRawHost("http://2130706433/")).toBe("2130706433"));
});

describe("detectObfuscation", () => {
  it("no change → null", () => expect(detectObfuscation("127.0.0.1", "127.0.0.1")).toBeNull());
  it("IPv6 bracket removal → null (not obfuscation)", () => expect(detectObfuscation("[::1]", "::1")).toBeNull());
  it("decimal integer → decimal", () => expect(detectObfuscation("2130706433", "127.0.0.1")).toBe("decimal"));
  it("0x7f000001 → octal-hex", () => expect(detectObfuscation("0x7f000001", "127.0.0.1")).toBe("octal-hex"));
  it("0177.0.0.1 → octal-hex", () => expect(detectObfuscation("0177.0.0.1", "127.0.0.1")).toBe("octal-hex"));
  it("0x7f.0.0.1 → octal-hex", () => expect(detectObfuscation("0x7f.0.0.1", "127.0.0.1")).toBe("octal-hex"));
});

// ---------------------------------------------------------------------------
// Resolve:false guard — no DNS calls in offline mode
// ---------------------------------------------------------------------------
describe("resolve:false guard (offline guarantee)", () => {
  it("resolve defaults to false and no DNS is attempted for hostnames", async () => {
    // We point to a hostname that would fail DNS in isolation;
    // since resolve is false (default) this must be PASS with no findings.
    const r = await scanUrl({ url: "https://api.example.com/" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings.some((f) => f.ruleId === "NET-RESOLVES-TO-PRIVATE")).toBe(false);
  });

  it("explicit resolve:false also skips DNS", async () => {
    const r = await scanUrl({ url: "https://api.example.com/", policy: { resolve: false } });
    expect(r.findings.some((f) => f.ruleId === "NET-RESOLVES-TO-PRIVATE")).toBe(false);
  });

  it("IP addresses are never subject to DNS resolution", async () => {
    // Even with resolve:true, IP addresses skip DNS (no hostname to resolve)
    const r = await scanUrl({ url: "http://127.0.0.1/", policy: { resolve: true } });
    expect(r.findings.some((f) => f.ruleId === "NET-RESOLVES-TO-PRIVATE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Combined / end-to-end scenarios
// ---------------------------------------------------------------------------
describe("end-to-end SSRF scenarios", () => {
  it("obfuscated metadata endpoint (decimal loopback 127.0.0.1) is BLOCK", async () => {
    // 2130706433 = 127.0.0.1
    const r = await scanUrl({ url: "http://2130706433/latest/meta-data/" });
    expect(r.verdict).toBe("BLOCK");
  });

  it("ftp:// to metadata host is BLOCK (multiple high findings)", async () => {
    const r = await scanUrl({ url: "ftp://169.254.169.254/" });
    expect(r.verdict).toBe("BLOCK");
    expect(r.counts.critical).toBeGreaterThanOrEqual(1); // metadata
    expect(r.counts.high).toBeGreaterThanOrEqual(1); // scheme + link-local
  });

  it("credentials + private IP accumulates findings correctly", async () => {
    const r = await scanUrl({ url: "http://admin:secret@192.168.0.1/" });
    expect(r.verdict).toBe("BLOCK"); // private IP is high
    expect(r.findings.some((f) => f.ruleId === "NET-CREDENTIALS-IN-URL")).toBe(true);
    expect(r.findings.some((f) => f.ruleId === "NET-PRIVATE-IP")).toBe(true);
  });

  it("allowHosts does not suppress security rules (metadata still critical)", async () => {
    const r = await scanUrl({
      url: "http://169.254.169.254/",
      policy: { allowHosts: ["169.254.169.254"] },
    });
    // OFF-ALLOWLIST suppressed (host IS in list), but metadata/link-local still fire
    expect(r.findings.some((f) => f.ruleId === "NET-OFF-ALLOWLIST")).toBe(false);
    expect(r.findings.some((f) => f.ruleId === "NET-METADATA-ENDPOINT")).toBe(true);
    expect(r.verdict).toBe("BLOCK");
  });
});
