import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCircle2, Clock, CreditCard, Loader2, XCircle } from 'lucide-react';
import { describeError, isApiError, ordersApi, paymentsApi, type CheckoutSession } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Alert, Button, Container, ErrorState, Price, Spinner } from '@shopflow/ui';
import { humanize } from './format';
import { openRazorpay } from './razorpay';
import { Steps } from './Steps';

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

const reasonText = (reason: string) =>
  reason === 'CARD_DECLINED' ? 'Your card was declined' : reason.replace(/_/g, ' ').toLowerCase();

/** Seconds until expiresAt, ticking every second. */
function useSecondsLeft(expiresAt: string | undefined) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt]);
  if (!expiresAt || now === 0) return null;
  return Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ResultCard({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="chk:mx-auto chk:flex chk:max-w-md chk:flex-col chk:items-center chk:gap-3 chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-8 chk:text-center chk:shadow-sm">
      {icon}
      <h1 className="chk:text-xl chk:font-bold chk:text-ink">{title}</h1>
      {children}
    </div>
  );
}

const linkButton =
  'chk:rounded-lg chk:bg-primary chk:px-5 chk:py-2.5 chk:text-sm chk:font-semibold chk:text-white chk:hover:bg-primary-hover';

export function PaymentPage() {
  const { orderId = '' } = useParams();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // 0) The payment row exists only after the order is CONFIRMED (stock reserved,
  //    order.confirmed → payment service). If the order is cancelled first (e.g.
  //    OUT_OF_STOCK), no payment will ever exist: show why instead of waiting.
  const order = useQuery({
    queryKey: ['checkout', 'tracking', orderId],
    queryFn: ({ signal }) => ordersApi.tracking(orderId, signal),
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? 2000 : false),
  });
  const orderStopped = order.data?.status === 'CANCELLED' || order.data?.status === 'FAILED';

  // 1) Start (or resume) the provider checkout. Safe to call again: the backend
  //    returns the same provider order. Until the payment row exists the backend
  //    answers 404 PAYMENT_NOT_FOUND, so retry for a while (about 25 s).
  const session = useQuery({
    queryKey: ['checkout', 'session', orderId],
    queryFn: () => paymentsApi.checkout(orderId),
    staleTime: Infinity,
    enabled: !orderStopped,
    retry: (count, err) =>
      count < 10 &&
      isApiError(err) &&
      ['PAYMENT_NOT_FOUND', 'PAYMENT_NOT_FOUND_YET', 'PAYMENT_PROVIDER_UNAVAILABLE', 'RATE_LIMITED'].includes(err.code),
    // 2.5 s = at most 4 tries per 10 s (the gateway allows 5); respect Retry-After on a 429
    retryDelay: (_count, err) => (isApiError(err) && err.retryAfterSec ? err.retryAfterSec * 1000 : 2500),
  });

  const alreadyDone = isApiError(session.error) && (session.error.code === 'PAYMENT_NOT_PAYABLE' || session.error.code === 'PAYMENT_EXPIRED');

  // 2) The payment's real status (set by the webhook). Poll while it is pending.
  const payment = useQuery({
    queryKey: ['checkout', 'payment', orderId],
    queryFn: ({ signal }) => paymentsApi.get(orderId, signal),
    enabled: session.isSuccess || alreadyDone,
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? 3000 : false),
  });

  const secondsLeft = useSecondsLeft(payment.data?.expiresAt);
  const refreshPayment = () => void queryClient.invalidateQueries({ queryKey: ['checkout', 'payment', orderId] });

  // Fake provider: the dev endpoint signs a webhook for us.
  const fakePay = useMutation({
    mutationFn: (outcome: 'succeeded' | 'failed') => paymentsApi.fakePay(orderId, outcome),
    onMutate: () => setActionError(null),
    onSuccess: refreshPayment,
    onError: (err) => setActionError(describeError(err).message),
  });

  const payWithRazorpay = async (s: CheckoutSession) => {
    setActionError(null);
    try {
      await openRazorpay(s, {
        onPaid: () => {
          setConfirming(true); // the webhook confirms; keep polling
          refreshPayment();
        },
        onClosed: () => undefined,
        onFailed: (reason) => setActionError(reason),
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open the payment window');
    }
  };

  // ---------- states ----------

  if (orderStopped) {
    return (
      <Container className="chk:py-10">
        <ResultCard icon={<XCircle className="chk:size-14 chk:text-danger" aria-hidden />} title="This order was cancelled">
          <p className="chk:text-sm chk:text-muted">
            {order.data?.failureReason ? humanize(order.data.failureReason) : 'It can’t be paid'}. Nothing was charged.
          </p>
          <Link to={routes.cart} className={linkButton}>
            Back to cart
          </Link>
        </ResultCard>
      </Container>
    );
  }

  if (session.isPending || (payment.isPending && (session.isSuccess || alreadyDone))) {
    return (
      <Container className="chk:grid chk:min-h-80 chk:place-items-center">
        <Spinner label="Preparing your payment" />
      </Container>
    );
  }

  if (session.isError && !alreadyDone) {
    const { message, reference } = describeError(session.error);
    return (
      <Container>
        <ErrorState title="We couldn't start the payment" text={message} reference={reference} onRetry={() => void session.refetch()} />
      </Container>
    );
  }

  if (payment.isError) {
    const { message, reference } = describeError(payment.error);
    return (
      <Container>
        <ErrorState title="We couldn't load the payment" text={message} reference={reference} onRetry={() => void payment.refetch()} />
      </Container>
    );
  }

  const p = payment.data;
  if (!p) return null;

  if (p.status === 'SUCCEEDED') {
    return (
      <Container className="chk:py-10">
        <ResultCard icon={<CheckCircle2 className="chk:size-14 chk:text-success" aria-hidden />} title="Payment successful">
          <p className="chk:text-sm chk:text-muted">
            We received <Price paise={p.amountPaise} /> for order {shortId(orderId)}.
          </p>
          <Link to={routes.order(orderId)} className={linkButton}>
            Track order
          </Link>
        </ResultCard>
      </Container>
    );
  }

  if (p.status === 'EXPIRED' || secondsLeft === 0) {
    return (
      <Container className="chk:py-10">
        <ResultCard icon={<Clock className="chk:size-14 chk:text-warning" aria-hidden />} title="The time to pay ran out">
          <p className="chk:text-sm chk:text-muted">Order {shortId(orderId)} was cancelled. Nothing was charged.</p>
          <Link to={routes.home} className={linkButton}>
            Back to shop
          </Link>
        </ResultCard>
      </Container>
    );
  }

  if (p.status === 'REFUND_PENDING' || p.status === 'REFUNDED') {
    return (
      <Container className="chk:py-10">
        <ResultCard icon={<XCircle className="chk:size-14 chk:text-danger" aria-hidden />} title="Payment came too late">
          <p className="chk:text-sm chk:text-muted">
            The order was already cancelled, so we {p.status === 'REFUNDED' ? 'refunded' : 'are refunding'} your money.
          </p>
          <Link to={routes.home} className={linkButton}>
            Back to shop
          </Link>
        </ResultCard>
      </Container>
    );
  }

  // PENDING: show the pay box
  const s = session.data;
  const busy = fakePay.isPending || confirming;

  return (
    <Container className="chk:pb-10">
      <Steps current={2} />
      <div className="chk:mx-auto chk:flex chk:max-w-md chk:flex-col chk:gap-5 chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-6 chk:shadow-sm">
        <div className="chk:text-center">
          <p className="chk:text-sm chk:text-muted">Order {shortId(orderId)}</p>
          <h1 className="chk:mt-1 chk:text-sm chk:font-medium chk:text-ink">Amount to pay</h1>
          <Price paise={p.amountPaise} className="chk:text-4xl chk:font-bold chk:text-ink" />
          {secondsLeft !== null && (
            <p className="chk:mt-2 chk:inline-flex chk:items-center chk:gap-1.5 chk:text-sm chk:text-muted">
              <Clock className="chk:size-4" aria-hidden /> Pay within {mmss(secondsLeft)}
            </p>
          )}
        </div>

        {p.lastError && !busy && (
          <Alert kind="error" title="Your last attempt failed">
            {reasonText(p.lastError)}. Please try again.
          </Alert>
        )}
        {actionError && <Alert kind="error" title={actionError} />}

        {busy ? (
          // One status message: a Spinner's own sr-only label would read it twice.
          <div role="status" className="chk:flex chk:flex-col chk:items-center chk:gap-2 chk:py-4">
            <Loader2 className="chk:size-5 chk:animate-spin chk:text-primary" aria-hidden />
            <p className="chk:text-sm chk:text-muted">Confirming your payment…</p>
          </div>
        ) : s?.provider === 'fake' ? (
          <>
            <Alert kind="info" title="Test mode">
              This is a demo payment. No real money.
            </Alert>
            <Button size="lg" fullWidth onClick={() => fakePay.mutate('succeeded')}>
              <CreditCard className="chk:size-5" aria-hidden /> Pay <Price paise={p.amountPaise} />
            </Button>
            <Button variant="secondary" fullWidth onClick={() => fakePay.mutate('failed')}>
              Decline payment
            </Button>
          </>
        ) : s?.provider === 'razorpay' ? (
          <Button size="lg" fullWidth onClick={() => void payWithRazorpay(s)}>
            <CreditCard className="chk:size-5" aria-hidden /> Pay with Razorpay
          </Button>
        ) : (
          <Alert kind="warning" title="This payment method is not supported in the web app yet" />
        )}
      </div>
    </Container>
  );
}
