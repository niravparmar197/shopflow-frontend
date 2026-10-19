import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Zap } from 'lucide-react';
import { adminApi, isApiError } from '@shopflow/api';
import { toast, toastError } from '@shopflow/shared';
import { Button, Input, Spinner } from '@shopflow/ui';
import { card } from '../format';

const minutes = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min` : `${Math.max(1, Math.round(sec / 60))} min`);

/** Start or end a flash sale: units move from stock into the sale and back. */
export function FlashSalePanel({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const key = ['admin', 'flash', productId];
  const sale = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      adminApi.flashSales.status(productId, signal).catch((err: unknown) => {
        if (isApiError(err) && err.status === 404) return { productId, active: false as const };
        throw err;
      }),
    refetchInterval: (q) => (q.state.data?.active ? 10_000 : false),
  });
  const [qty, setQty] = useState('');
  const [duration, setDuration] = useState('60');
  const [errors, setErrors] = useState<{ qty?: string; duration?: string }>({});

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ['admin', 'stock', productId] });
  };
  const start = useMutation({
    mutationFn: ({ q, d }: { q: number; d: number }) => adminApi.flashSales.start(productId, q, d),
    onSuccess: () => {
      refresh();
      setQty('');
      toast({ kind: 'success', message: 'Flash sale started' });
    },
    onError: toastError,
  });
  const end = useMutation({
    mutationFn: () => adminApi.flashSales.end(productId),
    onSuccess: () => {
      refresh();
      toast({ kind: 'info', message: 'Flash sale ended; unsold units are back in stock' });
    },
    onError: toastError,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = Number(qty);
    const d = Number(duration);
    const next = {
      qty: Number.isInteger(q) && q >= 1 ? undefined : 'At least 1 unit',
      duration: Number.isInteger(d) && d >= 1 && d <= 1440 ? undefined : '1 to 1440 minutes',
    };
    setErrors(next);
    if (!next.qty && !next.duration) start.mutate({ q, d });
  };

  return (
    <section className={card} aria-labelledby="flash-title">
      <h2 id="flash-title" className="adm:flex adm:items-center adm:gap-2 adm:text-lg adm:font-semibold">
        <Zap className="adm:size-4 adm:text-warning" aria-hidden /> Flash sale
      </h2>
      {sale.isPending ? (
        <Spinner label="Loading flash sale" />
      ) : sale.isError ? (
        <p className="adm:mt-2 adm:text-sm adm:text-muted">Flash sales are not available right now.</p>
      ) : sale.data.active ? (
        <div className="adm:mt-2 adm:text-sm">
          <p>
            <span className="adm:font-semibold">{sale.data.left}</span> of {sale.data.total} left · {sale.data.buyers} buyers · ends in{' '}
            {minutes(sale.data.endsInSec)}
          </p>
          <Button variant="danger" className="adm:mt-3" loading={end.isPending} onClick={() => end.mutate()}>
            End sale now
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="adm:mt-3 adm:grid adm:gap-3 adm:sm:grid-cols-3 adm:sm:items-start">
          <Input label="Units for the sale" inputMode="numeric" value={qty} error={errors.qty} onChange={(e) => setQty(e.target.value)} />
          <Input
            label="Duration (minutes)"
            inputMode="numeric"
            value={duration}
            error={errors.duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <Button type="submit" variant="secondary" className="adm:sm:mt-6" loading={start.isPending}>
            Start sale
          </Button>
        </form>
      )}
    </section>
  );
}
