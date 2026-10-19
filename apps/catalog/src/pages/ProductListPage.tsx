import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, X } from 'lucide-react';
import { describeError, productsApi } from '@shopflow/api';
import { Button, Container, EmptyState, ErrorState, Skeleton } from '@shopflow/ui';
import { categoryLabel } from '../categories';
import { FilterPanel } from '../components/FilterPanel';
import { ProductCard } from '../components/ProductCard';
import { hasFilters, readFilters, SORT_OPTIONS, toQuery, writeFilters, type Filters } from '../filters';
import { useAddToCart } from '../useAddToCart';
import { useWishlist } from '../useWishlist';

const PAGE_SIZE = 12;

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="cat:inline-flex cat:items-center cat:gap-1 cat:rounded-full cat:bg-primary-soft cat:py-1 cat:pr-1 cat:pl-3 cat:text-xs cat:font-semibold cat:text-primary">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="cat:grid cat:size-5 cat:cursor-pointer cat:place-items-center cat:rounded-full cat:hover:bg-primary/15">
        <X className="cat:size-3.5" aria-hidden />
      </button>
    </span>
  );
}

function GridSkeleton() {
  return (
    <div className="cat:grid cat:grid-cols-2 cat:gap-3 cat:sm:gap-4 cat:md:grid-cols-3 cat:xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="cat:flex cat:flex-col cat:gap-3 cat:rounded-card cat:border cat:border-line cat:bg-surface cat:p-3">
          <Skeleton className="cat:aspect-square cat:w-full" />
          <Skeleton className="cat:h-3 cat:w-1/3" />
          <Skeleton className="cat:h-4 cat:w-4/5" />
          <Skeleton className="cat:h-6 cat:w-1/2" />
          <Skeleton className="cat:h-10 cat:w-full" />
        </div>
      ))}
    </div>
  );
}

