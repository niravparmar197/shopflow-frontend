import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { cartApi, type Product } from '@shopflow/api';
import { emit, routes, toast, toastError, useSession } from '@shopflow/shared';

/**
 * "Add to cart" from the catalog. The catalog does not know how the cart
 * remote works: it calls the API, then announces `cart-changed`, and the cart
 * remote (badge, page) reloads itself.
 */
export function useAddToCart() {
  const { status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const mutation = useMutation({
    mutationFn: ({ product, qty }: { product: Product; qty: number }) => cartApi.addItem(product.id, qty),
    onSuccess: (cart, { product, qty }) => {
      emit('cart-changed', { itemCount: cart.itemCount, source: 'catalog' });
      toast({
        kind: 'success',
        message: 'Added to your cart',
        detail: `${product.name}${qty > 1 ? ` × ${qty}` : ''}`,
        action: { label: 'View cart', href: routes.cart },
      });
    },
    // e.g. 400 "Cart can have at most 20 different items", 429, 503
    onError: toastError,
  });

  const add = (product: Product, qty = 1) => {
    if (status !== 'authenticated') {
      navigate(routes.login(location.pathname + location.search));
      return;
    }
    mutation.mutate({ product, qty });
  };

  return {
    add,
    /** id of the product being added right now (for its button spinner) */
    pendingId: mutation.isPending ? mutation.variables?.product.id : undefined,
  };
}
