import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { describeError, isApiError, resetPassword } from '@shopflow/api';
import { routes, toast } from '@shopflow/shared';
import { Alert, Button, Input } from '@shopflow/ui';
import { AuthCard, usePasswordToggle } from './AuthCard';
import { PASSWORD_HINT, passwordProblem } from './password';
import { useLinkToken } from './useLinkToken';

interface Problem {
  title: string;
  /** The link itself is bad: offer a new one. */
  newLink?: boolean;
}

export function ResetPasswordPage() {
  const token = useLinkToken();
  const navigate = useNavigate();
  const password = usePasswordToggle();

  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ pass?: string; confirm?: string }>({});
  const [problem, setProblem] = useState<Problem | null>(
    token ? null : { title: 'This link is not complete. Please open the link from the email again.', newLink: true },
  );
  const [busy, setBusy] = useState(false);

  const askAgain = (
    <Link to={routes.forgotPassword} className="font-semibold text-primary hover:underline">
      Ask for a new link
    </Link>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const found = {
      pass: passwordProblem(pass),
      confirm: confirm !== pass ? 'The two passwords are not the same' : undefined,
    };
    setErrors(found);
    if (found.pass || found.confirm) return;

    setProblem(null);
    setBusy(true);
    try {
      await resetPassword(token, pass);
      toast({ kind: 'success', message: 'Password changed. Please log in with your new password.' });
      navigate(routes.login(), { replace: true });
    } catch (err) {
      if (isApiError(err) && (err.code === 'INVALID_TOKEN' || err.code === 'TOKEN_EXPIRED')) {
        setProblem({ title: err.message, newLink: true });
      } else if (isApiError(err) && err.status === 429) {
        setProblem({ title: 'Too many attempts. Please wait a minute and try again.' });
      } else {
        setProblem({ title: describeError(err).message });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="You will be logged out on every device"
      footer={
        <Link to={routes.login()} className="font-semibold text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {problem && (
          <Alert kind="error" title={problem.title}>
            {problem.newLink && askAgain}
          </Alert>
        )}
        <Input
          label="New password"
          type={password.type}
          autoComplete="new-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          error={errors.pass}
          hint={PASSWORD_HINT}
          trailing={password.toggle}
          disabled={!token}
        />
        <Input
          label="Type it again"
          type={password.type}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={!token}
        />
        <Button type="submit" size="lg" fullWidth loading={busy} disabled={!token || !pass || !confirm}>
          Save new password
        </Button>
      </form>
    </AuthCard>
  );
}