export function ProductListPage({ showHero = false }: { showHero?: boolean }) {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [showFilters, setShowFilters] = useState(false);
  const { add, pendingId } = useAddToCart();
  const wishlist = useWishlist();

  const query = useInfiniteQuery({
    queryKey: ['catalog', 'products', toQuery(filters)],
    queryFn: ({ pageParam, signal }) => productsApi.list({ ...toQuery(filters), cursor: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const setFilters = (next: Filters) => {
    setParams(writeFilters(next));
    setShowFilters(false);
  };
  // Clearing filters keeps the chosen order.
  const clear = () => setFilters({ q: '', category: '', min: '', max: '', sort: filters.sort });

  const products = query.data?.pages.flatMap((p) => p.items) ?? [];
  const title = filters.q ? `Results for “${filters.q}”` : filters.category ? categoryLabel(filters.category) : 'All products';

  return (
    <Container className="cat:py-6">
      {showHero && !hasFilters(filters) && (
        <section className="cat:mb-8 cat:overflow-hidden cat:rounded-card cat:bg-primary cat:px-6 cat:py-8 cat:text-white cat:sm:px-10 cat:sm:py-12">
          <p className="cat:text-sm cat:font-semibold cat:text-white/80">Free delivery across India</p>
          <h1 className="cat:mt-2 cat:max-w-xl cat:text-3xl cat:font-bold cat:tracking-tight cat:sm:text-4xl">Phones, laptops and more, delivered fast.</h1>
          <p className="cat:mt-3 cat:max-w-lg cat:text-white/85">Pay safely, track every order step by step.</p>
        </section>
      )}

      <div className="cat:flex cat:flex-col cat:gap-6 cat:lg:flex-row cat:lg:gap-8">
        {/* ONE panel: a sidebar on large screens, a toggled box on small ones. */}
        <aside
          id="catalog-filters"
          aria-label="Filters"
          className={`cat:shrink-0 cat:rounded-card cat:border cat:border-line cat:bg-surface cat:p-4 cat:lg:block cat:lg:w-56 cat:lg:self-start cat:lg:border-0 cat:lg:bg-transparent cat:lg:p-0 ${
            showFilters ? 'cat:block cat:order-first' : 'cat:hidden'
          }`}
        >
          <FilterPanel key={params.toString()} filters={filters} onChange={setFilters} />
        </aside>

        <div className="cat:min-w-0 cat:flex-1">
          <div className="cat:mb-4 cat:flex cat:flex-wrap cat:items-center cat:justify-between cat:gap-3">
            <div>
              {showHero && !hasFilters(filters) ? (
                <h2 className="cat:text-xl cat:font-bold cat:text-ink">{title}</h2>
              ) : (
                <h1 className="cat:text-xl cat:font-bold cat:text-ink cat:sm:text-2xl">{title}</h1>
              )}
            </div>
            <div className="cat:flex cat:items-center cat:gap-2">
              <label className="cat:flex cat:items-center cat:gap-2 cat:text-sm cat:text-muted">
                <span className="cat:hidden cat:sm:inline">Sort by</span>
                <select
                  aria-label="Sort products"
                  value={filters.sort}
                  onChange={(e) => setParams(writeFilters({ ...filters, sort: e.target.value as Filters['sort'] }))}
                  className="cat:h-8 cat:cursor-pointer cat:rounded-lg cat:border cat:border-line cat:bg-surface cat:px-2 cat:text-sm cat:font-medium cat:text-ink cat:outline-none cat:focus:border-primary cat:focus:ring-2 cat:focus:ring-primary/20"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="secondary" size="sm" className="cat:lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="catalog-filters">
                <SlidersHorizontal className="cat:size-4" aria-hidden /> Filters
              </Button>
            </div>
          </div>

          {hasFilters(filters) && (
            <div className="cat:mb-4 cat:flex cat:flex-wrap cat:items-center cat:gap-2">
              {filters.q && <Chip label={`“${filters.q}”`} onRemove={() => setFilters({ ...filters, q: '' })} />}
              {filters.category && <Chip label={categoryLabel(filters.category)} onRemove={() => setFilters({ ...filters, category: '' })} />}
              {(filters.min || filters.max) && (
                <Chip label={`₹${filters.min || '0'} – ${filters.max ? `₹${filters.max}` : 'any'}`} onRemove={() => setFilters({ ...filters, min: '', max: '' })} />
              )}
              <button type="button" onClick={clear} className="cat:cursor-pointer cat:text-xs cat:font-semibold cat:text-muted cat:hover:text-ink">
                Clear all
              </button>
            </div>
          )}

          {query.isPending ? (
            <GridSkeleton />
          ) : query.isError ? (
            <ErrorState
              title="We couldn't load products"
              text={describeError(query.error).message}
              reference={describeError(query.error).reference}
              onRetry={() => void query.refetch()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              title={filters.q ? `No products found for “${filters.q}”` : 'No products found'}
              text="Try a different search or remove a filter."
              action={hasFilters(filters) ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : undefined}
            />
          ) : (
            <>
              <ul className="cat:grid cat:grid-cols-2 cat:gap-3 cat:sm:gap-4 cat:md:grid-cols-3 cat:xl:grid-cols-4">
                {products.map((p) => (
                  <li key={p.id} className="cat:flex">
                    <ProductCard
                      product={p}
                      onAdd={() => add(p)}
                      adding={pendingId === p.id}
                      saved={wishlist.has(p.id)}
                      onToggleSave={() => wishlist.toggle(p.id)}
                    />
                  </li>
                ))}
              </ul>
              <div className="cat:mt-8 cat:flex cat:flex-col cat:items-center cat:gap-2">
                {query.hasNextPage ? (
                  <Button variant="secondary" onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>
                    Load more
                  </Button>
                ) : (
                  <p className="cat:text-sm cat:text-muted">You have seen all {products.length} products</p>
                )}
                {query.isFetchNextPageError && <p className="cat:text-sm cat:text-danger">Could not load more. Try again.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
