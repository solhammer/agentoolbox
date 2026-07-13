import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { Layout } from './components/Layout';
import { Hallucinations } from './pages/Hallucinations';
import { Health } from './pages/Health';
import { Ledger } from './pages/Ledger';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Requests } from './pages/Requests';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function RequireAuth() {
  const authed = Boolean(localStorage.getItem('atb_admin_key'));
  if (!authed) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/hallucinations" element={<Hallucinations />} />
              <Route path="/health" element={<Health />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
