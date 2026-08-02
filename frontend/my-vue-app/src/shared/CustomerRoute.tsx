import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';

export default function CustomerRoute({ children }: { children: ReactNode }) {
  const { user, status, error, refreshCurrentUser } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="auth-route-state" aria-live="polite">
        <div
          className="spinner-border"
          role="status"
          aria-label="Checking session"
        />
        <p>Loading your account…</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="auth-route-state">
        <h1>Unable to load your account</h1>
        <p>{error}</p>
        <button
          className="btn btn-dark"
          type="button"
          onClick={() => void refreshCurrentUser()}
        >
          Try again
        </button>
      </main>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (user.role !== 'user') {
    return <Navigate to={user.redirectTo || '/'} replace />;
  }

  return children;
}
