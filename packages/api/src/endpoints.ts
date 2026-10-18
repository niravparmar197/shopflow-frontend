import { request, requestRaw } from './client';
import type {
  AdminOrder,
  AdminOrderSummary,
  Cart,
  Coupon,
  CouponInput,
  FlashSaleStatus,
  ImageUploadTarget,
  OrderStatus,
  ProductInput,
  Stock,
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

/**
 * Admin only (the services check the admin role; a customer gets 403).
 * Used by the admin micro frontend.
 */
export const adminApi = {
  products: {
    create: (input: ProductInput) => request<Product>('/v1/products', { method: 'POST', body: input }),
    /** `version` = the one you last read: someone else's newer edit is refused (409), not overwritten. */
    update: (id: string, version: number, changes: Partial<ProductInput>) =>
      request<Product>(`/v1/products/${enc(id)}`, { method: 'PATCH', body: { ...changes, version } }),
    /** Step 1 of an image upload: where to send the file. */
    imageUploadUrl: (id: string, contentType: string, sizeBytes: number) =>
      request<ImageUploadTarget>(`/v1/products/${enc(id)}/images/upload-url`, {
        method: 'POST',
        body: { contentType, sizeBytes },
      }),
    /** Step 3: the file is in storage; attach it to the product. */
    confirmImage: (id: string, key: string) =>
      request<Product>(`/v1/products/${enc(id)}/images/confirm`, { method: 'POST', body: { key } }),
  },
  stock: {
    get: (productId: string, signal?: AbortSignal) =>
      request<Stock>(`/v1/inventory/stock/${enc(productId)}`, { signal }),
    set: (productId: string, available: number) =>
      request<Stock>(`/v1/inventory/stock/${enc(productId)}`, { method: 'PUT', body: { available } }),
  },
  flashSales: {
    status: (productId: string, signal?: AbortSignal) =>
      request<FlashSaleStatus>(`/v1/inventory/flash-sales/${enc(productId)}`, { signal }),
    start: (productId: string, quantity: number, durationMinutes: number) =>
      request<FlashSaleStatus>('/v1/inventory/flash-sales', {
        method: 'POST',
        body: { productId, quantity, durationMinutes },
      }),
    end: (productId: string) =>
      request<void>(`/v1/inventory/flash-sales/${enc(productId)}`, { method: 'DELETE' }),
  },
  coupons: {
    list: (signal?: AbortSignal) => request<Coupon[]>('/v1/coupons', { signal }),
    create: (input: CouponInput) => request<Coupon>('/v1/coupons', { method: 'POST', body: input }),
  },
  orders: {
    list: (query: { status?: OrderStatus; cursor?: string; limit?: number } = {}, signal?: AbortSignal) =>
      request<Page<AdminOrderSummary>>('/v1/admin/orders', { query: { ...query }, signal }),
    get: (id: string, signal?: AbortSignal) => request<AdminOrder>(`/v1/admin/orders/${enc(id)}`, { signal }),
  },
};

/**
 * Step 2 of an image upload: send the file straight to storage (S3 / MinIO)
 * with the presigned form fields. Not through the gateway: no token, and the
 * big file never touches our services.
 */
export async function uploadToStorage(target: ImageUploadTarget, file: File): Promise<void> {
  const form = new FormData();
  Object.entries(target.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file); // the file must be the LAST field
  const res = await fetch(target.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
}
