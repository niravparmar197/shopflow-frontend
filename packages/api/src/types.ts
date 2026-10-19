// Response shapes of the ShopFlow gateway (/v1). Hand-written from the service code,
// because the OpenAPI files have no response schemas yet. Money is always in paise.

export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  /** 10-digit mobile, set on the account page (Phase 2 P3) */
  phone: string | null;
  /** null until the user opens the link from the signup email */
  emailVerifiedAt: string | null;
}

export interface AccessToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
}

export interface LoginResponse extends AccessToken {
  user: User;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  pricePaise: number;
  currency: string;
  images: string[]; // full URLs
  version: number;
  createdAt: string;
  attributes: Record<string, unknown>;
  /** 1–5, one decimal; 0 when there are no reviews (Phase 2 P5) */
  ratingAvg: number;
  ratingCount: number;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc';

export interface Category {
  slug: string;
  count: number;
}

/** A review. Only customers who received the product can write one. */
export interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  verifiedPurchase: true;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  ratingAvg: number;
  ratingCount: number;
  stars: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewPage extends Page<Review> {
  /** First page only */
  summary?: ReviewSummary;
}

export interface ReviewInput {
  rating: number;
  title?: string;
  body: string;
  authorName: string;
}

export interface WishlistItem {
  productId: string;
  createdAt: string;
}

/** A flash sale running now (public list) */
export interface LiveFlashSale {
  productId: string;
  left: number;
  total: number;
  maxPerUser: number;
  endsInSec: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ProductQuery {
  q?: string;
  category?: string;
  minPrice?: number; // paise
  maxPrice?: number; // paise
  cursor?: string;
  limit?: number;
  sort?: ProductSort;
}

export interface CartLine {
  productId: string;
  qty: number;
  name?: string;
  category?: string;
  unitPricePaise?: number;
  lineTotalPaise?: number;
  /** First product photo, when it has one */
  image?: string;
  /** false when the product was removed or deactivated after it was added */
  available: boolean;
}

export interface CouponResult {
  code: string;
  applied: boolean;
  discountPaise: number;
  reason?: string;
}

export interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotalPaise: number | null; // null when prices could not be loaded
  pricingAvailable: boolean;
  coupon: CouponResult | null;
  discountPaise: number;
  totalPaise: number | null;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'EXPIRED' | 'REFUND_PENDING' | 'REFUNDED';

export interface OrderItem {
  productId: string;
  name: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  failureReason: string | null;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  couponCode: string | null;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  /** A copy of the address at checkout (null on older orders). */
  shippingAddress: ShippingAddress | null;
  /** Set by an admin when it ships. */
  carrier: string | null;
  trackingNumber: string | null;
}

/** Where an order goes: the copy stored on the order. */
export interface ShippingAddress {
  fullName: string;
  phone: string; // 10 digits
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string; // 6 digits
}

/** A saved address in the user's address book. */
export interface Address extends ShippingAddress {
  id: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  title: string | null;
  itemCount: number | null;
  totalPaise: number;
  currency: string;
  createdAt: string;
  /** true for a few seconds after placing, until the read model catches up */
  syncing: boolean;
}

export interface TrackingStep {
  step: string;
  label: string;
  at: string;
  reason: string | null;
}

export interface OrderTracking {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  failureReason: string | null;
  title: string | null;
  totalPaise: number;
  currency: string;
  syncing: boolean;
  timeline: TrackingStep[];
}

export type ProviderName = 'fake' | 'razorpay' | 'stripe';

export interface CheckoutSession {
  provider: ProviderName;
  providerOrderId: string;
  publicKey?: string;
  clientSecret?: string;
  amountPaise: number;
  currency: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  provider: ProviderName | null;
  lastError: string | null;
  expiresAt: string;
}

/* ---------- Admin (admin role only) ---------- */

/** One row of GET /v1/admin/orders: every customer's orders. */
export interface AdminOrderSummary {
  id: string;
  userId: string;
  customerEmail: string | null;
  status: OrderStatus;
  paymentStatus: string | null;
  title: string | null;
  itemCount: number | null;
  totalPaise: number;
  currency: string;
  createdAt: string;
}

/** GET /v1/admin/orders/:id: the order plus who placed it. */
export interface AdminOrder extends Order {
  userId: string;
  customerEmail: string | null;
  updatedAt: string;
}

/** Fields of a product the admin can set. */
export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  category: string;
  pricePaise: number;
  attributes?: Record<string, unknown>;
}

export interface Stock {
  productId: string;
  available: number;
  reserved: number;
}

export type FlashSaleStatus =
  | { productId: string; active: false }
  | { productId: string; active: true; left: number; total: number; maxPerUser: number; buyers: number; endsInSec: number };

export type CouponType = 'PERCENT' | 'FLAT';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // percent, or paise for FLAT
  maxDiscountPaise: number | null;
  minCartPaise: number;
  category: string | null;
  firstOrderOnly: boolean;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  maxDiscountPaise?: number;
  minCartPaise?: number;
  category?: string;
  firstOrderOnly?: boolean;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
}

/** A presigned POST: send the file to `url` as multipart form data with `fields` first. */
export interface ImageUploadTarget {
  url: string;
  fields: Record<string, string>;
  key: string;
  expiresIn: number;
}
