import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Lock, Package } from 'lucide-react';
import { cartApi, describeError, isApiError, newIdempotencyKey, ordersApi, type Address } from '@shopflow/api';
import { emit, routes, useSession } from '@shopflow/shared';
import { Alert, Button, Container, EmptyState, ErrorState, Price, Skeleton } from '@shopflow/ui';
import { AddressSection } from './address/AddressSection';
import { Steps } from './Steps';

interface Problem {
  kind: 'warning' | 'error';
  title: string;
  text?: string;
  /** The user must fix the cart first (sold out, coupon, flash-sale limit). */
  fixInCart?: boolean;
}

/** Turns the order service's error codes into clear messages. */
function problemFor(err: unknown): Problem {
  if (!isApiError(err)) return { kind: 'error', title: describeError(err).message };
  switch (err.code) {
    case 'PRICE_CHANGED':
      return { kind: 'warning', title: 'Prices changed', text: 'We updated your total. Please check it and place the order again.' };
    case 'SOLD_OUT':
      return { kind: 'error', title: 'An item is sold out', text: 'Please update your cart.', fixInCart: true };
    case 'CART_ITEM_UNAVAILABLE':
      return { kind: 'error', title: 'An item is no longer available', text: 'Please update your cart.', fixInCart: true };
    case 'COUPON_NOT_APPLICABLE':
    case 'COUPON_EXHAUSTED':
      return { kind: 'error', title: 'Your coupon can’t be used', text: err.message, fixInCart: true };
    case 'FLASH_LIMIT':
    case 'ALREADY_BOUGHT_IN_SALE':
      return { kind: 'error', title: err.message, fixInCart: true };
    case 'SERVER_BUSY':
    case 'RATE_LIMITED':
      return { kind: 'warning', title: 'We are very busy right now', text: 'Your order was not placed yet. Please try again in a few seconds.' };
    case 'CHECKOUT_IN_PROGRESS':
    case 'IDEMPOTENCY_IN_PROGRESS':
      return { kind: 'warning', title: 'Your order is still being placed', text: 'Please wait a moment, then try again. It will not be placed twice.' };
    default: {
      const { message, reference } = describeError(err);
      return { kind: 'error', title: message, text: reference ? `Reference: ${reference}` : undefined };
    }
  }
}

/** Seconds left after a 429 with Retry-After. */
function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (until === 0) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [until]);

  return {
    left: Math.max(0, Math.ceil((until - now) / 1000)),
    start: (seconds: number) => {
      const t = Date.now();
      setNow(t);
      setUntil(t + seconds * 1000);
    },
  };
}

