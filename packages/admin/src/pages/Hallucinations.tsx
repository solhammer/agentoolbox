import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHallucinations } from '../hooks/useAdminApi';

export function Hallucinations() {
  const { data, isLoading, error } = useHallucinations();

  const topPackages = [...(data?.topPackages ?? [])].sort(
    (a, b) => b.count - a.count,
  );
  const breakdown = data?.checkTypeBreakdown ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Hallucinations</h1>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error.message}
        </div>
      ) : null}

      <div className="rounded-lg border border-surface-border bg-surface-card">
        <div className="border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-medium text-gray-300">
            Top hallucinated packages
          </h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Block Count</th>
            </tr>
          </thead>
          <tbody>
            {topPackages.map((pkg, index) => (
              <tr
                key={`${pkg.name}-${pkg.language}`}
                className="border-t border-surface-border/60 text-gray-300"
              >
                <td className="px-4 py-2 text-gray-500">#{index + 1}</td>
                <td className="px-4 py-2 font-mono text-xs">{pkg.name}</td>
                <td className="px-4 py-2">{pkg.language}</td>
                <td className="px-4 py-2">{pkg.count.toLocaleString()}</td>
              </tr>
            ))}
            {!isLoading && topPackages.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No hallucinated packages recorded.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-300">
          Check type breakdown
        </h2>
        {breakdown.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No check data available.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="checkType" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,212,170,0.08)' }}
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #21262d',
                    borderRadius: 8,
                    color: '#e6edf3',
                  }}
                />
                <Bar dataKey="count" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
