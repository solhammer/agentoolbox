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

// ── Raw API response shapes ───────────────────────────────────────────────────
// The API returns slightly different shapes than the dashboard renders. These
// interfaces describe the raw responses; the fetch helpers below normalize them
// into the UI-facing types declared above so pages/hooks stay decoupled from the
// backend wire format.

interface RawRequestLogEntry {
  id: string;
  timestamp: number;
  path: string;
  method: string;
  apiKey: string | null;
  ip: string;
  statusCode: number;
  latencyMs: number;
  creditCost: number;
  verdict?: Verdict;
  language?: string;
  hallucinationRate?: number;
  checkTypes?: string[];
  hallucinatedPackages?: string[];
}

interface RawOverviewResponse {
  period: string;
  totalCalls: number;
  activeKeys: number;
  /** Fraction in the range 0–1. */
  errorRate: number;
  verdictDistribution: VerdictDistribution;
  callsByEndpoint: Record<string, number>;
  callsOverTime: Array<{ hour: string; count: number }>;
  topHallucinatedPackages: HallucinatedPackage[];
  ledgerKeys: number;
  ledgerTotalCalls: number;
}

interface RawRequestsResponse {
  entries: RawRequestLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface RawLedgerAccount {
  key: string;
  credits: number;
  totalCalls: number;
  createdAt: number;
  lastSeen: number;
}

interface RawLedgerResponse {
  accounts: RawLedgerAccount[];
  total: number;
  aggregate: { keys: number; totalCalls: number };
}

interface RawHallucinationsResponse {
  topPackages: HallucinatedPackage[];
  checkTypeBreakdown: Record<string, number>;
}

interface RawHealthStatus {
  service: string;
  status: HealthState;
  /** May be null when a probe fails before timing. */
  latencyMs: number | null;
  /** ISO timestamp. */
  lastChecked: string;
  detail?: string;
}

/** Placeholder shown for anonymous (unauthenticated) requests. */
const ANONYMOUS_KEY = 'anonymous';

/** Normalizes a raw request log entry into the dashboard's UI shape. */
function normalizeEntry(raw: RawRequestLogEntry): RequestLogEntry {
  return {
    id: raw.id,
    timestamp: raw.timestamp,
    path: raw.path,
    apiKey: raw.apiKey ?? ANONYMOUS_KEY,
    ip: raw.ip,
    status: raw.statusCode,
    verdict: raw.verdict ?? null,
    latencyMs: raw.latencyMs,
    creditCost: raw.creditCost,
    language: raw.language,
    hallucinatedPackages: raw.hallucinatedPackages,
    checkTypes: raw.checkTypes,
    hallucinationRate: raw.hallucinationRate,
  };
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

export async function fetchOverview(): Promise<OverviewStats> {
  const raw = await request<RawOverviewResponse>('/admin/overview');
  const verdicts = raw.verdictDistribution;
  const totalVerdicts = verdicts.PASS + verdicts.FLAG + verdicts.BLOCK;
  return {
    totalCalls24h: raw.totalCalls,
    activeKeys: raw.activeKeys,
    // API reports errorRate as a 0–1 fraction; the UI renders a percentage.
    errorRate: raw.errorRate * 100,
    // Not provided by the API: share of verdict-bearing calls that were BLOCK.
    blockRate: totalVerdicts > 0 ? (verdicts.BLOCK / totalVerdicts) * 100 : 0,
    verdictDistribution: verdicts,
    callsOverTime: raw.callsOverTime.map((p) => ({
      hour: p.hour,
      calls: p.count,
    })),
  };
}

export async function fetchRequests(params: {
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
  const raw = await request<RawRequestsResponse>(
    `/admin/requests${qs ? `?${qs}` : ''}`,
  );
  return {
    requests: raw.entries.map(normalizeEntry),
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset,
  };
}

export async function fetchLedger(): Promise<LedgerResponse> {
  const raw = await request<RawLedgerResponse>('/admin/ledger');
  const accounts: LedgerAccount[] = raw.accounts.map((a) => ({
    apiKey: a.key,
    credits: a.credits,
    totalCalls: a.totalCalls,
    createdAt: a.createdAt,
    lastSeen: a.lastSeen,
  }));
  return {
    accounts,
    // Not provided by the API: sum of outstanding credits across accounts.
    totalCredits: accounts.reduce((sum, a) => sum + a.credits, 0),
    totalCalls: raw.aggregate.totalCalls,
  };
}

export function adjustCredit(
  key: string,
  delta: number,
  reason?: string,
): Promise<void> {
  return request<unknown>(
    `/admin/ledger/${encodeURIComponent(key)}/credit`,
    {
      method: 'POST',
      body: JSON.stringify({ delta, ...(reason ? { reason } : {}) }),
    },
  ).then(() => undefined);
}

export async function fetchHallucinations(): Promise<HallucinationsResponse> {
  const raw = await request<RawHallucinationsResponse>('/admin/hallucinations');
  const checkTypeBreakdown: CheckTypeBreakdown[] = Object.entries(
    raw.checkTypeBreakdown,
  )
    .map(([checkType, count]) => ({ checkType, count }))
    .sort((a, b) => b.count - a.count);
  return { topPackages: raw.topPackages, checkTypeBreakdown };
}

export async function fetchHealth(): Promise<HealthStatus[]> {
  const raw = await request<RawHealthStatus[]>('/admin/health');
  return raw.map((s) => ({
    service: s.service,
    status: s.status,
    latencyMs: s.latencyMs ?? 0,
    lastChecked: s.lastChecked ? Date.parse(s.lastChecked) : 0,
  }));
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
      const raw = JSON.parse(event.data) as RawRequestLogEntry;
      onEntry(normalizeEntry(raw));
    } catch {
      // Ignore malformed events.
    }
  };

  return () => source.close();
}
