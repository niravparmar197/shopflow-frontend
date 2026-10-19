import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@shopflow/api';

/** Nicer names for the categories we know; others get a capital letter. */
const LABELS: Record<string, string> = {
  phones: 'Phones',
  laptops: 'Laptops',
  watches: 'Watches',
  shoes: 'Shoes',
  shirts: 'Shirts',
};

export const categoryLabel = (id: string) => LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}

/** Used while the list loads, or if it can't be loaded. */
const FALLBACK: CategoryOption[] = Object.entries(LABELS).map(([id, label]) => ({ id, label }));

/** Categories from the product service (with counts), Phase 2 P5. */
export function useCategories(): CategoryOption[] {
  const query = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: ({ signal }) => productsApi.categories(signal),
    staleTime: 5 * 60_000,
  });
  if (!query.data?.length) return FALLBACK;
  return query.data.map((c) => ({ id: c.slug, label: categoryLabel(c.slug), count: c.count }));
}
