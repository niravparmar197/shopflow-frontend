import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Ban, PackageCheck, Truck } from 'lucide-react';
import { adminApi, type AdminOrder } from '@shopflow/api';
import { toast, toastError } from '@shopflow/shared';
import { Button, Input } from '@shopflow/ui';
import { card } from '../format';

/**
 * What an admin can do next, by status (the order service's state machine
 * decides; a stale page gets a 409 and reloads):
 *   PAID      → Ship (courier + tracking number) or Cancel (refund)
 *   SHIPPED   → Mark delivered
 *   PENDING / CONFIRMED → Cancel
 */
export function OrderActions({ order }: { order: AdminOrder }) {
  const qc = useQueryClient();
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const done = (message: string) => (updated: AdminOrder) => {
    qc.setQueryData(['admin', 'order', order.id], updated);
    void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    toast({ kind: 'success', message });
  };
  const failed = (err: unknown) => {
    void qc.invalidateQueries({ queryKey: ['admin', 'order', order.id] });
    toastError(err);
  };

  const ship = useMutation({
    mutationFn: () =>
      adminApi.orders.ship(order.id, {
        ...(carrier.trim() ? { carrier: carrier.trim() } : {}),
        ...(tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
      }),
    onSuccess: done('Marked as shipped; the customer gets an email'),
    onError: failed,
  });
  const deliver = useMutation({
    mutationFn: () => adminApi.orders.deliver(order.id),
    onSuccess: done('Marked as delivered'),
    onError: failed,
  });
  const cancel = useMutation({
    mutationFn: () => adminApi.orders.cancel(order.id),
    onSuccess: (o) => {
      setConfirmCancel(false);
      done(order.status === 'PAID' ? 'Cancelled; the payment is refunded automatically' : 'Cancelled')(o);
    },
    onError: failed,
  });

  const canShip = order.status === 'PAID';
  const canDeliver = order.status === 'SHIPPED';
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PAID';
  if (!canShip && !canDeliver && !canCancel) return null;

  const submitShip = (e: FormEvent) => {
    e.preventDefault();
    ship.mutate();
  };

  return (
    <section className={card} aria-labelledby="actions-title">
      <h2 id="actions-title" className="adm:text-lg adm:font-semibold">
        Next step
      </h2>

      {canShip && (
        <form onSubmit={submitShip} className="adm:mt-3 adm:flex adm:flex-col adm:gap-3">
          <Input label="Courier (optional)" placeholder="Delhivery, Blue Dart…" value={carrier} maxLength={50} onChange={(e) => setCarrier(e.target.value)} />
          <Input label="Tracking number (optional)" value={tracking} maxLength={60} onChange={(e) => setTracking(e.target.value)} />
          <Button type="submit" loading={ship.isPending}>
            <Truck className="adm:size-4" aria-hidden /> Mark as shipped
          </Button>
        </form>
      )}

      {canDeliver && (
        <div className="adm:mt-3">
          <p className="adm:mb-3 adm:text-sm adm:text-ink-soft">
            With {order.carrier ?? 'the courier'}
            {order.trackingNumber && <span className="adm:font-mono"> · {order.trackingNumber}</span>}
          </p>
          <Button loading={deliver.isPending} onClick={() => deliver.mutate()}>
            <PackageCheck className="adm:size-4" aria-hidden /> Mark as delivered
          </Button>
        </div>
      )}

      {canCancel &&
        (confirmCancel ? (
          <div className="adm:mt-4 adm:rounded-lg adm:border adm:border-danger/40 adm:bg-danger-soft adm:p-3 adm:text-sm" role="group" aria-label="Cancel this order?">
            <p className="adm:font-semibold">Cancel this order?</p>
            <p className="adm:text-ink-soft">
              {order.status === 'PAID' ? 'The customer is refunded automatically and gets an email.' : 'The customer gets an email.'} The stock goes back on sale.
            </p>
            <div className="adm:mt-2 adm:flex adm:gap-2">
              <Button variant="danger" size="sm" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                Yes, cancel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                Keep
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" size="sm" className="adm:mt-3" onClick={() => setConfirmCancel(true)}>
            <Ban className="adm:size-4" aria-hidden /> Cancel order
          </Button>
        ))}
    </section>
  );
}
