import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { useOverview } from '../hooks/useAdminApi';
import { useLiveFeed } from '../hooks/useLiveFeed';

const VERDICT_COLORS: Record<string, string> = {
  PASS: '#00d4aa',
  FLAG: '#eab308',
  BLOCK: '#ef4444',
};

function truncate(value: string, max = 12): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function Overview() {
  const { data, isLoading, error } = useOverview();
  const { entries, connected } = useLiveFeed(200);

  const pieData = data
    ? (Object.entries(data.verdictDistribution) as [string, number][]).map(
        ([name, value]) => ({ name, value }),
      )
    : [];

  const areaData = (data?.callsOverTime ?? []).map((point) => ({
    hour: format(new Date(point.hour), 'HH:mm'),
    calls: point.calls,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Overview</h1>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls (24h)"
          value={isLoading ? '—' : (data?.totalCalls24h ?? 0).toLocaleString()}
          color="blue"
        />
        <StatCard
          label="Active Keys"
          value={isLoading ? '—' : (data?.activeKeys ?? 0).toLocaleString()}
          color="green"
        />
        <StatCard
          label="Error Rate"
          value={isLoading ? '—' : `${(data?.errorRate ?? 0).toFixed(1)}%`}
          color="yellow"
        />
        <StatCard
          label="BLOCK Rate"
          value={isLoading ? '—' : `${(data?.blockRate ?? 0).toFixed(1)}%`}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-300">
            Verdict distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {pieData.map((slice) => (
                    <Cell
                      key={slice.name}
                      fill={VERDICT_COLORS[slice.name] ?? '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #21262d',
                    borderRadius: 8,
                    color: '#e6edf3',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-300">
            Calls over time (24h)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #21262d',
                    borderRadius: 8,
                    color: '#e6edf3',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#00d4aa"
                  fill="url(#callsFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-medium text-gray-300">Live feed</h2>
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-brand animate-pulse' : 'bg-gray-600'
              }`}
            />
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-card text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">Verdict</th>
                <th className="px-4 py-2 font-medium">Latency</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 100).map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-surface-border/60 text-gray-300"
                >
                  <td className="px-4 py-2 text-gray-400">
                    {format(new Date(entry.timestamp), 'HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.path}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {truncate(entry.apiKey)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.ip}</td>
                  <td className="px-4 py-2">
                    <Badge value={entry.verdict} />
                  </td>
                  <td className="px-4 py-2">{entry.latencyMs} ms</td>
                  <td className="px-4 py-2">{entry.status}</td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Waiting for live requests…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
