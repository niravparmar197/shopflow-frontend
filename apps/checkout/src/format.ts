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

/** "12, Shanti Nagar, SG Highway, Ahmedabad, Gujarat 380015" */
export const addressLines = (a: { line1: string; line2: string | null; city: string; state: string; pincode: string }) =>
  [a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(', ');

/** "9876543210" → "98765 43210" */
export const formatPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);

/** Before it ships, an order can be cancelled (a paid one is refunded). */
export const canCancel = (status: string) => status === 'PENDING' || status === 'CONFIRMED' || status === 'PAID';

/** A paid order has a GST invoice (kept after a cancel + refund). */
export function hasInvoice(t: { status: string; paymentStatus: string | null }): boolean {
  return ['PAID', 'SHIPPED', 'DELIVERED'].includes(t.status) || ['SUCCEEDED', 'REFUND_PENDING', 'REFUNDED'].includes(t.paymentStatus ?? '');
}
