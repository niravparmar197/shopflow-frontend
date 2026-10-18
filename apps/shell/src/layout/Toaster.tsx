import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useShopFlowEvent, type ShopFlowEvents } from '@shopflow/shared';
import { cx } from '@shopflow/ui';

type Toast = ShopFlowEvents['toast'] & { id: number };

const icons = { success: CheckCircle2, error: TriangleAlert, info: Info };
const tones = { success: 'text-success', error: 'text-danger', info: 'text-info' };

/** Shows toasts sent by ANY micro frontend (the `toast` event), bottom right. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Hovering or focusing a toast (e.g. tabbing to its link) pauses the timer.
  const [paused, setPaused] = useState(false);

  useShopFlowEvent('toast', (detail) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { ...detail, id }]);
  });

  useEffect(() => {
    if (toasts.length === 0 || paused) return;
    const timer = setTimeout(() => setToasts((list) => list.slice(1)), 4500);
    return () => clearTimeout(timer);
  }, [toasts, paused]);

  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  // ONE live region that is always in the page (no role per toast: nested live
  // regions make screen readers read a toast twice).
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      role="region"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lg">
            <Icon className={cx('mt-0.5 size-5 shrink-0', tones[t.kind])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {t.kind === 'error' && <span className="sr-only">Error: </span>}
                {t.message}
              </p>
              {t.detail && <p className="mt-0.5 truncate text-xs text-muted">{t.detail}</p>}
              {t.action && (
                <Link to={t.action.href} onClick={() => dismiss(t.id)} className="mt-1.5 inline-block text-xs font-semibold text-primary hover:underline">
                  {t.action.label}
                </Link>
              )}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="cursor-pointer rounded p-0.5 text-muted hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
