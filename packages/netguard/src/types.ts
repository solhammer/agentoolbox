/** Classification of an IP address's routing scope. */
export type IpClass =
  | "public"
  | "loopback"
  | "private"
  | "link-local"
  | "reserved"
  | "unknown";

export type Severity = "low" | "medium" | "high" | "critical";

export type Verdict = "PASS" | "FLAG" | "BLOCK";

export interface UrlScanPolicy {
  /**
   * URL schemes that are allowed. Defaults to ["http", "https"].
   * Any other scheme triggers NET-SCHEME-DENIED.
   */
  allowSchemes?: string[];

  /**
   * If set, the host (IP or hostname) must be in this list.
   * Hosts not on the list trigger NET-OFF-ALLOWLIST.
   */
  allowHosts?: string[];

  /**
   * If set, any host in this list triggers NET-DENYLISTED-HOST.
   */
  denyHosts?: string[];

  /**
   * Block requests to RFC-1918 private IP ranges. Defaults to true.
   * Set to false to allow intranet targets.
   */
  denyPrivate?: boolean;

  /**
   * If set, only these port numbers are allowed for explicit non-default ports.
   * Any other explicit port triggers NET-NONSTANDARD-PORT.
   */
  allowedPorts?: number[];

  /**
   * When true, resolve hostname via DNS and flag if any address maps to a
   * private / loopback / link-local / metadata range (DNS rebinding).
   * Defaults to false — when false the tool is fully offline.
   */
  resolve?: boolean;

  /**
   * Severity at or above which the verdict becomes BLOCK.
   * Defaults to "high". Findings below this threshold produce FLAG.
   */
  blockSeverityAtOrAbove?: Severity;
}

export interface UrlScanInput {
  url: string;
  policy?: UrlScanPolicy;
}

/** Parsed and normalized representation of the scanned URL. */
export interface UrlTarget {
  scheme: string;
  host: string;
  hostType: "ipv4" | "ipv6" | "hostname";
  ipClass: IpClass;
  /** Explicit non-default port number, or null when using the scheme default. */
  port: number | null;
  normalizedUrl: string;
}

export interface UrlFinding {
  ruleId: string;
  severity: Severity;
  message: string;
}

export interface UrlScanResult {
  verdict: Verdict;
  target: UrlTarget;
  findings: UrlFinding[];
  counts: Record<Severity, number>;
  certificate: string;
  latencyMs: number;
}
