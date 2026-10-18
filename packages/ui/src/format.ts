const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

/**
 * 2499900 paise → "₹24,999", 9950 → "₹99.50". Money stays in paise (integers)
 * everywhere; it becomes rupees only here, for display.
 */
export const formatPaise = (paise: number): string =>
  paise % 100 === 0 ? whole.format(paise / 100) : exact.format(paise / 100);

/** "18 Oct 2026" */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "10:02 AM" */
export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
