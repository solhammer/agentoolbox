import { performance } from "node:perf_hooks";
import { generateCertificate } from "./certificate.js";
import { checkUrl } from "./rules.js";
import {
  extractRawHost,
  detectObfuscation,
  detectHostType,
  classifyHost,
} from "./iputils.js";
import type {
  UrlScanInput,
  UrlScanResult,
  UrlFinding,
  UrlTarget,
  Severity,
  Verdict,
} from "./types.js";

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Deterministic, offline URL / egress / SSRF gate.
 *
 * Parses `input.url` with the WHATWG URL API, normalises IP obfuscations
 * (decimal, octal, hex), classifies the host against bundled reserved-range
 * tables, and runs the rule engine.  Returns a signed verdict with per-finding
 * details and severity counts.
 *
 * No network calls are made unless `policy.resolve === true`, in which case
 * a single DNS lookup is performed to detect DNS-rebinding attacks.
 * All other operations are fully offline and deterministic.
 */
export async function scanUrl(input: UrlScanInput): Promise<UrlScanResult> {
  const t0 = performance.now();

  const policy = input.policy ?? {};
  const findings: UrlFinding[] = [];

  let target: UrlTarget;

  try {
    const parsed = new URL(input.url);

    const scheme = parsed.protocol.slice(0, -1); // strip trailing ":"
    // WHATWG URL includes brackets for IPv6: new URL("http://[::1]/").hostname === "[::1]"
    // We strip them to get the bare address for classification and target.host.
    const rawHostname = parsed.hostname;
    const hostname =
      rawHostname.startsWith("[") && rawHostname.endsWith("]")
        ? rawHostname.slice(1, -1)
        : rawHostname;
    const rawHost = extractRawHost(input.url);
    const hostType = detectHostType(hostname);
    const ipClass = classifyHost(hostname, hostType);

    // port is "" when the scheme default is used or no port is specified
    const portStr = parsed.port;
    const port = portStr !== "" ? parseInt(portStr, 10) : null;

    const normalizedUrl = parsed.href;

    const obfuscation = detectObfuscation(rawHost, hostname);
    const hasUserinfo = parsed.username !== "" || parsed.password !== "";

    target = {
      scheme,
      host: hostname,
      hostType,
      ipClass,
      port,
      normalizedUrl,
    };

    // ── Rule engine ───────────────────────────────────────────────────────
    const ruleFindings = checkUrl(target, rawHost, hasUserinfo, obfuscation, policy);
    for (const f of ruleFindings) findings.push(f);

    // ── NET-RESOLVES-TO-PRIVATE ───────────────────────────────────────────
    // Strictly gated: DNS resolution ONLY occurs when policy.resolve === true.
    if (policy.resolve === true && hostType === "hostname" && hostname) {
      try {
        const dns = await import("node:dns/promises");
        const records = await dns.lookup(hostname, { all: true });
        for (const record of records) {
          const recType = detectHostType(record.address);
          const recClass = classifyHost(record.address, recType);
          const isMetadata = record.address === "169.254.169.254";
          if (
            recClass === "loopback" ||
            recClass === "private" ||
            recClass === "link-local" ||
            isMetadata
          ) {
            findings.push({
              ruleId: "NET-RESOLVES-TO-PRIVATE",
              severity: "high",
              message: `Hostname "${hostname}" resolves to ${record.address} (${recClass}) — potential DNS rebinding`,
            });
            break; // one finding per hostname is enough
          }
        }
      } catch {
        // DNS failure (network offline, NXDOMAIN, etc.) — do not add a finding
      }
    }
  } catch {
    // ── URL parsing failed ────────────────────────────────────────────────
    // Build a best-effort target from the raw string so callers always get
    // a valid UrlTarget even when the input is malformed.
    const rawScheme = extractSchemeBestEffort(input.url);
    const rawHostBestEffort = extractRawHost(input.url);

    target = {
      scheme: rawScheme,
      host: rawHostBestEffort,
      hostType: "hostname",
      ipClass: "unknown",
      port: null,
      normalizedUrl: input.url,
    };

    findings.push({
      ruleId: "NET-MALFORMED-URL",
      severity: "high",
      message: `URL "${input.url.slice(0, 120)}" could not be parsed`,
    });
  }

  // ── Severity counts ───────────────────────────────────────────────────────
  const counts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) counts[f.severity]++;

  // ── Verdict ───────────────────────────────────────────────────────────────
  const blockSeverityAtOrAbove = policy.blockSeverityAtOrAbove ?? "high";
  const blockLevel = SEVERITY_ORDER[blockSeverityAtOrAbove];
  let verdict: Verdict = "PASS";
  for (const f of findings) {
    if (SEVERITY_ORDER[f.severity] >= blockLevel) {
      verdict = "BLOCK";
      break;
    }
    verdict = "FLAG";
  }

  // ── Certificate ───────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const certificate = generateCertificate(input.url, verdict, findings.length, timestamp);

  const latencyMs = performance.now() - t0;

  return {
    verdict,
    target,
    findings,
    counts,
    certificate,
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Helpers for best-effort parsing of malformed URLs
// ---------------------------------------------------------------------------

function extractSchemeBestEffort(rawUrl: string): string {
  const idx = rawUrl.indexOf("://");
  return idx >= 0 ? rawUrl.slice(0, idx) : "unknown";
}
