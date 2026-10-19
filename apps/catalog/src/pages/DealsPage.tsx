import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Timer, Zap } from 'lucide-react';
import { describeError, flashSalesApi, productsApi, type LiveFlashSale } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Container, EmptyState, ErrorState, PageHeader, Skeleton } from '@shopflow/ui';
import { ProductCard } from '../components/ProductCard';
import { useAddToCart } from '../useAddToCart';
import { useWishlist } from '../useWishlist';

/** 3725 → "1h 02m 05s"; under an hour "02m 05s". */
export function formatLeft(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}h ${m}m ${r}s` : `${m}m ${r}s`;
}

/** Seconds since the list arrived, ticking once a second. */
function useElapsed(since: number) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, (now - since) / 1000);
}

function SaleBar({ sale, elapsed }: { sale: LiveFlashSale; elapsed: number }) {
  const left = sale.endsInSec - elapsed;
  const soldPct = sale.total ? ((sale.total - sale.left) / sale.total) * 100 : 0;
  return (
    <div className="cat:mb-2 cat:flex cat:flex-col cat:gap-1.5 cat:rounded-lg cat:bg-danger-soft cat:p-2.5 cat:text-xs">
      <div className="cat:flex cat:items-center cat:justify-between cat:gap-2 cat:font-semibold cat:text-danger">
        <span className="cat:inline-flex cat:items-center cat:gap-1">
          <Timer className="cat:size-3.5" aria-hidden />
          {left > 0 ? <span aria-label={`Ends in ${formatLeft(left)}`}>{formatLeft(left)}</span> : 'Ended'}
        </span>
        <span>{sale.left > 0 ? `${sale.left} of ${sale.total} left` : 'Sold out'}</span>
      </div>
      <div className="cat:h-1.5 cat:overflow-hidden cat:rounded-full cat:bg-white/70" aria-hidden>
        <div className="cat:h-full cat:rounded-full cat:bg-danger" style={{ width: `${soldPct}%` }} />
      </div>
      <p className="cat:text-ink-soft">Limit {sale.maxPerUser} per customer</p>
    </div>
  );
}

/** /deals: flash sales running now (Phase 2 P5). Inventory owns the sales. */
export function DealsPage() {
  const { add, pendingId } = useAddToCart();
  const wishlist = useWishlist();

  const sales = useQuery({
    queryKey: ['catalog', 'flash-sales'],
    queryFn: async ({ signal }) => ({ items: await flashSalesApi.list(signal) }),
    refetchInterval: 15_000, // units left change quickly during a sale
  });
  const ids = (sales.data?.items ?? []).map((s) => s.productId);
  const products = useQuery({
    queryKey: ['catalog', 'by-ids', ids],
    queryFn: ({ signal }) => productsApi.byIds(ids, signal),
    enabled: ids.length > 0,
    placeholderData: (prev) => prev,
  });
  // endsInSec was true when the list arrived; count down from then.
  const elapsed = useElapsed(sales.dataUpdatedAt);

  const header = <PageHeader title="Flash deals" subtitle="Limited stock, for a short time. When it's gone, it's gone." />;

  if (sales.isPending || (ids.length > 0 && products.isPending)) {
    return (
      <Container className="cat:pb-10">
        {header}
        <div className="cat:grid cat:grid-cols-2 cat:gap-3 cat:md:grid-cols-3 cat:xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="cat:aspect-[3/4] cat:w-full" />
          ))}
        </div>
      </Container>
    );
  }
  const error = sales.error ?? products.error;
  if (error) {
    const { message, reference } = describeError(error);
    return (
      <Container className="cat:pb-10">
        {header}
        <ErrorState title="We couldn't load the deals" text={message} reference={reference} onRetry={() => void sales.refetch()} />
      </Container>
    );
  }

  const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
  const live = (sales.data?.items ?? []).filter((s) => byId.has(s.productId));

  return (
    <Container className="cat:pb-10">
      {header}
      {live.length === 0 ? (
        <EmptyState
          icon={<Zap className="cat:size-7" aria-hidden />}
          title="No flash deals right now"
          text="Sales start without warning. Check back soon."
          action={
            <Link to={routes.products} className="cat:font-semibold cat:text-primary cat:hover:underline">
              Browse all products
            </Link>
          }
        />
      ) : (
        <ul className="cat:grid cat:grid-cols-2 cat:gap-3 cat:sm:gap-4 cat:md:grid-cols-3 cat:xl:grid-cols-4">
          {live.map((sale) => {
            const p = byId.get(sale.productId)!;
            return (
              <li key={sale.productId} className="cat:flex cat:flex-col">
                <SaleBar sale={sale} elapsed={elapsed} />
                <ProductCard
                  product={p}
                  onAdd={() => add(p)}
                  adding={pendingId === p.id}
                  saved={wishlist.has(p.id)}
                  onToggleSave={() => wishlist.toggle(p.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
