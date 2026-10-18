import { Link } from 'react-router';
import { ShoppingBag } from 'lucide-react';
import { routes } from '@shopflow/shared';
import { useCart } from './useCart';
import './remote.css';

/** Exposed as cart/CartBadge: the cart icon + item count in the shell header. */
export default function CartBadge() {
  const { data } = useCart();
  const count = data?.itemCount ?? 0;
  const label = count === 0 ? 'Cart' : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`;

  return (
    <Link
      to={routes.cart}
      aria-label={label}
      className="cart:relative cart:grid cart:size-10 cart:place-items-center cart:rounded-lg cart:text-ink-soft cart:hover:bg-primary-soft"
    >
      <ShoppingBag className="cart:size-5.5" aria-hidden />
      {count > 0 && (
        <span className="cart:absolute cart:top-1 cart:right-1 cart:grid cart:h-4.5 cart:min-w-4.5 cart:place-items-center cart:rounded-full cart:bg-primary cart:px-1 cart:text-[10px] cart:leading-none cart:font-bold cart:text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
