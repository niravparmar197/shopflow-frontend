import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ChevronRight, Loader2, Package, Receipt } from 'lucide-react';
import { describeError, ordersApi, type OrderSummary } from '@shopflow/api';
import { routes, useSession } from '@shopflow/shared';
import { Button, Container, EmptyState, ErrorState, PageHeader, Price, Skeleton, StatusPill, formatDate } from '@shopflow/ui';
import { canPay, linkButton, shortId } from './format';

function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <li className="chk:flex chk:flex-wrap chk:items-center chk:gap-x-4 chk:gap-y-2 chk:py-4">
      <div className="chk:grid chk:size-12 chk:shrink-0 chk:place-items-center chk:rounded-lg chk:bg-primary-soft chk:text-primary">
        <Package className="chk:size-5" aria-hidden />
      </div>

      <Link to={routes.order(order.id)} className="chk:min-w-40 chk:flex-1 chk:rounded chk:hover:text-primary">
        <p className="chk:truncate chk:font-semibold chk:text-ink">{order.title ?? `Order ${shortId(order.id)}`}</p>
        <p className="chk:text-sm chk:text-muted">
          {formatDate(order.createdAt)}
          {order.itemCount !== null && ` · ${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`}
          {` · #${shortId(order.id)}`}
        </p>
      </Link>

      <div className="chk:ml-auto chk:flex chk:items-center chk:gap-3">
        {order.syncing ? (
          <span className="chk:inline-flex chk:items-center chk:gap-1 chk:text-xs chk:text-muted">
            <Loader2 className="chk:size-3 chk:animate-spin" aria-hidden /> Updating…
          </span>
        ) : (
          <StatusPill status={order.status} />
        )}
        <Price paise={order.totalPaise} className="chk:w-24 chk:text-right chk:font-semibold chk:text-ink" />
        {canPay(order) && !order.syncing && (
          <Link to={routes.pay(order.id)} className={linkButton}>
            Pay now
          </Link>
        )}
        <ChevronRight className="chk:size-4 chk:text-muted" aria-hidden />
      </div>
    </li>
  );
}

/** /orders: newest first, from the order service's read model. */
export function OrdersPage() {
  const { user } = useSession();

  const orders = useInfiniteQuery({
    queryKey: ['checkout', 'orders', user?.id],
    queryFn: ({ pageParam, signal }) => ordersApi.list(pageParam, 10, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // A just-placed order is "syncing" until the read model catches up (a few seconds).
    refetchInterval: (q) => (q.state.data?.pages.some((p) => p.items.some((o) => o.syncing)) ? 2000 : false),
  });

  const list = orders.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Container className="chk:pb-10">
      <PageHeader title="My orders" />

      {orders.isPending ? (
        <div className="chk:flex chk:flex-col chk:gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="chk:h-20 chk:w-full" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState
          title="We couldn't load your orders"
          text={describeError(orders.error).message}
          reference={describeError(orders.error).reference}
          onRetry={() => void orders.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Receipt className="chk:size-7" aria-hidden />}
          title="No orders yet"
          text="When you place an order, you can track it here."
          action={
            <Link to={routes.home} className={linkButton}>
              Start shopping
            </Link>
          }
        />
      ) : (
        <>
          <ul className="chk:divide-y chk:divide-line chk:rounded-card chk:border chk:border-line chk:bg-surface chk:px-5 chk:shadow-sm">
            {list.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
          {orders.hasNextPage && (
            <div className="chk:mt-6 chk:flex chk:justify-center">
              <Button variant="secondary" onClick={() => void orders.fetchNextPage()} loading={orders.isFetchingNextPage}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
