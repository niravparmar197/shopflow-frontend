import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import { describeError, productsApi } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Container, EmptyState, ErrorState, PageHeader, Skeleton } from '@shopflow/ui';
import { ProductCard } from '../components/ProductCard';
import { useAddToCart } from '../useAddToCart';
import { useWishlist } from '../useWishlist';

/** /wishlist: the products you saved, newest first (Phase 2 P5). */
export function WishlistPage() {
  const wishlist = useWishlist();
  const { add, pendingId } = useAddToCart();
  // The ids come from the user service, the products from the catalog.
  const ids = (wishlist.items ?? []).map((i) => i.productId);
  const products = useQuery({
    queryKey: ['catalog', 'by-ids', ids],
    queryFn: ({ signal }) => productsApi.byIds(ids.slice(0, 50), signal),
    enabled: wishlist.items !== undefined,
    placeholderData: (prev) => prev, // no flash of skeletons when one is removed
  });

  const shell = (body: React.ReactNode, count?: number) => (
    <Container className="cat:pb-10">
      <PageHeader
        title="Your wishlist"
        subtitle={count === undefined ? 'Products you saved for later' : `${count} saved ${count === 1 ? 'product' : 'products'}`}
      />
      {body}
    </Container>
  );

  if (wishlist.loading || (wishlist.items && products.isPending)) {
    return shell(
      <div className="cat:grid cat:grid-cols-2 cat:gap-3 cat:md:grid-cols-3 cat:xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="cat:aspect-[3/4] cat:w-full" />
        ))}
      </div>,
    );
  }
  const error = wishlist.error ?? products.error;
  if (error) {
    const { message, reference } = describeError(error);
    return shell(<ErrorState title="We couldn't load your wishlist" text={message} reference={reference} onRetry={() => void products.refetch()} />);
  }

  // Saved products that are still for sale, in the order they were saved.
  const shown = (products.data ?? []).filter((p) => wishlist.has(p.id));
  if (shown.length === 0) {
    return shell(
      <EmptyState
        icon={<Heart className="cat:size-7" aria-hidden />}
        title="Your wishlist is empty"
        text="Tap the heart on any product to save it here."
        action={
          <Link to={routes.products} className="cat:rounded-lg cat:bg-primary cat:px-5 cat:py-2.5 cat:text-sm cat:font-semibold cat:text-white cat:hover:bg-primary-hover">
            Browse products
          </Link>
        }
      />,
      0,
    );
  }

  return shell(
    <ul className="cat:grid cat:grid-cols-2 cat:gap-3 cat:sm:gap-4 cat:md:grid-cols-3 cat:xl:grid-cols-4">
      {shown.map((p) => (
        <li key={p.id} className="cat:flex">
          <ProductCard product={p} onAdd={() => add(p)} adding={pendingId === p.id} saved onToggleSave={() => wishlist.toggle(p.id)} />
        </li>
      ))}
    </ul>,
    shown.length,
  );
}
