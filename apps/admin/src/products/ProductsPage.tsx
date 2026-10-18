import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { describeError, productsApi } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Button, EmptyState, ErrorState, PageHeader, Price, Skeleton } from '@shopflow/ui';
import { linkButton, textLink } from '../format';
import { StockCell } from './StockCell';

/** All products (newest first), searchable, with live stock per row. */
export function ProductsPage() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['admin', 'products', term],
    queryFn: ({ pageParam, signal }) =>
      productsApi.list({ q: term || undefined, cursor: pageParam, limit: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const search = (e: FormEvent) => {
    e.preventDefault();
    setTerm(q.trim());
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Add products, set prices, images and stock."
        actions={
          <Link to={routes.adminNewProduct} className={linkButton}>
            <Plus className="adm:size-4" aria-hidden /> New product
          </Link>
        }
      />
      <form role="search" onSubmit={search} className="adm:mb-4 adm:flex adm:max-w-md adm:gap-2">
        <label htmlFor="admin-product-search" className="adm:sr-only">
          Search products
        </label>
        <input
          id="admin-product-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name"
          className="adm:h-10 adm:w-full adm:rounded-lg adm:border adm:border-line adm:bg-surface adm:px-3 adm:text-sm adm:outline-none adm:focus:border-primary"
        />
        <Button type="submit" variant="secondary" aria-label="Search">
          <Search className="adm:size-4" aria-hidden />
        </Button>
      </form>

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
        <EmptyState
          title={term ? `No products for "${term}"` : 'No products yet'}
          text="Add the first one with New product."
        />
      ) : (
        <div className="adm:overflow-x-auto adm:rounded-card adm:border adm:border-line adm:bg-surface adm:shadow-sm">
          <table className="adm:w-full adm:text-left adm:text-sm">
            <thead className="adm:border-b adm:border-line adm:bg-canvas adm:text-xs adm:uppercase adm:text-muted">
              <tr>
                <th scope="col" className="adm:px-4 adm:py-3">Product</th>
                <th scope="col" className="adm:hidden adm:px-4 adm:py-3 adm:sm:table-cell">Category</th>
                <th scope="col" className="adm:px-4 adm:py-3 adm:text-right">Price</th>
                <th scope="col" className="adm:px-4 adm:py-3 adm:text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="adm:divide-y adm:divide-line">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="adm:px-4 adm:py-3">
                    <Link to={routes.adminProduct(p.id)} className={textLink}>
                      {p.name}
                    </Link>
                    <p className="adm:text-xs adm:text-muted adm:capitalize adm:sm:hidden">{p.category}</p>
                    <p className="adm:hidden adm:text-xs adm:text-muted adm:sm:block">{p.slug}</p>
                  </td>
                  <td className="adm:hidden adm:px-4 adm:py-3 adm:capitalize adm:sm:table-cell">{p.category}</td>
                  <td className="adm:px-4 adm:py-3 adm:text-right">
                    <Price paise={p.pricePaise} />
                  </td>
                  <td className="adm:px-4 adm:py-3 adm:text-right">
                    <StockCell productId={p.id} />
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
