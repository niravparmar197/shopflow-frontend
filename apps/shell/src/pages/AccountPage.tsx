import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { BadgeCheck, KeyRound, MailWarning, Receipt, UserRound } from 'lucide-react';
import { changePassword, describeError, isApiError, resendVerification, updateProfile, type User } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Alert, Badge, Button, Card, Container, Input, PageHeader } from '@shopflow/ui';
import { usePasswordToggle } from './AuthCard';
import { PASSWORD_HINT, passwordProblem } from './password';

/** "+91 98765-43210" → "9876543210", like the user service. */
export function normalisePhone(value: string): string {
  return value.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
}

export function AccountPage() {
  const { user } = useSession();
  if (!user) return null; // RequireAuth renders this page only when logged in

  return (
    <Container className="pb-12">
      <PageHeader title="My account" subtitle="Your profile, email and password" />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* key: a fresh form when another user logs in on this tab */}
        <ProfileCard key={user.id} user={user} />
        <PasswordCard />
        <Card className="p-5 lg:col-span-2">
          <Link to={routes.orders} className="flex items-center gap-3 text-sm font-semibold text-ink hover:text-primary">
            <Receipt className="size-5 text-primary" aria-hidden /> My orders
            <span className="font-normal text-muted">· track, cancel, see delivery details</span>
          </Link>
        </Card>
      </div>
    </Container>
  );
}

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
      {icon}
      {children}
    </h2>
  );
}

function ProfileCard({ user }: { user: User }) {
  const [name, setName] = useState(user.fullName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cleanPhone = normalisePhone(phone);
  const dirty = name.trim() !== (user.fullName ?? '') || cleanPhone !== (user.phone ?? '');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = {
      name: name.trim().length < 2 || name.trim().length > 80 ? 'Enter your name (2–80 characters)' : undefined,
      phone: cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone) ? 'Enter a 10-digit mobile number' : undefined,
    };
    setErrors(found);
    if (found.name || found.phone) return;

    setSaving(true);
    try {
      const saved = await updateProfile({ fullName: name.trim(), phone: cleanPhone || null });
      setPhone(saved.phone ?? '');
      toast({ kind: 'success', message: 'Profile saved' });
    } catch (err) {
      setFormError(describeError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <CardTitle icon={<UserRound className="size-5 text-primary" aria-hidden />}>Profile</CardTitle>
      <EmailRow user={user} />
      <form onSubmit={save} className="mt-5 flex flex-col gap-4" noValidate>
        {formError && <Alert kind="error" title={formError} />}
        <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input
          label="Mobile number (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="10 digits. Leave empty to remove it."
        />
        <Button type="submit" className="self-start" loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function EmailRow({ user }: { user: User }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendAgain = async () => {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
    } catch (err) {
      // 429: we just sent one. 409: verified meanwhile (another tab).
      toast({ kind: isApiError(err) && err.status === 429 ? 'info' : 'error', message: describeError(err).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">Email</p>
          <p className="truncate text-sm font-medium text-ink">{user.email}</p>
        </div>
        {user.emailVerifiedAt ? (
          <Badge tone="success">
            <BadgeCheck className="size-3.5" aria-hidden /> Confirmed
          </Badge>
        ) : (
          <Badge tone="warning">
            <MailWarning className="size-3.5" aria-hidden /> Not confirmed
          </Badge>
        )}
      </div>
      {!user.emailVerifiedAt && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm text-ink-soft">
          {sent ? (
            <p role="status">We sent a new link. Please check your inbox.</p>
          ) : (
            <>
              <p className="flex-1">Open the link we emailed you to confirm this address.</p>
              <Button variant="secondary" size="sm" loading={sending} onClick={() => void sendAgain()}>
                Send the link again
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PasswordCard() {
  const toggle = usePasswordToggle();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = {
      current: current ? undefined : 'Enter your current password',
      next: passwordProblem(next) ?? (next === current ? 'Choose a password you are not using now' : undefined),
      confirm: confirm !== next ? 'The two passwords are not the same' : undefined,
    };
    setErrors(found);
    if (found.current || found.next || found.confirm) return;

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast({ kind: 'success', message: 'Password changed. Other devices were logged out.' });
    } catch (err) {
      if (isApiError(err) && err.code === 'WRONG_PASSWORD') setErrors({ current: err.message });
      else if (isApiError(err) && err.code === 'SAME_PASSWORD') setErrors({ next: err.message });
      else if (isApiError(err) && err.status === 429) setFormError('Too many attempts. Please wait a minute and try again.');
      else setFormError(describeError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <CardTitle icon={<KeyRound className="size-5 text-primary" aria-hidden />}>Password</CardTitle>
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        {formError && <Alert kind="error" title={formError} />}
        <Input
          label="Current password"
          type={toggle.type}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
          trailing={toggle.toggle}
        />
        <Input
          label="New password"
          type={toggle.type}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
          hint={PASSWORD_HINT}
        />
        <Input
          label="Type the new password again"
          type={toggle.type}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <p className="text-xs text-muted">You stay logged in here. Other devices are logged out.</p>
        <Button type="submit" className="self-start" loading={saving} disabled={!current || !next || !confirm}>
          Change password
        </Button>
        <p className="text-sm text-muted">
          Forgot it?{' '}
          <Link to={routes.forgotPassword} className="font-semibold text-primary hover:underline">
            Get a reset link by email
          </Link>
        </p>
      </form>
    </Card>
  );
}
