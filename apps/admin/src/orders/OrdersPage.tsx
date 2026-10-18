import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { adminApi, describeError, type OrderStatus } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Button, EmptyState, ErrorState, PageHeader, Price, Skeleton, StatusPill, formatDate } from '@shopflow/ui';
import { field, shortId, textLink } from '../format';

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'];

/** Every customer's orders, newest first. The status filter lives in the URL. */
export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const status = STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : undefined;

  const query = useInfiniteQuery({
    queryKey: ['admin', 'orders', status ?? 'all'],
    queryFn: ({ pageParam, signal }) => adminApi.orders.list({ status, cursor: pageParam, limit: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="All customers, newest first."
        actions={
          <div className="adm:flex adm:items-center adm:gap-2">
            <label htmlFor="admin-order-status" className="adm:text-sm adm:font-medium">
              Status
            </label>
            <select
              id="admin-order-status"
              value={status ?? ''}
              onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}
              className={`${field} adm:w-44`}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {query.isPending ? (
        <div className="adm:flex adm:flex-col adm:gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="adm:h-12 adm:w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          text={describeError(query.error).message}
          reference={describeError(query.error).reference}
          onRetry={() => void query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState title="No orders" text={status ? 'No orders with this status.' : 'Orders appear here when customers buy.'} />
      ) : (
        <div className="adm:overflow-x-auto adm:rounded-card adm:border adm:border-line adm:bg-surface adm:shadow-sm">
          <table className="adm:w-full adm:text-left adm:text-sm">
            <thead className="adm:border-b adm:border-line adm:bg-canvas adm:text-xs adm:uppercase adm:text-muted">
              <tr>
                <th scope="col" className="adm:px-4 adm:py-3">Order</th>
                <th scope="col" className="adm:hidden adm:px-4 adm:py-3 adm:md:table-cell">Customer</th>
                <th scope="col" className="adm:px-4 adm:py-3">Status</th>
                <th scope="col" className="adm:px-4 adm:py-3 adm:text-right">Total</th>
              </tr>
            </thead>
            <tbody className="adm:divide-y adm:divide-line">
              {items.map((o) => (
                <tr key={o.id}>
                  <td className="adm:px-4 adm:py-3">
                    <Link to={routes.adminOrder(o.id)} className={textLink}>
                      #{shortId(o.id)}
                    </Link>
                    <p className="adm:text-xs adm:text-muted">
                      {formatDate(o.createdAt)}
                      {o.itemCount != null && ` · ${o.itemCount} item${o.itemCount === 1 ? '' : 's'}`}
                    </p>
                    <p className="adm:max-w-48 adm:truncate adm:text-xs adm:text-ink-soft adm:md:hidden">{o.customerEmail ?? shortId(o.userId)}</p>
                  </td>
                  <td className="adm:hidden adm:max-w-56 adm:truncate adm:px-4 adm:py-3 adm:md:table-cell">{o.customerEmail ?? shortId(o.userId)}</td>
                  <td className="adm:px-4 adm:py-3">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="adm:px-4 adm:py-3 adm:text-right adm:font-semibold">
                    <Price paise={o.totalPaise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.hasNextPage && (
        <div className="adm:mt-6 adm:flex adm:justify-center">
          <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
