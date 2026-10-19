import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { describeError, isApiError, login, signup } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Alert, Button, Input } from '@shopflow/ui';
import { AuthCard, usePasswordToggle } from './AuthCard';
import { PASSWORD_HINT, passwordProblem } from './password';

interface Fields {
  name: string;
  email: string;
  password: string;
}

type Errors = Partial<Record<keyof Fields, string>>;

/** The same rules as the user service, so most mistakes are caught before a request. */
export function validateSignup(f: Fields): Errors {
  const errors: Errors = {};
  if (f.name.trim().length < 2 || f.name.trim().length > 80) errors.name = 'Enter your name (2–80 characters)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = 'Enter a valid email address';
  const password = passwordProblem(f.password);
  if (password) errors.password = password;
  return errors;
}

export function SignupPage() {
  const { status } = useSession();
  const navigate = useNavigate();
  const password = usePasswordToggle();

  const [fields, setFields] = useState<Fields>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to={routes.home} replace />;

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateSignup(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await signup({ name: fields.name.trim(), email: fields.email.trim(), password: fields.password });
      await login(fields.email.trim(), fields.password); // signup returns no token
      toast({ kind: 'success', message: 'Account created. We sent you a link to confirm your email.' });
      navigate(routes.home, { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 409) setErrors({ email: 'This email is already registered' });
      else setFormError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Shop faster and track your orders"
      footer={
        <>
          Already have an account?{' '}
          <Link to={routes.login()} className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {formError && <Alert kind="error" title={formError} />}
        <Input label="Full name" autoComplete="name" value={fields.name} onChange={set('name')} error={errors.name} />
        <Input label="Email" type="email" autoComplete="email" value={fields.email} onChange={set('email')} error={errors.email} />
        <Input
          label="Password"
          type={password.type}
          autoComplete="new-password"
          value={fields.password}
          onChange={set('password')}
          error={errors.password}
          hint={PASSWORD_HINT}
          trailing={password.toggle}
        />
        <Button type="submit" size="lg" fullWidth loading={busy}>
          Create account
        </Button>
        <p className="text-center text-xs text-muted">
          By creating an account you agree to our{' '}
          <Link to={routes.terms} className="font-semibold text-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to={routes.privacy} className="font-semibold text-primary hover:underline">
            Privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
