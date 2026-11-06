import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';
import { startSync } from './data/sync';

const isAdmin = location.pathname.startsWith('/admin');
if (!isAdmin) startSync();
const AdminApp = lazy(() => import('./features/admin/AdminApp').then((m) => ({ default: m.AdminApp })));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
