import { format } from 'date-fns';
import { Badge } from '../components/Badge';
import { useHealth } from '../hooks/useAdminApi';
import type { HealthStatus } from '../lib/api';

// Maps the API's service IDs (as returned by /admin/health) to friendly labels.
// The IDs must match `checkAllServices()` in packages/api/src/admin/health.ts.
const EXPECTED_SERVICES: { id: string; label: string }[] = [
  { id: 'redis', label: 'Redis' },
  { id: 'solana-rpc', label: 'Solana RPC' },
  { id: 'vectara', label: 'Vectara API' },
  { id: 'pypi', label: 'PyPI' },
  { id: 'npm', label: 'npm' },
  { id: 'crates.io', label: 'crates.io' },
];

function mergeServices(data: HealthStatus[] | undefined): HealthStatus[] {
  const byId = new Map((data ?? []).map((s) => [s.service, s]));
  return EXPECTED_SERVICES.map(({ id, label }) => {
    const found = byId.get(id);
    return found
      ? { ...found, service: label }
      : {
          service: label,
          status: 'unknown' as const,
          latencyMs: 0,
          lastChecked: 0,
        };
  });
}

export function Health() {
  const { data, error, isFetching, refetch } = useHealth();
  const services = mergeServices(data);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Health</h1>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.service}
            className="rounded-lg border border-surface-border bg-surface-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{service.service}</span>
              <Badge value={service.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>Latency: {service.latencyMs} ms</span>
              <span>
                {service.lastChecked
                  ? `Checked ${format(new Date(service.lastChecked), 'HH:mm:ss')}`
                  : 'Never checked'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
