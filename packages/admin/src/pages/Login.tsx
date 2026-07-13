import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHealth } from '../lib/api';

const DEFAULT_API_URL = 'https://api.agent-toolbox.ai';

export function Login() {
  const navigate = useNavigate();
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('atb_api_url') ?? DEFAULT_API_URL,
  );
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    localStorage.setItem('atb_api_url', apiUrl.trim().replace(/\/$/, ''));
    localStorage.setItem('atb_admin_key', adminKey);

    try {
      await fetchHealth();
      navigate('/', { replace: true });
    } catch (err) {
      localStorage.removeItem('atb_admin_key');
      setError(
        err instanceof Error
          ? `Login failed: ${err.message}`
          : 'Login failed. Check the API URL and admin key.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-surface-border bg-surface-card p-6"
      >
        <div className="text-center">
          <div className="font-mono text-lg font-semibold text-white">
            agent-toolbox.ai
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-brand">
            Admin Console
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-gray-400">API URL</span>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            required
            className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-gray-100 outline-none focus:border-brand"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-gray-400">Admin Key</span>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-gray-100 outline-none focus:border-brand"
          />
        </label>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-surface transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
