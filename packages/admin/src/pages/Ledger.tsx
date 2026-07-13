import { useState } from 'react';
import { format } from 'date-fns';
import { StatCard } from '../components/StatCard';
import { useAdjustCredit, useLedger } from '../hooks/useAdminApi';
import type { LedgerAccount } from '../lib/api';

function truncate(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function AdjustControl({ account }: { account: LedgerAccount }) {
  const [delta, setDelta] = useState('');
  const adjust = useAdjustCredit();

  const apply = (): void => {
    const parsed = Number(delta);
    if (!Number.isFinite(parsed) || parsed === 0) return;
    adjust.mutate(
      { key: account.apiKey, delta: parsed },
      { onSuccess: () => setDelta('') },
    );
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        placeholder="±credits"
        className="w-24 rounded-md border border-surface-border bg-surface px-2 py-1 text-sm text-gray-100 outline-none focus:border-brand"
      />
      <button
        type="button"
        onClick={apply}
        disabled={adjust.isPending}
        className="rounded-md border border-brand/40 px-3 py-1 text-sm text-brand transition-colors hover:bg-brand/10 disabled:opacity-40"
      >
        Apply
      </button>
    </div>
  );
}

export function Ledger() {
  const { data, isLoading, error } = useLedger();
  const accounts = data?.accounts ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Ledger</h1>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total accounts"
          value={isLoading ? '—' : accounts.length.toLocaleString()}
          color="blue"
        />
        <StatCard
          label="Credits outstanding"
          value={
            isLoading ? '—' : (data?.totalCredits ?? 0).toLocaleString()
          }
          color="green"
        />
        <StatCard
          label="Total calls"
          value={isLoading ? '—' : (data?.totalCalls ?? 0).toLocaleString()}
          color="default"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">API Key</th>
              <th className="px-4 py-3 font-medium">Credits</th>
              <th className="px-4 py-3 font-medium">Total Calls</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Last Seen</th>
              <th className="px-4 py-3 font-medium">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.apiKey}
                className="border-t border-surface-border/60 text-gray-300"
              >
                <td
                  className="px-4 py-2 font-mono text-xs"
                  title={account.apiKey}
                >
                  {truncate(account.apiKey)}
                </td>
                <td className="px-4 py-2">{account.credits.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {account.totalCalls.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {format(new Date(account.createdAt), 'yyyy-MM-dd')}
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {format(new Date(account.lastSeen), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="px-4 py-2">
                  <AdjustControl account={account} />
                </td>
              </tr>
            ))}
            {!isLoading && accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No ledger accounts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
