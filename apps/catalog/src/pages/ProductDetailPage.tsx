import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronRight, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { describeError, isApiError, productsApi, type Product } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Badge, Button, Container, EmptyState, ErrorState, Price, QuantityStepper, Skeleton } from '@shopflow/ui';
import { categoryLabel } from '../categories';
import { ProductImage } from '../components/ProductImage';
import { useAddToCart } from '../useAddToCart';

const KNOWN_LABELS: Record<string, string> = { ram: 'RAM', ssd: 'SSD', cpu: 'CPU', gpu: 'GPU', os: 'OS' };

/** "ram" → "RAM", "batteryLife" → "Battery life" */
const attributeLabel = (key: string) =>
  KNOWN_LABELS[key.toLowerCase()] ??
  (key.charAt(0).toUpperCase() + key.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (c) => c.toUpperCase()));

function Gallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const images = product.images;
  return (
    <div className="cat:flex cat:flex-col cat:gap-3">
      <ProductImage src={images[index]} alt={product.name} className="cat:aspect-square cat:rounded-card cat:border cat:border-line" />
      {images.length > 1 && (
        <div className="cat:grid cat:grid-cols-5 cat:gap-2" role="group" aria-label="Product photos">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === index}
              className={`cat:cursor-pointer cat:overflow-hidden cat:rounded-lg cat:border-2 ${i === index ? 'cat:border-primary' : 'cat:border-transparent cat:hover:border-line'}`}
            >
              <ProductImage src={src} alt="" className="cat:aspect-square" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const [qty, setQty] = useState(1);
  const { add, pendingId } = useAddToCart();

  const query = useQuery({
    queryKey: ['catalog', 'product', slug],
    queryFn: ({ signal }) => productsApi.get(slug, signal),
  });

  if (query.isPending) {
    return (
      <Container className="cat:grid cat:gap-8 cat:py-8 cat:md:grid-cols-2">
        <Skeleton className="cat:aspect-square cat:w-full" />
        <div className="cat:flex cat:flex-col cat:gap-4">
          <Skeleton className="cat:h-4 cat:w-24" />
          <Skeleton className="cat:h-8 cat:w-3/4" />
          <Skeleton className="cat:h-8 cat:w-32" />
          <Skeleton className="cat:h-24 cat:w-full" />
        </div>
      </Container>
    );
  }

  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) {
      return (
        <Container>
          <EmptyState
            title="Product not found"
            text="It may have been removed. Have a look at similar products."
            action={
              <Link to={routes.products} className="cat:font-semibold cat:text-primary cat:hover:underline">
                Browse all products
              </Link>
            }
          />
        </Container>
      );
    }
    const { message, reference } = describeError(query.error);
    return (
      <Container>
        <ErrorState title="We couldn't load this product" text={message} reference={reference} onRetry={() => void query.refetch()} />
      </Container>
    );
  }

  const product = query.data;
  const attributes = Object.entries(product.attributes ?? {});

  return (
    <Container className="cat:py-6">
      <nav aria-label="Breadcrumb" className="cat:mb-6 cat:flex cat:flex-wrap cat:items-center cat:gap-1 cat:text-sm cat:text-muted">
        <Link to={routes.home} className="cat:hover:text-ink">Home</Link>
        <ChevronRight className="cat:size-4" aria-hidden />
        <Link to={`${routes.products}?category=${encodeURIComponent(product.category)}`} className="cat:hover:text-ink">
          {categoryLabel(product.category)}
        </Link>
        <ChevronRight className="cat:size-4" aria-hidden />
        <span aria-current="page" className="cat:truncate cat:font-medium cat:text-ink">{product.name}</span>
      </nav>

      <div className="cat:grid cat:gap-8 cat:md:grid-cols-2 cat:lg:gap-12">
        <Gallery product={product} />

        <div className="cat:flex cat:flex-col cat:gap-5">
          <div>
            <Badge tone="primary">{categoryLabel(product.category)}</Badge>
            <h1 className="cat:mt-3 cat:text-2xl cat:font-bold cat:tracking-tight cat:text-ink cat:sm:text-3xl">{product.name}</h1>
          </div>

          <Price paise={product.pricePaise} className="cat:text-3xl cat:font-bold cat:text-ink" />

          {product.description && <p className="cat:leading-relaxed cat:text-ink-soft">{product.description}</p>}

          <div className="cat:flex cat:flex-wrap cat:items-center cat:gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={10} />
            <Button size="lg" className="cat:flex-1 cat:sm:flex-none" onClick={() => add(product, qty)} loading={pendingId === product.id}>
              {pendingId !== product.id && <ShoppingCart className="cat:size-5" aria-hidden />}
              Add to cart
            </Button>
          </div>

          <ul className="cat:grid cat:gap-2 cat:rounded-card cat:border cat:border-line cat:bg-surface cat:p-4 cat:text-sm cat:text-ink-soft">
            <li className="cat:flex cat:items-center cat:gap-2">
              <Truck className="cat:size-4 cat:text-primary" aria-hidden /> Free delivery across India
            </li>
            <li className="cat:flex cat:items-center cat:gap-2">
              <ShieldCheck className="cat:size-4 cat:text-primary" aria-hidden /> Secure payment, refunds handled automatically
            </li>
          </ul>

          {attributes.length > 0 && (
            <section aria-labelledby="specs">
              <h2 id="specs" className="cat:mb-3 cat:text-lg cat:font-semibold cat:text-ink">Specifications</h2>
              <dl className="cat:divide-y cat:divide-line cat:overflow-hidden cat:rounded-card cat:border cat:border-line cat:bg-surface">
                {attributes.map(([key, value]) => (
                  <div key={key} className="cat:grid cat:grid-cols-3 cat:gap-4 cat:px-4 cat:py-3 cat:text-sm">
                    <dt className="cat:text-muted">{attributeLabel(key)}</dt>
                    <dd className="cat:col-span-2 cat:font-medium cat:text-ink">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </Container>
  );
}
