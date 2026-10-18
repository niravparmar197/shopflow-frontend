import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, Minus, PackageOpen, Plus, TriangleAlert } from 'lucide-react';
import { cx } from './cx';
import { formatPaise } from './format';

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  ghost: 'text-ink-soft hover:bg-primary-soft hover:text-ink',
  danger: 'text-danger hover:bg-danger-soft',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth, className, disabled, children, onClick, ...rest },
  ref,
) {
  // While loading, the button stays focusable (aria-disabled, clicks ignored):
  // a natively disabled button drops keyboard focus to <body>.
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault(); // also stops a submit button submitting its form
          return;
        }
        onClick?.(e);
      }}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-wait aria-disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ---------- Form ---------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Element at the right edge (e.g. a show-password button) */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, trailing, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className={cx(
            'h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            error ? 'border-danger' : 'border-line',
            trailing ? 'pr-11' : undefined,
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {(error || hint) && (
        <p id={noteId} className={cx('text-xs', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

/* ---------- Display ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-card border border-line bg-surface shadow-sm', className)}>
      {children}
    </div>
  );
}

export function Price({
  paise,
  className,
  strike,
}: {
  paise: number | null | undefined;
  className?: string;
  strike?: boolean;
}) {
  return (
    <span className={cx('tabular-nums', strike && 'text-muted line-through', className)}>
      {paise === null || paise === undefined ? '—' : formatPaise(paise)}
    </span>
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-line-soft text-ink-soft',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  PENDING: 'neutral',
  CONFIRMED: 'info',
  PAID: 'success',
  SUCCEEDED: 'success',
  SHIPPED: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'warning',
  REFUND_PENDING: 'warning',
  REFUNDED: 'neutral',
};

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

/** Order or payment status with its fixed colour (PAID green, FAILED red...). */
export function StatusPill({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? 'neutral'}>{statusLabel(status)}</Badge>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-line-soft', className)} />;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
  label = 'Quantity',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
}) {
  const btn =
    'grid size-9 cursor-pointer place-items-center text-ink-soft hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div role="group" aria-label={label} className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-surface">
      <button type="button" className={btn} aria-label="Decrease" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="Increase" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/* ---------- Feedback ---------- */

const alertIcons = { error: AlertCircle, warning: TriangleAlert, success: CheckCircle2, info: Info };
const alertTones = {
  error: 'border-danger/30 bg-danger-soft text-danger',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  success: 'border-success/30 bg-success-soft text-success',
  info: 'border-info/30 bg-info-soft text-info',
};

export function Alert({
  kind = 'info',
  title,
  children,
  className,
}: {
  kind?: keyof typeof alertTones;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = alertIcons[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-lg border p-3 text-sm', alertTones[kind], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="text-ink">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && 'mt-0.5', 'text-ink-soft')}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
        {icon ?? <PackageOpen className="size-7" aria-hidden />}
      </div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  text,
  reference,
  onRetry,
}: {
  title?: string;
  text?: string;
  reference?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-warning-soft text-warning">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {reference && <p className="text-xs text-muted">Reference: <code>{reference}</code></p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ---------- Layout ---------- */

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mx-auto w-full max-w-7xl px-4 sm:px-6', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
