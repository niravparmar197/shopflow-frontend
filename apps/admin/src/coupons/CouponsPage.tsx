import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { adminApi, describeError, type Coupon, type CouponType } from '@shopflow/api';
import { toast, toastError } from '@shopflow/shared';
import { Badge, Button, ErrorState, Input, PageHeader, Price, Skeleton, formatDate } from '@shopflow/ui';
import { card, field, rupeesToPaise } from '../format';

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function describeCoupon(c: Coupon) {
  return c.type === 'PERCENT' ? `${c.value}% off` : null;
}

/** Create coupons and see how often they were used. */
export function CouponsPage() {
  const qc = useQueryClient();
  const coupons = useQuery({ queryKey: ['admin', 'coupons'], queryFn: ({ signal }) => adminApi.coupons.list(signal) });
  // "Now" once per render of the list, from the query's fetch time (pure).
  const now = coupons.dataUpdatedAt;

  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('PERCENT');
  const [value, setValue] = useState('10');
  const [minCart, setMinCart] = useState('');
  const [limit, setLimit] = useState('');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(inDays(30));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const create = useMutation({
    mutationFn: adminApi.coupons.create,
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setCode('');
      toast({ kind: 'success', message: `Coupon ${c.code} created` });
    },
    onError: toastError, // 409: the code exists; 400: e.g. more than 90% off
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = type === 'PERCENT' ? Number(value) : rupeesToPaise(value);
    const minCartPaise = minCart ? rupeesToPaise(minCart) : 0;
    const usageLimit = limit ? Number(limit) : undefined;
    const next = {
      code: /^[A-Za-z0-9]{4,20}$/.test(code) ? undefined : '4-20 letters or digits',
      value:
        type === 'PERCENT'
          ? Number.isInteger(amount) && amount >= 1 && amount <= 90
            ? undefined
            : '1 to 90 (%)'
          : amount >= 100
            ? undefined
            : 'At least ₹1',
      minCart: Number.isNaN(minCartPaise) ? 'A price in rupees' : undefined,
      limit: usageLimit === undefined || (Number.isInteger(usageLimit) && usageLimit >= 1) ? undefined : 'At least 1, or empty',
      to: to > from ? undefined : 'Must be after the start date',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    create.mutate({
      code: code.toUpperCase(),
      type,
      value: amount,
      minCartPaise,
      usageLimit,
      validFrom: new Date(`${from}T00:00:00`).toISOString(),
      validTo: new Date(`${to}T23:59:59`).toISOString(),
    });
  };

  return (
    <>
      <PageHeader title="Coupons" subtitle="Codes customers type in the cart." />
      <div className="adm:grid adm:gap-6 adm:lg:grid-cols-[1fr_2fr]">
        <section className={card} aria-labelledby="new-coupon-title">
          <h2 id="new-coupon-title" className="adm:text-lg adm:font-semibold">
            New coupon
          </h2>
          <form onSubmit={submit} noValidate className="adm:mt-3 adm:flex adm:flex-col adm:gap-3">
            <Input label="Code" value={code} error={errors.code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <div className="adm:flex adm:flex-col adm:gap-1.5">
              <label htmlFor="coupon-type" className="adm:text-sm adm:font-medium">
                Type
              </label>
              <select id="coupon-type" value={type} onChange={(e) => setType(e.target.value as CouponType)} className={field}>
                <option value="PERCENT">Percent off</option>
                <option value="FLAT">Flat amount off (₹)</option>
              </select>
            </div>
            <Input
              label={type === 'PERCENT' ? 'Percent off' : 'Amount off (₹)'}
              inputMode="decimal"
              value={value}
              error={errors.value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Input label="Minimum cart (₹, optional)" inputMode="decimal" value={minCart} error={errors.minCart} onChange={(e) => setMinCart(e.target.value)} />
            <Input label="Max uses (optional)" inputMode="numeric" value={limit} error={errors.limit} onChange={(e) => setLimit(e.target.value)} />
            <div className="adm:grid adm:grid-cols-2 adm:gap-3">
              <Input label="Valid from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label="Valid to" type="date" value={to} error={errors.to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button type="submit" loading={create.isPending}>
              Create coupon
            </Button>
          </form>
        </section>

        <section aria-labelledby="coupons-title">
          <h2 id="coupons-title" className="adm:sr-only">
            All coupons
          </h2>
          {coupons.isPending ? (
            <Skeleton className="adm:h-40 adm:w-full" />
          ) : coupons.isError ? (
            <ErrorState
              text={describeError(coupons.error).message}
              reference={describeError(coupons.error).reference}
              onRetry={() => void coupons.refetch()}
            />
          ) : coupons.data.length === 0 ? (
            <p className="adm:text-sm adm:text-muted">No coupons yet.</p>
          ) : (
            <div className="adm:overflow-x-auto adm:rounded-card adm:border adm:border-line adm:bg-surface adm:shadow-sm">
              <table className="adm:w-full adm:text-left adm:text-sm">
                <thead className="adm:border-b adm:border-line adm:bg-canvas adm:text-xs adm:uppercase adm:text-muted">
                  <tr>
                    <th scope="col" className="adm:px-4 adm:py-3">Code</th>
                    <th scope="col" className="adm:px-4 adm:py-3">Discount</th>
                    <th scope="col" className="adm:px-4 adm:py-3">Valid</th>
                    <th scope="col" className="adm:px-4 adm:py-3 adm:text-right">Used</th>
                  </tr>
                </thead>
                <tbody className="adm:divide-y adm:divide-line">
                  {coupons.data.map((c) => {
                    const expired = Date.parse(c.validTo) < now;
                    return (
                      <tr key={c.id}>
                        <td className="adm:px-4 adm:py-3 adm:font-mono adm:font-semibold">
                          {c.code} {(!c.isActive || expired) && <Badge tone="neutral">{expired ? 'Expired' : 'Off'}</Badge>}
                        </td>
                        <td className="adm:px-4 adm:py-3">
                          {describeCoupon(c) ?? (
                            <>
                              <Price paise={c.value} /> off
                            </>
                          )}
                          {c.minCartPaise > 0 && (
                            <span className="adm:block adm:text-xs adm:text-muted">
                              min <Price paise={c.minCartPaise} />
                            </span>
                          )}
                        </td>
                        <td className="adm:px-4 adm:py-3 adm:text-xs">
                          {formatDate(c.validFrom)} – {formatDate(c.validTo)}
                        </td>
                        <td className="adm:px-4 adm:py-3 adm:text-right">
                          {c.usedCount}
                          {c.usageLimit != null && <span className="adm:text-muted"> / {c.usageLimit}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
