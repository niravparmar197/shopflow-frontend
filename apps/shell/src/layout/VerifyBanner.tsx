import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { MailWarning, X } from 'lucide-react';
import { describeError, isApiError, resendVerification } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Container } from '@shopflow/ui';

/**
 * "Please confirm your email" under the header, for a logged-in user whose
 * email is not confirmed yet. Soft: shopping still works. Hidden for this
 * page view when closed, and on the pages that already deal with it.
 */
export function VerifyBanner() {
  const { status, user } = useSession();
  const { pathname } = useLocation();
  const [closed, setClosed] = useState(false);
  const [sending, setSending] = useState(false);

  if (status !== 'authenticated' || !user || user.emailVerifiedAt || closed) return null;
  if (pathname === routes.verifyEmail || pathname === routes.account) return null;

  const sendAgain = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast({ kind: 'success', message: `We sent a new link to ${user.email}` });
    } catch (err) {
      toast({ kind: isApiError(err) && err.status === 429 ? 'info' : 'error', message: describeError(err).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-b border-warning/30 bg-warning-soft">
      <Container className="flex items-center gap-3 py-2 text-sm text-ink">
        <MailWarning className="size-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1">
          Please confirm your email. We sent a link to <strong className="break-words">{user.email}</strong>.{' '}
          <button
            type="button"
            onClick={() => void sendAgain()}
            disabled={sending}
            className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
          >
            Send it again
          </button>
          <span className="hidden sm:inline">
            {' '}
            ·{' '}
            <Link to={routes.account} className="font-semibold text-primary underline-offset-2 hover:underline">
              My account
            </Link>
          </span>
        </p>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Hide this message"
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-warning/10 hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </Container>
    </div>
  );
}
