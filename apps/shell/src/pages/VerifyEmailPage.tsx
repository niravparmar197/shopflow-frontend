import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, MailWarning } from 'lucide-react';
import { describeError, isApiError, resendVerification, verifyEmail, type User } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Button, Spinner } from '@shopflow/ui';
import { AuthCard } from './AuthCard';
import { useLinkToken } from './useLinkToken';

/*
 * One request per token, even when React runs the effect twice (StrictMode)
 * or the page re-mounts: the second POST would only say "already used".
 */
const calls = new Map<string, Promise<User>>();
function verifyOnce(token: string) {
  let call = calls.get(token);
  if (!call) {
    call = verifyEmail(token);
    calls.set(token, call);
  }
  return call;
}

type State = { kind: 'working' } | { kind: 'done' } | { kind: 'failed'; message: string };

export function VerifyEmailPage() {
  const token = useLinkToken();
  const { status, user } = useSession();
  const [state, setState] = useState<State>(() =>
    token ? { kind: 'working' } : { kind: 'failed', message: 'This link is not complete. Please open the link from the email again.' },
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let live = true;
    verifyOnce(token).then(
      () => live && setState({ kind: 'done' }),
      (err: unknown) => live && setState({ kind: 'failed', message: describeError(err).message }),
    );
    return () => {
      live = false;
    };
  }, [token]);

  const sendAgain = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast({ kind: 'success', message: `We sent a new link to ${user?.email ?? 'your email'}` });
    } catch (err) {
      toast({ kind: 'error', message: isApiError(err) ? err.message : describeError(err).message });
    } finally {
      setSending(false);
    }
  };

  if (state.kind === 'working') {
    return (
      <AuthCard title="Confirming your email" subtitle="This takes a second">
        <div className="flex justify-center py-4">
          <Spinner label="Confirming your email" />
        </div>
      </AuthCard>
    );
  }

  if (state.kind === 'done') {
    return (
      <AuthCard
        title="Email confirmed"
        subtitle="Thank you! Your account is all set"
        footer={
          status === 'authenticated' ? (
            <Link to={routes.account} className="font-semibold text-primary hover:underline">
              Go to my account
            </Link>
          ) : (
            <Link to={routes.login()} className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          )
        }
      >
        <div className="flex flex-col items-center gap-5">
          <span role="status" className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <CircleCheck className="size-7" aria-hidden />
            <span className="sr-only">Your email is confirmed</span>
          </span>
          <Link
            to={routes.products}
            className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Start shopping
          </Link>
        </div>
      </AuthCard>
    );
  }

  // Failed: a logged-in, unverified user can get a new link right here.
  const canResend = status === 'authenticated' && user && !user.emailVerifiedAt;
  return (
    <AuthCard
      title="We couldn't confirm your email"
      subtitle={state.message}
      footer={
        status === 'authenticated' ? (
          <Link to={routes.account} className="font-semibold text-primary hover:underline">
            Go to my account
          </Link>
        ) : (
          <>
            <Link to={routes.login(routes.account)} className="font-semibold text-primary hover:underline">
              Log in
            </Link>{' '}
            to get a new link.
          </>
        )
      }
    >
      <div className="flex flex-col items-center gap-5">
        <span className="grid size-14 place-items-center rounded-full bg-warning-soft text-warning">
          <MailWarning className="size-7" aria-hidden />
        </span>
        {canResend && (
          <Button onClick={() => void sendAgain()} loading={sending}>
            Send a new link
          </Button>
        )}
        {status === 'authenticated' && user?.emailVerifiedAt && (
          <p className="text-sm text-success">Good news: your email is already confirmed.</p>
        )}
      </div>
    </AuthCard>
  );
}
