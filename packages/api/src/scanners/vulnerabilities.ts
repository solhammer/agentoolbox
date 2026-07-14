/**
 * Dependency vulnerability scanner backed by the OSV (Open Source
 * Vulnerabilities) free API.
 *
 * Two-phase lookup:
 *   1. POST https://api.osv.dev/v1/querybatch — batch-queries every package and
 *      returns the vulnerability IDs affecting each one (IDs only).
 *   2. GET  https://api.osv.dev/v1/vulns/{id}  — best-effort enrichment for each
 *      returned ID to obtain summary, severity, and aliases.
 */

const OSV_QUERYBATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_VULN_URL = "https://api.osv.dev/v1/vulns";
const DEFAULT_TIMEOUT_MS = 8000;

export interface VulnFinding {
  package: string;
  vulnerabilities: Array<{
    id: string; // e.g. GHSA-xxx or CVE-xxx
    summary: string;
    severity: string;
    aliases: string[];
  }>;
}

export interface VulnScanResult {
  findings: VulnFinding[];
  totalPackages: number;
  vulnerablePackages: number;
  safe: boolean;
  latencyMs: number;
}

/** Maps request language → OSV ecosystem identifier. */
const ECOSYSTEM_MAP: Record<string, string> = {
  python: "PyPI",
  javascript: "npm",
  typescript: "npm",
  rust: "crates.io",
  go: "Go",
};

// ── OSV response shapes (partial) ─────────────────────────────────────────────

interface OsvQueryBatchResponse {
  results?: Array<{ vulns?: Array<{ id: string }> }>;
}

interface OsvSeverityEntry {
  type?: string;
  score?: string;
}

interface OsvVulnDetail {
  id?: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: OsvSeverityEntry[];
  database_specific?: { severity?: string };
}

/** Derive a human-readable severity string from an OSV vuln detail. */
function deriveSeverity(detail: OsvVulnDetail): string {
  const dbSeverity = detail.database_specific?.severity;
  if (typeof dbSeverity === "string" && dbSeverity.length > 0) {
    return dbSeverity.toUpperCase();
  }
  const score = detail.severity?.[0]?.score;
  if (typeof score === "string" && score.length > 0) {
    return score;
  }
  return "UNKNOWN";
}

/** Fetch enrichment details for a single vulnerability ID (best-effort). */
async function fetchVulnDetail(
  id: string,
  signal: AbortSignal
): Promise<VulnFinding["vulnerabilities"][number]> {
  try {
    const res = await fetch(`${OSV_VULN_URL}/${encodeURIComponent(id)}`, {
      signal,
    });
    if (!res.ok) {
      return { id, summary: "", severity: "UNKNOWN", aliases: [] };
    }
    const detail = (await res.json()) as OsvVulnDetail;
    return {
      id,
      summary: detail.summary ?? detail.details ?? "",
      severity: deriveSeverity(detail),
      aliases: detail.aliases ?? [],
    };
  } catch {
    return { id, summary: "", severity: "UNKNOWN", aliases: [] };
  }
}

/**
 * Scan a list of package names for known vulnerabilities via OSV.
 *
 * @throws if the OSV querybatch request fails, since safety cannot be
 *   determined without it.
 */
export async function scanVulnerabilities(
  packages: string[],
  language: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<VulnScanResult> {
  const start = Date.now();

  const ecosystem = ECOSYSTEM_MAP[language];
  if (!ecosystem) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const batchRes = await fetch(OSV_QUERYBATCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: packages.map((name) => ({ package: { name, ecosystem } })),
      }),
      signal: controller.signal,
    });

    if (!batchRes.ok) {
      throw new Error(`OSV querybatch failed with status ${batchRes.status}`);
    }

    const batch = (await batchRes.json()) as OsvQueryBatchResponse;
    const results = batch.results ?? [];

    // Collect unique vuln IDs per package.
    const perPackageIds = packages.map((_, i) => {
      const vulns = results[i]?.vulns ?? [];
      return [...new Set(vulns.map((v) => v.id))];
    });

    // Best-effort enrichment for every unique ID across all packages.
    const allIds = [...new Set(perPackageIds.flat())];
    const detailEntries = await Promise.all(
      allIds.map(async (id) => [id, await fetchVulnDetail(id, controller.signal)] as const)
    );
    const detailMap = new Map(detailEntries);

    const findings: VulnFinding[] = [];
    for (let i = 0; i < packages.length; i++) {
      const ids = perPackageIds[i]!;
      if (ids.length === 0) continue;
      findings.push({
        package: packages[i]!,
        vulnerabilities: ids.map(
          (id) =>
            detailMap.get(id) ?? {
              id,
              summary: "",
              severity: "UNKNOWN",
              aliases: [],
            }
        ),
      });
    }

    return {
      findings,
      totalPackages: packages.length,
      vulnerablePackages: findings.length,
      safe: findings.length === 0,
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}
