import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, MapPin, SearchX, Truck } from 'lucide-react';
import { describeError, isApiError, ordersApi, type OrderTracking } from '@shopflow/api';
import { routes, toast, toastError } from '@shopflow/shared';
import { Alert, Button, Container, EmptyState, ErrorState, Price, Skeleton, Spinner, StatusPill, formatDate, formatTime } from '@shopflow/ui';
import { addressLines, canCancel, canPay, formatPhone, humanize, linkButton, shortId } from './format';

const STOPPED = new Set(['CANCELLED', 'FAILED']);

/** The red banner for a stopped order: who stopped it and what happens to the money. */
function stoppedText(status: string, reason: string) {
  if (reason === 'USER_CANCELLED') return { title: 'You cancelled this order', text: 'If you had paid, the money is refunded automatically.' };
  if (reason === 'ADMIN_CANCELLED') return { title: 'We cancelled this order', text: 'Sorry about that. If you had paid, the money is refunded automatically.' };
  return {
    title: `Order ${status === 'CANCELLED' ? 'cancelled' : 'failed'}: ${humanize(reason)}`,
    text: 'You were not charged, or the money is refunded automatically.',
  };
}

type Tone = 'done' | 'bad' | 'todo';

function Step({ tone, title, at, reason, last }: { tone: Tone; title: string; at?: string; reason?: string | null; last: boolean }) {
  const dot = tone === 'done' ? 'chk:bg-success' : tone === 'bad' ? 'chk:bg-danger' : 'chk:bg-line';
  return (
    <li className={`chk:relative chk:flex chk:gap-4 ${last ? '' : 'chk:pb-6'}`}>
      {!last && <span className="chk:absolute chk:top-5 chk:left-[7px] chk:h-full chk:w-0.5 chk:bg-line" aria-hidden />}
      <span className={`chk:relative chk:mt-1 chk:size-4 chk:shrink-0 chk:rounded-full chk:ring-4 chk:ring-surface ${dot}`} aria-hidden />
      <div>
        <p className={tone === 'todo' ? 'chk:text-muted' : 'chk:font-semibold chk:text-ink'}>
          {title}
          {tone === 'todo' && <span className="chk:sr-only"> (not yet)</span>}
        </p>
        {at && (
          <p className="chk:text-xs chk:text-muted">
            {formatDate(at)}, {formatTime(at)}
          </p>
        )}
        {reason && <p className="chk:text-sm chk:text-danger">{humanize(reason)}</p>}
      </div>
    </li>
  );
}

/** Done steps from the read model, then the steps still to come (grey). */
function Timeline({ tracking }: { tracking: OrderTracking }) {
  const done = tracking.timeline;
  const has = (step: string) => done.some((t) => t.step === step);
  const upcoming = STOPPED.has(tracking.status)
    ? []
    : [
        ...(!has('PAYMENT_RECEIVED') && !has('PAID') ? ['Waiting for payment'] : []),
        ...(!has('SHIPPED') ? ['Shipped'] : []),
        ...(!has('DELIVERED') ? ['Delivered'] : []),
      ];

  return (
    <ol aria-label="Order progress">
      {done.map((t, i) => (
        <Step
          key={`${t.step}-${t.at}`}
          tone={STOPPED.has(t.step) ? 'bad' : 'done'}
          title={t.label}
          at={t.at}
          reason={t.reason}
          last={i === done.length - 1 && upcoming.length === 0}
        />
      ))}
      {upcoming.map((label, i) => (
        <Step key={label} tone="todo" title={label} last={i === upcoming.length - 1} />
      ))}
    </ol>
  );
}

