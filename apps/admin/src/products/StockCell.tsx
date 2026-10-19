import { useQuery } from '@tanstack/react-query';
import { adminApi, isApiError } from '@shopflow/api';

/** Available / reserved units for one product ("No stock" = never set = 0). */
export function StockCell({ productId }: { productId: string }) {
  const q = useQuery({
    queryKey: ['admin', 'stock', productId],
    queryFn: ({ signal }) => adminApi.stock.get(productId, signal),
    retry: false,
  });
  if (q.isPending) return <span className="adm:text-muted">…</span>;
  if (q.isError) {
    return isApiError(q.error) && q.error.status === 404 ? (
      <span className="adm:font-semibold adm:text-danger">No stock</span>
    ) : (
      <span className="adm:text-muted">?</span>
    );
  }
  const { available, reserved } = q.data;
  return (
    <span className={available === 0 ? 'adm:font-semibold adm:text-danger' : 'adm:text-ink'}>
      {available}
      {reserved > 0 && <span className="adm:text-muted"> (+{reserved} reserved)</span>}
    </span>
  );
}
