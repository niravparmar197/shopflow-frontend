/** "a1b2c3d4-..." → "A1B2C3D4" (short order number for people) */
export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

/** "PAYMENT_EXPIRED" → "Payment expired" */
export const humanize = (code: string) => {
  const text = code.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** "Nova X5 Pro (12GB)" → "nova-x5-pro-12gb" (the product service's slug rule) */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

/** Rupees typed by a person ("1,299.50") → paise (129950); NaN if not a price. */
export const rupeesToPaise = (text: string) => {
  const n = Number(text.replace(/,/g, '').trim());
  return text.trim() === '' || !Number.isFinite(n) || n < 0 ? NaN : Math.round(n * 100);
};

export const paiseToRupees = (paise: number) => (paise / 100).toString();

/** Attributes as "key: value" lines (what an admin types) ⇄ an object. */
export const attributesToText = (a: Record<string, unknown> = {}) =>
  Object.entries(a)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('\n');

export const textToAttributes = (text: string): Record<string, string> =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => {
        const at = line.indexOf(':');
        return at > 0 ? [line.slice(0, at).trim(), line.slice(at + 1).trim()] : null;
      })
      .filter((pair): pair is string[] => pair !== null && pair[0] !== ''),
  );

/** The categories the shop shows today (no "list categories" API yet). */
export const KNOWN_CATEGORIES = ['phones', 'laptops', 'watches', 'shoes', 'shirts'];

export const linkButton =
  'adm:inline-flex adm:items-center adm:justify-center adm:gap-1.5 adm:rounded-lg adm:bg-primary adm:px-4 adm:py-2 adm:text-sm adm:font-semibold adm:text-white adm:hover:bg-primary-hover';

export const textLink = 'adm:font-medium adm:text-primary adm:hover:underline';

export const field =
  'adm:w-full adm:rounded-lg adm:border adm:border-line adm:bg-surface adm:px-3 adm:py-2 adm:text-sm adm:outline-none adm:focus:border-primary adm:focus:ring-2 adm:focus:ring-primary/20';

export const card = 'adm:rounded-card adm:border adm:border-line adm:bg-surface adm:p-5 adm:shadow-sm';
