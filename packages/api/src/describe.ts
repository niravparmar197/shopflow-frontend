import { isApiError } from './errors';

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'You seem to be offline. Check your connection and try again.',
  UNAUTHORIZED: 'Please log in again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  SERVER_BUSY: 'We are very busy right now. Please try again in a moment.',
  SERVICE_UNAVAILABLE: 'This part of the shop is not available right now. Please try again.',
  GATEWAY_TIMEOUT: 'This is taking too long. Please try again.',
  PRICE_CHANGED: 'Prices changed. Please check your cart again.',
  SOLD_OUT: 'Sorry, an item is sold out.',
  CART_EMPTY: 'Your cart is empty.',
  CART_ITEM_UNAVAILABLE: 'An item in your cart is no longer available.',
  PAYMENT_EXPIRED: 'The time to pay ran out. Please place the order again.',
  PAYMENT_PROVIDER_UNAVAILABLE: 'Payments are not available right now. Please try again.',
};

/** A short, friendly message for any error, plus the id to quote in a bug report. */
export function describeError(err: unknown): { message: string; reference: string | null } {
  if (!isApiError(err)) {
    return { message: 'Something went wrong. Please try again.', reference: null };
  }
  const message =
    MESSAGES[err.code] ??
    (err.status === 400 && err.validationMessages.length
      ? err.validationMessages.join('. ')
      : err.status >= 500
        ? 'Something went wrong on our side. Please try again.'
        : err.message);
  const reference = err.status >= 500 || err.status === 0 ? err.correlationId : null;
  return { message, reference };
}