/** /orders/:orderId: live status (polls until the order is settled). */
export function OrderTrackingPage() {
  const { orderId = '' } = useParams();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  // After a cancel the read model is a moment behind: keep polling until it shows it.
  const [cancelled, setCancelled] = useState(false);

  const tracking = useQuery({
    queryKey: ['checkout', 'tracking', orderId],
    queryFn: ({ signal }) => ordersApi.tracking(orderId, signal),
    refetchInterval: (q) => {
      const t = q.state.data;
      if (!t) return false;
      if (cancelled && t.status !== 'CANCELLED') return 1500;
      return t.syncing || t.status === 'PENDING' || t.status === 'CONFIRMED' ? 2000 : false;
    },
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: (order) => {
      setConfirming(false);
      setCancelled(true);
      qc.setQueryData(['checkout', 'order', orderId], order);
      void qc.invalidateQueries({ queryKey: ['checkout', 'tracking', orderId] });
      void qc.invalidateQueries({ queryKey: ['checkout', 'orders'] });
      toast({ kind: 'info', message: 'Order cancelled' });
    },
    onError: (err) => {
      setConfirming(false);
      void qc.invalidateQueries({ queryKey: ['checkout', 'tracking', orderId] });
      toastError(err); // e.g. it shipped meanwhile: 409
    },
  });

  const order = useQuery({
    queryKey: ['checkout', 'order', orderId],
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
  });

  if (tracking.isPending) {
    return (
      <Container className="chk:grid chk:min-h-80 chk:place-items-center">
        <Spinner label="Loading your order" />
      </Container>
    );
  }

  if (tracking.isError) {
    if (isApiError(tracking.error) && tracking.error.status === 404) {
      return (
        <Container>
          <EmptyState
            icon={<SearchX className="chk:size-7" aria-hidden />}
            title="Order not found"
            action={
              <Link to={routes.orders} className={linkButton}>
                My orders
              </Link>
            }
          />
        </Container>
      );
    }
    const { message, reference } = describeError(tracking.error);
    return (
      <Container>
        <ErrorState title="We couldn't load this order" text={message} reference={reference} onRetry={() => void tracking.refetch()} />
      </Container>
    );
  }

  const t = tracking.data;
  const placedAt = t.timeline[0]?.at;

  return (
    <Container className="chk:pb-10">
      <Link to={routes.orders} className="chk:mt-6 chk:inline-flex chk:items-center chk:gap-1 chk:text-sm chk:text-muted chk:hover:text-ink">
        <ArrowLeft className="chk:size-4" aria-hidden /> My orders
      </Link>

      <div className="chk:flex chk:flex-wrap chk:items-end chk:justify-between chk:gap-3 chk:py-4">
        <div>
          <div className="chk:flex chk:items-center chk:gap-3">
            <h1 className="chk:text-2xl chk:font-bold chk:text-ink">Order #{shortId(orderId)}</h1>
            <StatusPill status={t.status} />
          </div>
          <p className="chk:mt-1 chk:text-sm chk:text-muted">
            {placedAt && `Placed on ${formatDate(placedAt)} · `}
            Total <Price paise={t.totalPaise} className="chk:font-semibold chk:text-ink" />
          </p>
        </div>
        <div className="chk:flex chk:flex-wrap chk:gap-2">
          {canCancel(t.status) && !cancelled && (
            <Button variant="secondary" onClick={() => setConfirming(true)} aria-expanded={confirming} aria-controls="cancel-confirm">
              Cancel order
            </Button>
          )}
          {canPay(t) && !cancelled && (
            <Link to={routes.pay(orderId)} className={linkButton}>
              Pay now
            </Link>
          )}
        </div>
      </div>

      {confirming && (
        <div id="cancel-confirm" role="group" aria-label="Cancel this order?" className="chk:mb-4 chk:rounded-card chk:border chk:border-danger/40 chk:bg-danger-soft chk:p-4">
          <p className="chk:font-semibold chk:text-ink">Cancel this order?</p>
          <p className="chk:mt-1 chk:text-sm chk:text-ink-soft">
            {t.status === 'PAID' ? 'You paid for it: the full amount is refunded to you automatically.' : 'You will not be charged.'}
          </p>
          <div className="chk:mt-3 chk:flex chk:gap-2">
            <Button variant="danger" className="chk:border chk:border-danger/40" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              Yes, cancel it
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep my order
            </Button>
          </div>
        </div>
      )}

      {t.failureReason && (
        <Alert kind="error" className="chk:mb-4" title={stoppedText(t.status, t.failureReason).title}>
          {stoppedText(t.status, t.failureReason).text}
        </Alert>
      )}

      <div className="chk:grid chk:gap-6 chk:lg:grid-cols-[1fr_340px] chk:lg:items-start">
        <section aria-labelledby="progress-title" className="chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-6 chk:shadow-sm">
          <div className="chk:mb-5 chk:flex chk:items-center chk:justify-between">
            <h2 id="progress-title" className="chk:text-lg chk:font-semibold chk:text-ink">
              Progress
            </h2>
            {t.syncing && (
              <span className="chk:inline-flex chk:items-center chk:gap-1 chk:text-xs chk:text-muted">
                <Loader2 className="chk:size-3 chk:animate-spin" aria-hidden /> Updating…
              </span>
            )}
          </div>
          <Timeline tracking={t} />
        </section>

        <div className="chk:flex chk:flex-col chk:gap-6">
        {order.data?.shippingAddress && (
          <section aria-labelledby="delivery-title" className="chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-5 chk:shadow-sm">
            <h2 id="delivery-title" className="chk:mb-2 chk:flex chk:items-center chk:gap-2 chk:text-lg chk:font-semibold chk:text-ink">
              <MapPin className="chk:size-4 chk:text-primary" aria-hidden /> Delivery
            </h2>
            <p className="chk:text-sm chk:font-semibold chk:text-ink">{order.data.shippingAddress.fullName}</p>
            <p className="chk:text-sm chk:text-ink-soft">{addressLines(order.data.shippingAddress)}</p>
            <p className="chk:text-sm chk:text-muted">Phone {formatPhone(order.data.shippingAddress.phone)}</p>
            {(order.data.carrier || order.data.trackingNumber) && (
              <p className="chk:mt-3 chk:flex chk:items-start chk:gap-2 chk:border-t chk:border-line chk:pt-3 chk:text-sm">
                <Truck className="chk:mt-0.5 chk:size-4 chk:shrink-0 chk:text-primary" aria-hidden />
                <span>
                  {order.data.carrier ?? 'Courier'}
                  {order.data.trackingNumber && (
                    <>
                      {' · '}tracking <span className="chk:font-mono chk:font-semibold">{order.data.trackingNumber}</span>
                    </>
                  )}
                </span>
              </p>
            )}
          </section>
        )}
        <aside aria-label="Items" className="chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-5 chk:shadow-sm">
          <h2 className="chk:mb-3 chk:text-lg chk:font-semibold chk:text-ink">Items</h2>
          {order.isPending ? (
            <Skeleton className="chk:h-24 chk:w-full" />
          ) : order.isError ? (
            <p className="chk:text-sm chk:text-muted">Items can’t be loaded right now.</p>
          ) : (
            <>
              <ul className="chk:flex chk:flex-col chk:gap-2 chk:text-sm">
                {order.data.items.map((item) => (
                  <li key={item.productId} className="chk:flex chk:justify-between chk:gap-3">
                    <span className="chk:text-ink">
                      {item.name} <span className="chk:text-muted">× {item.quantity}</span>
                    </span>
                    <Price paise={item.lineTotalPaise} />
                  </li>
                ))}
              </ul>
              <dl className="chk:mt-4 chk:flex chk:flex-col chk:gap-1 chk:border-t chk:border-line chk:pt-3 chk:text-sm">
                {order.data.discountPaise > 0 && (
                  <div className="chk:flex chk:justify-between">
                    <dt className="chk:text-muted">Discount{order.data.couponCode ? ` (${order.data.couponCode})` : ''}</dt>
                    <dd className="chk:text-success">
                      −<Price paise={order.data.discountPaise} />
                    </dd>
                  </div>
                )}
                <div className="chk:flex chk:justify-between chk:font-semibold chk:text-ink">
                  <dt>Total</dt>
                  <dd>
                    <Price paise={order.data.totalPaise} />
                  </dd>
                </div>
              </dl>
            </>
          )}
        </aside>
        </div>
      </div>
    </Container>
  );
}
