import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { describeError, isApiError, login } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Alert, Button, Input } from '@shopflow/ui';
import { AuthCard, safeReturnTo, usePasswordToggle } from './AuthCard';

export function LoginPage() {
  const { status } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const password = usePasswordToggle();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to={returnTo} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), pass);
      toast({ kind: 'success', message: `Welcome back${user.fullName ? `, ${user.fullName}` : ''}!` });
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(
        isApiError(err) && err.status === 401
          ? 'Invalid email or password'
          : isApiError(err) && err.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : describeError(err).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your ShopFlow account"
      footer={
        <>
          New here?{' '}
          <Link to={routes.signup} className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert kind="error" title={error} />}
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Password"
          type={password.type}
          autoComplete="current-password"
          required
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          trailing={password.toggle}
        />
        <Button type="submit" size="lg" fullWidth loading={busy} disabled={!email || !pass}>
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
