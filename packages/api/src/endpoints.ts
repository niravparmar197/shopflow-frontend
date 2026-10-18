import { request, requestRaw } from './client';
import type {
  Cart,
  CheckoutSession,
  Order,
  OrderSummary,
  OrderTracking,
  Page,
  Payment,
  Product,
  ProductQuery,
} from './types';

const enc = encodeURIComponent;

/** Product service (public reads go over gRPC inside the gateway). */
export const productsApi = {
  list: (query: ProductQuery = {}, signal?: AbortSignal) =>
    request<Page<Product>>('/v1/products', { auth: false, query: { ...query }, signal }),
  get: (idOrSlug: string, signal?: AbortSignal) =>
    request<Product>(`/v1/products/${enc(idOrSlug)}`, { auth: false, signal }),
};

/** Order service: cart and coupons. The user id comes from the token only. */
export const cartApi = {
  get: (signal?: AbortSignal) => request<Cart>('/v1/cart', { signal }),
  addItem: (productId: string, qty = 1) =>
    request<Cart>('/v1/cart/items', { method: 'POST', body: { productId, qty } }),
  updateQty: (productId: string, qty: number) =>
    request<Cart>(`/v1/cart/items/${enc(productId)}`, { method: 'PATCH', body: { qty } }),
  removeItem: (productId: string) =>
    request<Cart>(`/v1/cart/items/${enc(productId)}`, { method: 'DELETE' }),
  applyCoupon: (code: string) =>
    request<Cart>('/v1/cart/coupon', { method: 'POST', body: { code } }),
  removeCoupon: () => request<Cart>('/v1/cart/coupon', { method: 'DELETE' }),
};

/** Order service: orders (write model) and tracking (read model). */
export const ordersApi = {
  /** Same key on retry → the same order, never two (`replayed: true`). */
  place: async (idempotencyKey: string, expectedTotalPaise?: number) => {
    const res = await requestRaw<Order>('/v1/orders', {
      method: 'POST',
      idempotencyKey,
      body: expectedTotalPaise === undefined ? {} : { expectedTotalPaise },
    });
    return { order: res.data, replayed: res.headers.get('Idempotent-Replayed') === 'true' };
  },
  list: (cursor?: string, limit = 20, signal?: AbortSignal) =>
    request<Page<OrderSummary>>('/v1/orders', { query: { cursor, limit }, signal }),
  get: (id: string, signal?: AbortSignal) => request<Order>(`/v1/orders/${enc(id)}`, { signal }),
  tracking: (id: string, signal?: AbortSignal) =>
    request<OrderTracking>(`/v1/orders/${enc(id)}/tracking`, { signal }),
};

/** Payment service. */
export const paymentsApi = {
  get: (orderId: string, signal?: AbortSignal) =>
    request<Payment>(`/v1/payments/${enc(orderId)}`, { signal }),
  /** Safe to call again (refresh, back button): returns the same provider order. */
  checkout: (orderId: string) =>
    request<CheckoutSession>(`/v1/payments/${enc(orderId)}/checkout`, { method: 'POST' }),
  /** DEV ONLY (fake provider): simulate the provider's webhook. 404 in production. */
  fakePay: (orderId: string, outcome: 'succeeded' | 'failed') =>
    request<{ outcome: string }>(`/v1/payments/dev/fake-pay/${enc(orderId)}`, {
      method: 'POST',
      body: { outcome },
    }),
};
