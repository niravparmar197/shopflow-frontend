import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { MailCheck } from 'lucide-react';
import { describeError, forgotPassword, isApiError } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Alert, Button, Input } from '@shopflow/ui';
import { AuthCard } from './AuthCard';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const backToLogin = (
    <Link to={routes.login()} className="font-semibold text-primary hover:underline">
      Back to log in
    </Link>
  );

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle="The link works once, for 30 minutes" footer={backToLogin}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <MailCheck className="size-7" aria-hidden />
          </span>
          {/* role=status: read out when it appears */}
          <p role="status" className="text-sm text-ink-soft">
            If an account exists for <strong className="break-words text-ink">{sentTo}</strong>, we sent it a link to choose a new
            password.
          </p>
          <p className="text-xs text-muted">No email? Check your spam folder, or try again in a minute.</p>
          <Button variant="secondary" onClick={() => setSentTo(null)}>
            Use another email
          </Button>
        </div>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setFieldError('Enter a valid email address');
      return;
    }
    setFieldError(undefined);
    setBusy(true);
    try {
      await forgotPassword(value);
      setSentTo(value);
    } catch (err) {
      setError(
        isApiError(err) && err.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : describeError(err).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we will send you a link to choose a new one" footer={backToLogin}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert kind="error" title={error} />}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
        />
        <Button type="submit" size="lg" fullWidth loading={busy} disabled={!email.trim()}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
