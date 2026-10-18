import { useId, useState, type FormEvent } from 'react';
import { Button } from '@shopflow/ui';
import { CATEGORIES } from '../categories';
import type { Filters } from '../filters';

export function FilterPanel({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const id = useId();
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);
  const priceError = min !== '' && max !== '' && Number(min) > Number(max) ? 'Min must be less than max' : null;

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    if (!priceError) onChange({ ...filters, min, max });
  };

  const option = (id: string, label: string) => {
    const active = filters.category === id;
    return (
      <li key={id || 'all'}>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onChange({ ...filters, category: id })}
          className={`cat:w-full cat:cursor-pointer cat:rounded-lg cat:px-3 cat:py-2 cat:text-left cat:text-sm cat:transition-colors ${
            active ? 'cat:bg-primary-soft cat:font-semibold cat:text-primary' : 'cat:text-ink-soft cat:hover:bg-canvas'
          }`}
        >
          {label}
        </button>
      </li>
    );
  };

  return (
    <div className="cat:flex cat:flex-col cat:gap-6">
      <section aria-labelledby={`${id}-category`}>
        <h2 id={`${id}-category`} className="cat:mb-2 cat:px-3 cat:text-xs cat:font-semibold cat:tracking-wider cat:text-muted cat:uppercase">
          Category
        </h2>
        <ul className="cat:flex cat:flex-col cat:gap-0.5">
          {option('', 'All products')}
          {CATEGORIES.map((c) => option(c.id, c.label))}
        </ul>
      </section>

      <form aria-labelledby={`${id}-price`} onSubmit={applyPrice} className="cat:flex cat:flex-col cat:gap-3 cat:px-3">
        <h2 id={`${id}-price`} className="cat:text-xs cat:font-semibold cat:tracking-wider cat:text-muted cat:uppercase">
          Price (₹)
        </h2>
        <div className="cat:grid cat:grid-cols-2 cat:gap-2">
          <label className="cat:flex cat:flex-col cat:gap-1 cat:text-xs cat:text-muted">
            Min
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `${id}-price-error` : undefined}
              placeholder="0"
              className="cat:h-10 cat:rounded-lg cat:border cat:border-line cat:bg-surface cat:px-3 cat:text-sm cat:text-ink cat:outline-none cat:focus:border-primary cat:focus:ring-2 cat:focus:ring-primary/20"
            />
          </label>
          <label className="cat:flex cat:flex-col cat:gap-1 cat:text-xs cat:text-muted">
            Max
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `${id}-price-error` : undefined}
              placeholder="Any"
              className="cat:h-10 cat:rounded-lg cat:border cat:border-line cat:bg-surface cat:px-3 cat:text-sm cat:text-ink cat:outline-none cat:focus:border-primary cat:focus:ring-2 cat:focus:ring-primary/20"
            />
          </label>
        </div>
        {priceError && (
          <p id={`${id}-price-error`} className="cat:text-xs cat:text-danger">
            {priceError}
          </p>
        )}
        <Button type="submit" variant="secondary" size="sm" disabled={Boolean(priceError)}>
          Apply price
        </Button>
      </form>
    </div>
  );
}
