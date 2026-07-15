import { Fragment, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '../components/Badge';
import { useRequests } from '../hooks/useAdminApi';
import type { RequestLogEntry } from '../lib/api';

const PAGE_SIZE = 50;

const PATH_OPTIONS = [
  { value: '', label: 'All endpoints' },
  { value: '/v1/verify', label: '/v1/verify' },
  { value: '/v1/validate/imports', label: '/v1/validate/imports' },
  { value: '/v1/distill', label: '/v1/distill' },
  { value: '/v1/tokens/count', label: '/v1/tokens/count' },
  { value: '/v1/scan/pii', label: '/v1/scan/pii' },
  { value: '/v1/scan/secrets', label: '/v1/scan/secrets' },
  { value: '/v1/scan/injection', label: '/v1/scan/injection' },
  { value: '/v1/scan/vulnerabilities', label: '/v1/scan/vulnerabilities' },
  { value: '/v1/finance/units', label: '/v1/finance/units' },
  { value: '/v1/finance/price', label: '/v1/finance/price' },
  { value: '/v1/finance/symbol', label: '/v1/finance/symbol' },
  { value: '/v1/finance/token/risk', label: '/v1/finance/token/risk' },
  { value: '/v1/finance/slippage', label: '/v1/finance/slippage' },
  { value: '/v1/finance/order/risk', label: '/v1/finance/order/risk' },
  { value: '/v1/finance/position/check', label: '/v1/finance/position/check' },
];

const VERDICT_OPTIONS = [
  { value: '', label: 'All verdicts' },
  { value: 'PASS', label: 'PASS' },
  { value: 'FLAG', label: 'FLAG' },
  { value: 'BLOCK', label: 'BLOCK' },
];

function truncate(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function ExpandedRow({ entry }: { entry: RequestLogEntry }) {
  return (
    <tr className="bg-surface/60">
      <td colSpan={8} className="px-6 py-4">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs md:grid-cols-3">
          <div>
            <dt className="text-gray-500">Request ID</dt>
            <dd className="font-mono text-gray-300">{entry.id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Language</dt>
            <dd className="text-gray-300">{entry.language ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Hallucination rate</dt>
            <dd className="text-gray-300">
              {entry.hallucinationRate !== undefined
                ? `${(entry.hallucinationRate * 100).toFixed(1)}%`
                : '—'}
            </dd>
          </div>
          <div className="col-span-2 md:col-span-3">
            <dt className="text-gray-500">Hallucinated packages</dt>
            <dd className="font-mono text-gray-300">
              {entry.hallucinatedPackages && entry.hallucinatedPackages.length > 0
                ? entry.hallucinatedPackages.join(', ')
                : '—'}
            </dd>
          </div>
          <div className="col-span-2 md:col-span-3">
            <dt className="text-gray-500">Check types</dt>
            <dd className="text-gray-300">
              {entry.checkTypes && entry.checkTypes.length > 0
                ? entry.checkTypes.join(', ')
                : '—'}
            </dd>
          </div>
        </dl>
      </td>
    </tr>
  );
}

export function Requests() {
  const [page, setPage] = useState(0);
  const [path, setPath] = useState('');
  const [verdict, setVerdict] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useRequests({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(path ? { path } : {}),
    ...(verdict ? { verdict } : {}),
  });

  const rows = (data?.requests ?? []).filter((entry) =>
    search
      ? `${entry.path} ${entry.apiKey} ${entry.ip}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );
  const total = data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const selectClass =
    'rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand';

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Requests</h1>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={path}
          onChange={(e) => {
            setPath(e.target.value);
            setPage(0);
          }}
          className={selectClass}
        >
          {PATH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={verdict}
          onChange={(e) => {
            setVerdict(e.target.value);
            setPage(0);
          }}
          className={selectClass}
        >
          {VERDICT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search path, key, or IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${selectClass} flex-1 min-w-[200px]`}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Path</th>
              <th className="px-4 py-3 font-medium">API Key</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Verdict</th>
              <th className="px-4 py-3 font-medium">Latency</th>
              <th className="px-4 py-3 font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <Fragment key={entry.id}>
                <tr
                  onClick={() =>
                    setExpanded((cur) => (cur === entry.id ? null : entry.id))
                  }
                  className="cursor-pointer border-t border-surface-border/60 text-gray-300 hover:bg-white/5"
                >
                  <td className="px-4 py-2 text-gray-400">
                    {format(new Date(entry.timestamp), 'MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.path}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {truncate(entry.apiKey)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.ip}</td>
                  <td className="px-4 py-2">{entry.status}</td>
                  <td className="px-4 py-2">
                    <Badge value={entry.verdict} />
                  </td>
                  <td className="px-4 py-2">{entry.latencyMs} ms</td>
                  <td className="px-4 py-2">{entry.creditCost}</td>
                </tr>
                {expanded === entry.id ? <ExpandedRow entry={entry} /> : null}
              </Fragment>
            ))}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No requests found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          {total > 0
            ? `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                (page + 1) * PAGE_SIZE,
                total,
              )} of ${total}`
            : '—'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-surface-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-surface-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
