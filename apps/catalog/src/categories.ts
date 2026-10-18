/*
 * The product service stores the category as a lowercase word and has no
 * "list categories" endpoint yet, so the list lives here.
 */
export const CATEGORIES = [
  { id: 'phones', label: 'Phones' },
  { id: 'laptops', label: 'Laptops' },
  { id: 'watches', label: 'Watches' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'shirts', label: 'Shirts' },
] as const;

export const categoryLabel = (id: string) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
