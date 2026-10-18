import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { addressesApi, describeError, type Address } from '@shopflow/api';
import { toastError, useSession } from '@shopflow/shared';
import { Badge, Button, ErrorState, Skeleton, cx } from '@shopflow/ui';
import { addressLines, formatPhone } from '../format';
import { AddressForm } from './AddressForm';

/**
 * Step 1 of checkout: where to deliver. Picks the default address first; a
 * new address is saved to the address book (user service) and selected.
 */
export function AddressSection({ selected, onSelect }: { selected: Address | null; onSelect: (a: Address) => void }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = ['addresses', user?.id];
  const addresses = useQuery({ queryKey: key, queryFn: ({ signal }) => addressesApi.list(signal) });
  const [adding, setAdding] = useState(false);

  // First load: select the default (it is first in the list).
  const first = addresses.data?.[0];
  useEffect(() => {
    if (!selected && first) onSelect(first);
  }, [first, selected, onSelect]);

  const create = useMutation({
    mutationFn: addressesApi.create,
    onSuccess: (a) => {
      qc.setQueryData<Address[]>(key, (list = []) => [...list.map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a]);
      setAdding(false);
      onSelect(a);
    },
    onError: toastError,
  });

  const items = addresses.data ?? [];
  const showForm = adding || (addresses.isSuccess && items.length === 0);

  return (
    <section aria-labelledby="address-title" className="chk:rounded-card chk:border chk:border-line chk:bg-surface chk:p-5 chk:shadow-sm">
      <h2 id="address-title" className="chk:flex chk:items-center chk:gap-2 chk:text-xl chk:font-bold chk:text-ink">
        <MapPin className="chk:size-5 chk:text-primary" aria-hidden /> Delivery address
      </h2>

      {addresses.isPending ? (
        <Skeleton className="chk:mt-3 chk:h-24 chk:w-full" />
      ) : addresses.isError ? (
        <ErrorState title="We couldn't load your addresses" text={describeError(addresses.error).message} onRetry={() => void addresses.refetch()} />
      ) : (
        <>
          {items.length > 0 && (
            <fieldset className="chk:mt-3">
              <legend className="chk:sr-only">Choose a delivery address</legend>
              <div className="chk:flex chk:flex-col chk:gap-2">
                {items.map((a) => {
                  const checked = selected?.id === a.id;
                  return (
                    <label
                      key={a.id}
                      className={cx(
                        'chk:flex chk:cursor-pointer chk:gap-3 chk:rounded-lg chk:border chk:p-3 chk:text-sm',
                        checked ? 'chk:border-primary chk:bg-primary-soft/40' : 'chk:border-line chk:hover:bg-canvas',
                      )}
                    >
                      <input
                        type="radio"
                        name="delivery-address"
                        className="chk:mt-1 chk:accent-primary"
                        checked={checked}
                        onChange={() => onSelect(a)}
                      />
                      <span className="chk:min-w-0">
                        <span className="chk:flex chk:flex-wrap chk:items-center chk:gap-2 chk:font-semibold chk:text-ink">
                          {a.fullName} {a.isDefault && <Badge tone="info">Default</Badge>}
                        </span>
                        <span className="chk:block chk:text-ink-soft">{addressLines(a)}</span>
                        <span className="chk:block chk:text-muted">Phone {formatPhone(a.phone)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {showForm ? (
            <AddressForm
              initialName={user?.fullName ?? ''}
              saving={create.isPending}
              onSave={(input) => create.mutate(input)}
              onCancel={items.length > 0 ? () => setAdding(false) : undefined}
            />
          ) : (
            items.length < 10 && (
              <Button variant="ghost" size="sm" className="chk:mt-2" onClick={() => setAdding(true)}>
                <Plus className="chk:size-4" aria-hidden /> Add a new address
              </Button>
            )
          )}
        </>
      )}
    </section>
  );
}