export function CheckoutPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const countdown = useCountdown();
  const [problem, setProblem] = useState<Problem | null>(null);

  // ONE key per checkout attempt. A retry (timeout, double click, "Try again")
  // reuses it, so the order service returns the SAME order, never a second one.
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());
  const [address, setAddress] = useState<Address | null>(null);

  // The address is part of the request body: a different address is a NEW
  // attempt, so it gets a new key (the same key with another body is refused).
  const selectAddress = useCallback((a: Address) => {
    setAddress(a);
    setIdempotencyKey(newIdempotencyKey());
    setProblem(null);
  }, []);

  const cart = useQuery({
    queryKey: ['checkout', 'cart', user?.id],
    queryFn: ({ signal }) => cartApi.get(signal),
  });

  const place = useMutation({
    mutationFn: ({ total, to }: { total: number; to: Address }) => ordersApi.place(idempotencyKey, total, to),
    onSuccess: ({ order }) => {
      emit('cart-changed', { itemCount: 0, source: 'checkout' }); // the order service emptied the cart
      navigate(routes.pay(order.id), { replace: true });
    },
    onError: (err) => {
      setProblem(problemFor(err));
      if (!isApiError(err)) return;
      // The cart changed, so the next attempt is a NEW request: it needs a new key.
      if (err.code === 'PRICE_CHANGED' || err.code === 'IDEMPOTENCY_KEY_REUSED') {
        setIdempotencyKey(newIdempotencyKey());
        void cart.refetch();
      }
      if (err.code === 'CART_EMPTY') navigate(routes.cart);
      if (err.retryAfterSec) countdown.start(err.retryAfterSec);
    },
  });

  if (cart.isPending) {
    return (
      <Container className="chk:grid chk:gap-6 chk:py-8 chk:lg:grid-cols-[1fr_360px]">
        <Skeleton className="chk:h-72 chk:w-full" />
        <Skeleton className="chk:h-72 chk:w-full" />
      </Container>
    );
  }

  if (cart.isError) {
    const { message, reference } = describeError(cart.error);
    return (
      <Container>
        <ErrorState title="We couldn't load your order" text={message} reference={reference} onRetry={() => void cart.refetch()} />
      </Container>
    );
  }

  const data = cart.data;

  if (data.items.length === 0) {
    return (
      <Container>
        <EmptyState
          title="Your cart is empty"
          text="Add something to your cart first."
          action={
            <Link
              to={routes.home}
              className="chk:rounded-lg chk:bg-primary chk:px-5 chk:py-2.5 chk:text-sm chk:font-semibold chk:text-white chk:hover:bg-primary-hover"
            >
              Start shopping
            </Link>
          }
        />
      </Container>
    );
  }

  const blocked = !data.pricingAvailable || data.totalPaise === null || data.items.some((l) => !l.available);
  const waiting = countdown.left > 0;

  return (
    <Container className="chk:pb-10">
      <Steps current={1} />
      <div className="chk:grid chk:gap-6 chk:lg:grid-cols-[1fr_360px] chk:lg:items-start">
        {/* Left: where to deliver, then the items (read-only) */}
        <div className="chk:flex chk:flex-col chk:gap-6">
        <AddressSection selected={address} onSelect={selectAddress} />
        <section aria-labelledby="review-title" className="chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-5 chk:shadow-sm">
          <h1 id="review-title" className="chk:text-xl chk:font-bold chk:text-ink">
            Review your order
          </h1>
          <ul className="chk:mt-2 chk:divide-y chk:divide-line">
            {data.items.map((line) => (
              <li key={line.productId} className="chk:flex chk:items-center chk:gap-4 chk:py-4">
                <div className="chk:grid chk:size-14 chk:shrink-0 chk:place-items-center chk:rounded-lg chk:bg-primary-soft chk:text-primary/60">
                  <Package className="chk:size-6" aria-hidden />
                </div>
                <div className="chk:min-w-0 chk:flex-1">
                  <p className="chk:truncate chk:font-medium chk:text-ink">{line.name ?? 'Product'}</p>
                  <p className="chk:text-sm chk:text-muted">Qty {line.qty}</p>
                </div>
                <Price paise={line.lineTotalPaise} className="chk:font-semibold chk:text-ink" />
              </li>
            ))}
          </ul>
          <Link to={routes.cart} className="chk:mt-2 chk:inline-block chk:text-sm chk:font-semibold chk:text-primary chk:hover:underline">
            Edit cart
          </Link>
        </section>
        </div>

        {/* Right: summary + Place order */}
        <aside
          aria-label="Order summary"
          className="chk:flex chk:flex-col chk:gap-4 chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-5 chk:shadow-sm chk:lg:sticky chk:lg:top-24"
        >
          <h2 className="chk:text-lg chk:font-semibold chk:text-ink">Order summary</h2>
          <dl className="chk:flex chk:flex-col chk:gap-2 chk:text-sm">
            <div className="chk:flex chk:justify-between">
              <dt className="chk:text-muted">Subtotal</dt>
              <dd>
                <Price paise={data.subtotalPaise} />
              </dd>
            </div>
            {data.discountPaise > 0 && (
              <div className="chk:flex chk:justify-between">
                <dt className="chk:text-muted">Discount{data.coupon ? ` (${data.coupon.code})` : ''}</dt>
                <dd className="chk:text-success">
                  −<Price paise={data.discountPaise} />
                </dd>
              </div>
            )}
            <div className="chk:flex chk:justify-between">
              <dt className="chk:text-muted">Delivery</dt>
              <dd>Free</dd>
            </div>
            {address && (
              <div className="chk:flex chk:justify-between chk:gap-3">
                <dt className="chk:text-muted">Deliver to</dt>
                <dd className="chk:truncate chk:text-right">
                  {address.fullName}, {address.city}
                </dd>
              </div>
            )}
            <div className="chk:mt-2 chk:flex chk:justify-between chk:border-t chk:border-line chk:pt-3 chk:text-base">
              <dt className="chk:font-semibold chk:text-ink">Total</dt>
              <dd className="chk:font-bold chk:text-ink">
                <Price paise={data.totalPaise} />
              </dd>
            </div>
          </dl>

          {blocked && (
            <Alert kind="warning" title="Your cart needs a change">
              Some prices or items are not available.{' '}
              <Link to={routes.cart} className="chk:font-semibold chk:text-primary chk:hover:underline">
                Back to cart
              </Link>
            </Alert>
          )}

          {problem && (
            <Alert kind={problem.kind} title={problem.title}>
              {problem.text}
              {problem.fixInCart && (
                <>
                  {' '}
                  <Link to={routes.cart} className="chk:font-semibold chk:text-primary chk:hover:underline">
                    Update cart
                  </Link>
                </>
              )}
            </Alert>
          )}

          <Button
            size="lg"
            fullWidth
            loading={place.isPending}
            disabled={blocked || waiting || !address}
            onClick={() => {
              if (!address) return;
              setProblem(null);
              place.mutate({ total: data.totalPaise ?? 0, to: address });
            }}
          >
            {!place.isPending && <Lock className="chk:size-4" aria-hidden />}
            {waiting ? `Try again in ${countdown.left}s` : 'Place order'}
          </Button>
          <p className="chk:text-center chk:text-xs chk:text-muted">{address ? 'You pay on the next step.' : 'Add a delivery address to continue.'}</p>
        </aside>
      </div>
    </Container>
  );
}
