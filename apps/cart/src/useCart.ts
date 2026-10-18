import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi, describeError, type Cart } from '@shopflow/api';
import { emit, toast, useSession, useShopFlowEvent } from '@shopflow/shared';

// Per user, so a different login never sees the old cart.
const cartKey = (userId: string | undefined) => ['cart', userId ?? 'guest'] as const;

/** The cart (GET /v1/cart). Reloads when ANOTHER app says the cart changed. */
export function useCart() {
  const { status, user } = useSession();
  const queryClient = useQueryClient();

  useShopFlowEvent('cart-changed', (detail) => {
    if (detail.source !== 'cart') void queryClient.invalidateQueries({ queryKey: ['cart'] });
  });

  return useQuery({
    queryKey: cartKey(user?.id),
    queryFn: ({ signal }) => cartApi.get(signal),
    enabled: status === 'authenticated',
  });
}

/**
 * A cart write (update qty, remove, coupon). Every write returns the new cart:
 * put it in the cache, then tell the other apps.
 */
export function useCartAction<V>(
  action: (vars: V) => Promise<Cart>,
  options: { toastErrors?: boolean } = {},
) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: action,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey(user?.id), cart);
      emit('cart-changed', { itemCount: cart.itemCount, source: 'cart' });
    },
    onError: (err) => {
      if (options.toastErrors !== false) toast({ kind: 'error', message: describeError(err).message });
      void queryClient.invalidateQueries({ queryKey: ['cart'] }); // show the real state again
    },
  });
}
