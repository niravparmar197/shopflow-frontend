import { Link } from 'react-router';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@shopflow/api';
import { routes } from '@shopflow/shared';
import { Button, Price } from '@shopflow/ui';
import { categoryLabel } from '../categories';
import { ProductImage } from './ProductImage';

export function ProductCard({ product, onAdd, adding }: { product: Product; onAdd: () => void; adding: boolean }) {
  return (
    <article className="cat:group cat:flex cat:w-full cat:min-w-0 cat:flex-col cat:rounded-card cat:border cat:border-line cat:bg-surface cat:p-3 cat:shadow-sm cat:transition cat:hover:-translate-y-0.5 cat:hover:border-primary/40 cat:hover:shadow-md">
      {/* The image and name are one link; the button is separate (no nested controls). */}
      <Link to={routes.product(product.slug)} className="cat:flex cat:flex-1 cat:flex-col cat:gap-3 cat:rounded-lg cat:focus-visible:outline-2 cat:focus-visible:outline-primary">
        {/* alt="": the name is already the link text below; it would be read twice. */}
        <ProductImage src={product.images[0]} alt="" className="cat:aspect-square" />
        <div className="cat:flex cat:flex-1 cat:flex-col cat:gap-1 cat:px-1">
          <span className="cat:text-[11px] cat:font-semibold cat:tracking-wider cat:text-muted cat:uppercase">
            {categoryLabel(product.category)}
          </span>
          <h3 className="cat:line-clamp-2 cat:text-sm cat:font-semibold cat:text-ink cat:group-hover:text-primary">{product.name}</h3>
          <Price paise={product.pricePaise} className="cat:mt-auto cat:pt-1 cat:text-lg cat:font-bold cat:text-ink" />
        </div>
      </Link>
      <Button className="cat:mt-3" fullWidth onClick={onAdd} loading={adding} aria-label={`Add to cart: ${product.name}`}>
        {!adding && <ShoppingCart className="cat:size-4" aria-hidden />}
        Add to cart
      </Button>
    </article>
  );
}
