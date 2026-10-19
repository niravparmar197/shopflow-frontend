import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { adminApi, describeError, isApiError } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { ErrorState, NotFound, PageHeader, Price, Spinner, StatusPill, formatDate, formatTime } from '@shopflow/ui';
import { card, humanize, shortId, textLink } from '../format';
import { OrderActions } from './OrderActions';

/** One order: customer, status, items and totals (write model, always current). */
export function OrderPage() {
  const { id = '' } = useParams();
  const order = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: ({ signal }) => adminApi.orders.get(id, signal),
  });

  const back = (
    <Link to={routes.adminOrders} className={`${textLink} adm:mt-4 adm:inline-flex adm:items-center adm:gap-1 adm:text-sm`}>
      <ArrowLeft className="adm:size-4" aria-hidden /> All orders
    </Link>
  );

  if (order.isPending) {
    return (
      <div className="adm:grid adm:min-h-60 adm:place-items-center">
        <Spinner label="Loading the order" />
      </div>
    );
  }
  if (order.isError) {
    if (isApiError(order.error) && (order.error.status === 404 || order.error.status === 400)) return <NotFound action={back} />;
    const { message, reference } = describeError(order.error);
    return <ErrorState text={message} reference={reference} onRetry={() => void order.refetch()} />;
  }

  const o = order.data;
  return (
    <>
      {back}
      <PageHeader
        title={`Order #${shortId(o.id)}`}
        subtitle={`Placed ${formatDate(o.createdAt)}, ${formatTime(o.createdAt)} · updated ${formatDate(o.updatedAt)}, ${formatTime(o.updatedAt)}`}
        actions={<StatusPill status={o.status} />}
      />
      <div className="adm:grid adm:gap-6 adm:lg:grid-cols-[2fr_1fr]">
        <section className={card} aria-labelledby="items-title">
          <h2 id="items-title" className="adm:text-lg adm:font-semibold">
            Items
          </h2>
          <ul className="adm:mt-3 adm:divide-y adm:divide-line">
            {o.items.map((i) => (
              <li key={i.productId} className="adm:flex adm:justify-between adm:gap-4 adm:py-2 adm:text-sm">
                <span>
                  {i.name} <span className="adm:text-muted">× {i.quantity}</span>
                </span>
                <Price paise={i.lineTotalPaise} />
              </li>
            ))}
          </ul>
          <dl className="adm:mt-3 adm:space-y-1 adm:border-t adm:border-line adm:pt-3 adm:text-sm">
            <div className="adm:flex adm:justify-between">
              <dt className="adm:text-muted">Subtotal</dt>
              <dd>
                <Price paise={o.subtotalPaise} />
              </dd>
            </div>
            {o.discountPaise > 0 && (
              <div className="adm:flex adm:justify-between adm:text-success">
                <dt>Discount{o.couponCode && ` (${o.couponCode})`}</dt>
                <dd>
                  −<Price paise={o.discountPaise} />
                </dd>
              </div>
            )}
            <div className="adm:flex adm:justify-between adm:font-semibold">
              <dt>Total</dt>
              <dd>
                <Price paise={o.totalPaise} />
              </dd>
            </div>
          </dl>
        </section>
        <div className="adm:flex adm:flex-col adm:gap-6">
        <OrderActions order={o} />
        <section className={card} aria-labelledby="customer-title">
          <h2 id="customer-title" className="adm:text-lg adm:font-semibold">
            Customer
          </h2>
          <dl className="adm:mt-3 adm:space-y-2 adm:text-sm">
            <div>
              <dt className="adm:text-muted">Email</dt>
              <dd className="adm:break-all">{o.customerEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="adm:text-muted">User id</dt>
              <dd className="adm:break-all adm:font-mono adm:text-xs">{o.userId}</dd>
            </div>
            {o.failureReason && (
              <div>
                <dt className="adm:text-muted">Reason</dt>
                <dd>{humanize(o.failureReason)}</dd>
              </div>
            )}
          </dl>
          {o.shippingAddress ? (
            <div className="adm:mt-4 adm:border-t adm:border-line adm:pt-3 adm:text-sm">
              <p className="adm:text-muted">Deliver to</p>
              <p className="adm:font-semibold">{o.shippingAddress.fullName}</p>
              <p>{[o.shippingAddress.line1, o.shippingAddress.line2].filter(Boolean).join(', ')}</p>
              <p>
                {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}
              </p>
              <p className="adm:text-muted">Phone {o.shippingAddress.phone}</p>
            </div>
          ) : (
            <p className="adm:mt-4 adm:border-t adm:border-line adm:pt-3 adm:text-sm adm:text-muted">No delivery address (placed before addresses existed).</p>
          )}
          {(o.carrier || o.trackingNumber) && (
            <p className="adm:mt-3 adm:text-sm">
              <span className="adm:text-muted">Shipped with</span> {o.carrier ?? '—'}
              {o.trackingNumber && <span className="adm:font-mono"> · {o.trackingNumber}</span>}
            </p>
          )}
        </section>
        </div>
      </div>
    </>
  );
}
