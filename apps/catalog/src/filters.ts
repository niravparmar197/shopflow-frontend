import type { ProductQuery } from '@shopflow/api';

/** Catalog filters live in the URL (?q=&category=&min=&max=), so links and Back work. */
export interface Filters {
  q: string;
  category: string;
  min: string; // rupees, as typed
  max: string;
}

export function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    min: params.get('min') ?? '',
    max: params.get('max') ?? '',
  };
}

export function writeFilters(f: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.category) params.set('category', f.category);
  if (f.min) params.set('min', f.min);
  if (f.max) params.set('max', f.max);
  return params;
}

const rupeesToPaise = (value: string): number | undefined => {
  const n = Number(value);
  return value !== '' && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

/** The API filters prices in paise. */
export function toQuery(f: Filters): ProductQuery {
  return {
    q: f.q.trim() || undefined,
    category: f.category || undefined,
    minPrice: rupeesToPaise(f.min),
    maxPrice: rupeesToPaise(f.max),
  };
}

export const hasFilters = (f: Filters) => Boolean(f.q || f.category || f.min || f.max);
