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
}

export interface CartLine {
  productId: string;
  qty: number;
  name?: string;
  category?: string;
  unitPricePaise?: number;
  lineTotalPaise?: number;
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
