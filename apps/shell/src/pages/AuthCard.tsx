import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { Card } from '@shopflow/ui';

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-10 sm:py-16">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary text-white">
            <ShoppingBag className="size-5.5" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>
        {children}
        {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
      </Card>
    </div>
  );
}

/** The eye button inside a password field. */
export function usePasswordToggle() {
  const [visible, setVisible] = useState(false);
  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      className="grid size-9 cursor-pointer place-items-center rounded-md text-muted hover:text-ink"
    >
      {visible ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
    </button>
  );
  return { type: visible ? 'text' : 'password', toggle };
}

/** Only same-site paths, so ?returnTo can't send people to another website. */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
