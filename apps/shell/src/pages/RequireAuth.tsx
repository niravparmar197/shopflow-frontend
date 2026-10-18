import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { routes, useSession } from '@shopflow/shared';
import { Spinner } from '@shopflow/ui';

/** Pages that need a login: wait for the session check, then send guests to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'unknown') {
    return (
      <div className="grid min-h-60 place-items-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to={routes.login(location.pathname + location.search)} replace />;
  }
  return <>{children}</>;
}
