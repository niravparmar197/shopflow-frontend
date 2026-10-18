/** "a1b2c3d4-..." → "A1B2C3D4" (short order number for people) */
export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

/** "PAYMENT_EXPIRED" → "Payment expired" */
export const humanize = (code: string) => {
  const text = code.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Placed but not paid yet: the user can still pay. */
export const canPay = (o: { status: string; paymentStatus: string | null }) =>
  (o.status === 'PENDING' || o.status === 'CONFIRMED') && o.paymentStatus !== 'SUCCEEDED';

export const linkButton =
  'chk:inline-flex chk:items-center chk:justify-center chk:rounded-lg chk:bg-primary chk:px-4 chk:py-2 chk:text-sm chk:font-semibold chk:text-white chk:hover:bg-primary-hover';
