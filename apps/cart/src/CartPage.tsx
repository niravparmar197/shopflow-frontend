import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Package, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { cartApi, describeError, isApiError, type Cart, type CartLine } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  ErrorState,
  PageHeader,
  Price,
  QuantityStepper,
  Skeleton,
} from '@shopflow/ui';
import { useCart, useCartAction } from './useCart';
import './remote.css';

const MAX_QTY = 10; // per product, same limit as the order service
const COUPON_CODE = /^[A-Za-z0-9]{4,20}$/;

/* ---------- One cart line ---------- */

function LineRow({ line }: { line: CartLine }) {
  const update = useCartAction((qty: number) => cartApi.updateQty(line.productId, qty));
  const remove = useCartAction(() => cartApi.removeItem(line.productId));
  const busy = update.isPending || remove.isPending;
  const name = line.name ?? 'This product';

  return (
    <li className={`cart:flex cart:gap-4 cart:py-4 ${line.available ? '' : 'cart:opacity-70'}`}>
      <div className="cart:grid cart:size-20 cart:shrink-0 cart:place-items-center cart:rounded-lg cart:bg-primary-soft cart:text-primary/60">
        <Package className="cart:size-8" aria-hidden />
      </div>

      <div className="cart:flex cart:min-w-0 cart:flex-1 cart:flex-col cart:gap-3">
        <div className="cart:flex cart:items-start cart:justify-between cart:gap-3">
          <div className="cart:min-w-0">
            <Link to={routes.product(line.productId)} className="cart:font-semibold cart:text-ink cart:hover:text-primary">
              {name}
            </Link>
            {line.unitPricePaise !== undefined && (
              <p className="cart:text-sm cart:text-muted">
                <Price paise={line.unitPricePaise} /> each
              </p>
            )}
            {!line.available && (
              <Badge tone="warning" className="cart:mt-1">
                No longer available
              </Badge>
            )}
          </div>
          <Price paise={line.lineTotalPaise} className="cart:font-bold cart:text-ink" />
        </div>

        <div className="cart:flex cart:items-center cart:justify-between cart:gap-3">
          {line.available ? (
            <QuantityStepper
              value={line.qty}
              max={MAX_QTY}
              disabled={busy}
              onChange={(qty) => update.mutate(qty)}
              label={`Quantity of ${name}`}
            />
          ) : (
            <span />
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => remove.mutate(undefined)}
            loading={remove.isPending}
            disabled={busy}
            aria-label={`Remove ${name}`}
          >
            {!remove.isPending && <Trash2 className="cart:size-4" aria-hidden />}
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ---------- Coupon ---------- */

const couponMessage = (err: unknown) =>
  isApiError(err) && err.status === 404
    ? 'This coupon does not exist'
    : isApiError(err) && (err.status === 400 || err.status === 409)
      ? err.message // the order service says why (e.g. minimum order value)
      : describeError(err).message;

function CouponBox({ cart }: { cart: Cart }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const apply = useCartAction((c: string) => cartApi.applyCoupon(c), { toastErrors: false });
  const remove = useCartAction(() => cartApi.removeCoupon());

  if (cart.coupon) {
    const { coupon } = cart;
    return (
      <div className="cart:flex cart:flex-col cart:gap-2">
        <div className="cart:flex cart:items-center cart:justify-between cart:gap-2 cart:rounded-lg cart:border cart:border-dashed cart:border-line cart:px-3 cart:py-2">
          <span className="cart:flex cart:items-center cart:gap-2 cart:text-sm cart:font-semibold cart:text-ink">
            <Tag className="cart:size-4 cart:text-primary" aria-hidden /> {coupon.code}
          </span>
          <button
            type="button"
            onClick={() => remove.mutate(undefined)}
            disabled={remove.isPending}
            aria-label={`Remove coupon ${coupon.code}`}
            className="cart:grid cart:size-7 cart:cursor-pointer cart:place-items-center cart:rounded cart:text-muted cart:hover:text-ink"
          >
            <X className="cart:size-4" aria-hidden />
          </button>
        </div>
        {!coupon.applied && (
          <Alert kind="warning" title="This coupon no longer applies">
            {coupon.reason}
          </Alert>
        )}
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!COUPON_CODE.test(value)) {
      setError('Enter a code of 4–20 letters or digits');
      return;
    }
    setError(null);
    apply.mutate(value, {
      onSuccess: () => setCode(''),
      onError: (err) => setError(couponMessage(err)),
    });
  };

  return (
    <form onSubmit={submit} className="cart:flex cart:flex-col cart:gap-1.5" noValidate>
      <label htmlFor="coupon" className="cart:text-sm cart:font-medium cart:text-ink">
        Coupon code
      </label>
      <div className="cart:flex cart:gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. SAVE10"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="cart:h-10 cart:min-w-0 cart:flex-1 cart:rounded-lg cart:border cart:border-line cart:bg-surface cart:px-3 cart:text-sm cart:uppercase cart:outline-none cart:focus:border-primary cart:focus:ring-2 cart:focus:ring-primary/20"
        />
        <Button type="submit" variant="secondary" loading={apply.isPending}>
          Apply
        </Button>
      </div>
      {error && (
        <p id="coupon-error" className="cart:text-xs cart:text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/* ---------- Summary ---------- */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cart:flex cart:justify-between cart:gap-3">
      <dt className="cart:text-muted">{label}</dt>
      <dd className="cart:font-medium cart:text-ink">{children}</dd>
    </div>
  );
}

function Summary({ cart }: { cart: Cart }) {
  const navigate = useNavigate();
  const blocked = !cart.pricingAvailable
    ? 'Prices can’t be loaded right now. Please try again in a moment.'
    : cart.items.some((l) => !l.available)
      ? 'Remove the items that are no longer available.'
      : null;

  return (
    <aside
      aria-label="Order summary"
      className="cart:flex cart:flex-col cart:gap-5 cart:rounded-card cart:border cart:border-line cart:bg-surface cart:p-5 cart:shadow-sm cart:lg:sticky cart:lg:top-24"
    >
      <h2 className="cart:text-lg cart:font-semibold cart:text-ink">Order summary</h2>
      <CouponBox cart={cart} />
      <dl className="cart:flex cart:flex-col cart:gap-2 cart:text-sm">
        <Row label={`Subtotal (${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'})`}>
          <Price paise={cart.subtotalPaise} />
        </Row>
        {cart.discountPaise > 0 && (
          <Row label="Discount">
            <span className="cart:text-success">
              −<Price paise={cart.discountPaise} />
            </span>
          </Row>
        )}
        <Row label="Delivery">Free</Row>
        <div className="cart:mt-2 cart:flex cart:justify-between cart:border-t cart:border-line cart:pt-3 cart:text-base">
          <dt className="cart:font-semibold cart:text-ink">Total</dt>
          <dd className="cart:font-bold cart:text-ink">
            <Price paise={cart.totalPaise} />
          </dd>
        </div>
      </dl>
      {blocked && <Alert kind="warning" title={blocked} />}
      <Button size="lg" fullWidth disabled={Boolean(blocked)} onClick={() => navigate(routes.checkout)}>
        Checkout
      </Button>
    </aside>
  );
}

/* ---------- Page ---------- */

/** Exposed as cart/CartPage (route /cart). */
export default function CartPage() {
  const cart = useCart();

  if (cart.isPending) {
    return (
      <Container className="cart:grid cart:gap-6 cart:py-8 cart:lg:grid-cols-[1fr_360px]">
        <Skeleton className="cart:h-72 cart:w-full" />
        <Skeleton className="cart:h-72 cart:w-full" />
      </Container>
    );
  }

  if (cart.isError) {
    const { message, reference } = describeError(cart.error);
    return (
      <Container>
        <ErrorState
          title="We couldn't load your cart"
          text={message}
          reference={reference}
          onRetry={() => void cart.refetch()}
        />
      </Container>
    );
  }

  const data = cart.data;

  if (data.items.length === 0) {
    return (
      <Container>
        <EmptyState
          icon={<ShoppingBag className="cart:size-7" aria-hidden />}
          title="Your cart is empty"
          text="Find something you like."
          action={
            <Link
              to={routes.home}
              className="cart:rounded-lg cart:bg-primary cart:px-5 cart:py-2.5 cart:text-sm cart:font-semibold cart:text-white cart:hover:bg-primary-hover"
            >
              Start shopping
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="cart:pb-10">
      <PageHeader title="Your cart" subtitle={`${data.itemCount} ${data.itemCount === 1 ? 'item' : 'items'}`} />
      <div className="cart:grid cart:gap-6 cart:lg:grid-cols-[1fr_360px] cart:lg:items-start">
        <section
          aria-label="Cart items"
          className="cart:rounded-card cart:border cart:border-line cart:bg-surface cart:px-5 cart:shadow-sm"
        >
          {!data.pricingAvailable && (
            <Alert kind="warning" className="cart:mt-4" title="Prices can’t be loaded right now">
              You can still change your cart.
            </Alert>
          )}
          <ul className="cart:divide-y cart:divide-line">
            {data.items.map((line) => (
              <LineRow key={line.productId} line={line} />
            ))}
          </ul>
        </section>
        <Summary cart={data} />
      </div>
    </Container>
  );
}
