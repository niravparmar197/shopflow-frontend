import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { wishlistApi, type WishlistItem } from '@shopflow/api';
import { routes, toast, toastError, useSession } from '@shopflow/shared';

/**
 * The user's saved products (ids). One query, shared by every heart on the
 * page; a click updates it at once (optimistic) and rolls back on error.
 */
export function useWishlist() {
  const { status, user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const key = ['wishlist', user?.id];

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => wishlistApi.list(signal),
    enabled: status === 'authenticated',
  });
  const ids = new Set((query.data ?? []).map((i) => i.productId));

  const toggle = useMutation({
    mutationFn: ({ productId, save }: { productId: string; save: boolean }) =>
      save ? wishlistApi.add(productId) : wishlistApi.remove(productId),
    onMutate: async ({ productId, save }) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<WishlistItem[]>(key);
      client.setQueryData<WishlistItem[]>(key, (items = []) =>
        save ? [{ productId, createdAt: new Date().toISOString() }, ...items] : items.filter((i) => i.productId !== productId),
      );
      return { before };
    },
    onError: (err, _vars, ctx) => {
      client.setQueryData(key, ctx?.before);
      toastError(err);
    },
    onSuccess: (_res, { save }) =>
      toast({
        kind: 'success',
        message: save ? 'Saved to your wishlist' : 'Removed from your wishlist',
        ...(save ? { action: { label: 'View wishlist', href: routes.wishlist } } : {}),
      }),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  return {
    ids,
    items: query.data,
    loading: status === 'authenticated' && query.isPending,
    error: query.error,
    has: (productId: string) => ids.has(productId),
    toggle: (productId: string) => {
      if (status !== 'authenticated') {
        navigate(routes.login(location.pathname + location.search));
        return;
      }
      toggle.mutate({ productId, save: !ids.has(productId) });
    },
  };
}
