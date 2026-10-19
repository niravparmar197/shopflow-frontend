import type { ProductQuery, ProductSort } from '@shopflow/api';

export const SORT_OPTIONS: { id: ProductSort; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
];

const isSort = (v: string | null): v is ProductSort => SORT_OPTIONS.some((o) => o.id === v);

/** Catalog filters live in the URL (?q=&category=&min=&max=&sort=), so links and Back work. */
export interface Filters {
  q: string;
  category: string;
  min: string; // rupees, as typed
  max: string;
  sort: ProductSort;
}

export function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    min: params.get('min') ?? '',
    max: params.get('max') ?? '',
    sort: isSort(params.get('sort')) ? (params.get('sort') as ProductSort) : 'newest',
  };
}

export function writeFilters(f: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.category) params.set('category', f.category);
  if (f.min) params.set('min', f.min);
  if (f.max) params.set('max', f.max);
  if (f.sort !== 'newest') params.set('sort', f.sort);
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
    sort: f.sort === 'newest' ? undefined : f.sort,
  };
}

export const hasFilters = (f: Filters) => Boolean(f.q || f.category || f.min || f.max);
