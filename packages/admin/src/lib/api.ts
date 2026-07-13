// ── Shared types ──────────────────────────────────────────────────────────────

export type Verdict = 'PASS' | 'FLAG' | 'BLOCK';
export type HealthState = 'ok' | 'degraded' | 'down' | 'unknown';

export interface VerdictDistribution {
  PASS: number;
  FLAG: number;
  BLOCK: number;
}

export interface TimeSeriesPoint {
  /** ISO timestamp for the start of the hour bucket. */
  hour: string;
  calls: number;
}

export interface OverviewStats {
  totalCalls24h: number;
  activeKeys: number;
  /** Percentage 0–100. */
  errorRate: number;
  /** Percentage 0–100. */
  blockRate: number;
  verdictDistribution: VerdictDistribution;
  callsOverTime: TimeSeriesPoint[];
}

export interface RequestLogEntry {
  id: string;
  /** Epoch milliseconds. */
  timestamp: number;
  path: string;
  apiKey: string;
  ip: string;
  status: number;
  verdict: Verdict | null;
  latencyMs: number;
  creditCost: number;
  language?: string;
  hallucinatedPackages?: string[];
  checkTypes?: string[];
  hallucinationRate?: number;
}

export interface RequestsResponse {
  requests: RequestLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface LedgerAccount {
  apiKey: string;
  credits: number;
  totalCalls: number;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds. */
  lastSeen: number;
}

export interface LedgerResponse {
  accounts: LedgerAccount[];
  totalCredits: number;
  totalCalls: number;
}

export interface HallucinatedPackage {
  name: string;
  language: string;
  count: number;
}

export interface CheckTypeBreakdown {
  checkType: string;
  count: number;
}

export interface HallucinationsResponse {
  topPackages: HallucinatedPackage[];
  checkTypeBreakdown: CheckTypeBreakdown[];
}

export interface HealthStatus {
  service: string;
  status: HealthState;
  latencyMs: number;
  /** Epoch milliseconds. */
  lastChecked: number;
}

// ── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://api.agent-toolbox.ai';

export function getApiUrl(): string {
  return localStorage.getItem('atb_api_url') ?? DEFAULT_API_URL;
}

export function getAdminKey(): string {
  return localStorage.getItem('atb_admin_key') ?? '';
}

// ── Low-level fetch helper ────────────────────────────────────────────────────

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Admin-Key', getAdminKey());
  if (init.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `Request to ${path} failed (${res.status} ${res.statusText})${
        detail ? `: ${detail}` : ''
      }`,
    );
  }
  return (await res.json()) as T;
}

// ── Typed endpoint functions ──────────────────────────────────────────────────

export function fetchOverview(): Promise<OverviewStats> {
  return request<OverviewStats>('/admin/overview');
}

export function fetchRequests(params: {
  limit?: number;
  offset?: number;
  path?: string;
  verdict?: string;
}): Promise<RequestsResponse> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  if (params.path) query.set('path', params.path);
  if (params.verdict) query.set('verdict', params.verdict);
  const qs = query.toString();
  return request<RequestsResponse>(`/admin/requests${qs ? `?${qs}` : ''}`);
}

export function fetchLedger(): Promise<LedgerResponse> {
  return request<LedgerResponse>('/admin/ledger');
}

export function adjustCredit(
  key: string,
  delta: number,
  reason?: string,
): Promise<void> {
  return request<unknown>('/admin/ledger/adjust', {
    method: 'POST',
    body: JSON.stringify({ key, delta, ...(reason ? { reason } : {}) }),
  }).then(() => undefined);
}

export function fetchHallucinations(): Promise<HallucinationsResponse> {
  return request<HallucinationsResponse>('/admin/hallucinations');
}

export function fetchHealth(): Promise<HealthStatus[]> {
  return request<HealthStatus[]>('/admin/health');
}

// ── Server-Sent Events live stream ────────────────────────────────────────────

/**
 * Opens an EventSource against the admin live request stream. The admin key is
 * passed as a query parameter because EventSource cannot set custom headers.
 * Returns a cleanup function that closes the connection.
 */
export function createSSEStream(
  onEntry: (entry: RequestLogEntry) => void,
): () => void {
  const query = new URLSearchParams({ key: getAdminKey() });
  const source = new EventSource(
    `${getApiUrl()}/admin/stream?${query.toString()}`,
  );

  source.onmessage = (event: MessageEvent<string>) => {
    try {
      const entry = JSON.parse(event.data) as RequestLogEntry;
      onEntry(entry);
    } catch {
      // Ignore malformed events.
    }
  };

  return () => source.close();
}
