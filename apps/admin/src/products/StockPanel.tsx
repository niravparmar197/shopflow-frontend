import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { adminApi, isApiError } from '@shopflow/api';
import { toast, toastError } from '@shopflow/shared';
import { Button, Input, Spinner } from '@shopflow/ui';
import { card } from '../format';

/** Units for sale. "Reserved" = held by orders waiting for payment. */
export function StockPanel({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const key = ['admin', 'stock', productId];
  const stock = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => adminApi.stock.get(productId, signal),
    retry: false,
  });
  const missing = stock.isError && isApiError(stock.error) && stock.error.status === 404;
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const save = useMutation({
    mutationFn: (available: number) => adminApi.stock.set(productId, available),
    onSuccess: (s) => {
      qc.setQueryData(key, s);
      setValue('');
      toast({ kind: 'success', message: `Stock set to ${s.available}` });
    },
    onError: toastError,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return setError('A whole number from 0 to 1,000,000');
    setError(undefined);
    save.mutate(n);
  };

  return (
    <section className={card} aria-labelledby="stock-title">
      <h2 id="stock-title" className="adm:text-lg adm:font-semibold">
        Stock
      </h2>
      <div className="adm:mt-2 adm:text-sm">
        {stock.isPending ? (
          <Spinner label="Loading stock" />
        ) : missing ? (
          <p className="adm:text-danger">No stock yet: orders for this product are cancelled as "out of stock".</p>
        ) : stock.isError ? (
          <p className="adm:text-muted">Stock is not available right now.</p>
        ) : (
          <p>
            <span className="adm:text-2xl adm:font-bold">{stock.data.available}</span> available
            {stock.data.reserved > 0 && <span className="adm:text-muted"> · {stock.data.reserved} reserved</span>}
          </p>
        )}
      </div>
      <form onSubmit={submit} noValidate className="adm:mt-3 adm:flex adm:items-start adm:gap-2">
        <div className="adm:w-40">
          <Input label="Set available to" inputMode="numeric" value={value} error={error} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" className="adm:mt-6" loading={save.isPending}>
          Save
        </Button>
      </form>
    </section>
  );
}
