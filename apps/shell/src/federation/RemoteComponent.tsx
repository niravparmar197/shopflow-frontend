import { Component, lazy, Suspense, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { ErrorState, Spinner } from '@shopflow/ui';
import { loadRemoteModule } from './remotes';

interface BoundaryProps {
  fallback: (retry: () => void) => ReactNode;
  onRetry: () => void;
  children: ReactNode;
}

/** Catches a remote that fails to load or crashes, so the rest of the page keeps working. */
class RemoteErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[shell] remote failed', error);
  }

  private retry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

type AnyComponent = ComponentType<Record<string, unknown>>;

/*
 * One lazy component per remote module (and per retry). Kept outside React so
 * moving between pages of the same remote does not load or suspend it again.
 * A retry gets a new key, because React caches a rejected lazy() forever.
 */
const lazyCache = new Map<string, LazyExoticComponent<AnyComponent>>();

function getLazyRemote(remote: string, module: string, attempt: number) {
  const key = `${remote}/${module}#${attempt}`;
  let found = lazyCache.get(key);
  if (!found) {
    found = lazy(async () => ({ default: (await loadRemoteModule<{ default: AnyComponent }>(remote, module)).default }));
    lazyCache.set(key, found);
  }
  return found;
}

interface RemoteComponentProps {
  remote: string;
  module: string;
  /** Human name for the fallback text, e.g. "The cart" */
  label: string;
  /** Small widgets (the cart badge) pass their own quiet fallback. */
  fallback?: ReactNode;
  loading?: ReactNode;
  props?: Record<string, unknown>;
}

/**
 * Renders a component exposed by a remote, with Suspense while it loads and an
 * error boundary if it can't load. "Try again" creates a fresh lazy component.
 */
export function RemoteComponent({ remote, module, label, fallback, loading, props }: RemoteComponentProps) {
  const [attempt, setAttempt] = useState(0);

  const Lazy = getLazyRemote(remote, module, attempt);

  return (
    <RemoteErrorBoundary
      key={attempt}
      onRetry={() => setAttempt((n) => n + 1)}
      fallback={(retry) =>
        fallback ?? (
          <ErrorState
            title={`${label} is not available right now`}
            text="The rest of the shop still works. Please try again in a moment."
            onRetry={retry}
          />
        )
      }
    >
      <Suspense
        fallback={
          loading ?? (
            <div className="grid min-h-60 place-items-center">
              <Spinner label={`Loading ${label.toLowerCase()}`} />
            </div>
          )
        }
      >
        {/* Not created during render: getLazyRemote returns a cached component. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Lazy {...props} />
      </Suspense>
    </RemoteErrorBoundary>
  );
}
