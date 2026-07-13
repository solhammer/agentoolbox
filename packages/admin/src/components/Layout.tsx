import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/api';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/', label: 'Overview' },
  { to: '/requests', label: 'Requests' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/hallucinations', label: 'Hallucinations' },
  { to: '/health', label: 'Health' },
];

export function Layout() {
  const navigate = useNavigate();
  const apiUrl = getApiUrl();

  const logout = (): void => {
    localStorage.removeItem('atb_admin_key');
    localStorage.removeItem('atb_api_url');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface text-gray-200">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-surface-border bg-surface-card">
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="font-mono text-sm font-semibold text-white">
            agent-toolbox.ai
          </span>
          <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
            admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-surface-border p-3">
          <div className="truncate text-[11px] text-gray-500" title={apiUrl}>
            {apiUrl}
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-md border border-surface-border px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
