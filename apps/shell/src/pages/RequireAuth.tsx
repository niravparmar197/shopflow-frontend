import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import type { Role } from '@shopflow/api';
import { routes, useSession } from '@shopflow/shared';
import { Button, Container, EmptyState, Spinner } from '@shopflow/ui';

/**
 * Pages that need a login: wait for the session check, then send guests to
 * /login. With `role`, a logged-in user without it sees "No access" (the
 * services check the role again on every call; this only hides the page).
 */
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { status, user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

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
  if (role && user?.role !== role) {
    return (
      <Container>
        <EmptyState
          icon={<ShieldAlert className="size-7" aria-hidden />}
          title="No access"
          text="This page is for shop admins only."
          action={<Button onClick={() => navigate(routes.home)}>Go to shop</Button>}
        />
      </Container>
    );
  }
  return <>{children}</>;
}
