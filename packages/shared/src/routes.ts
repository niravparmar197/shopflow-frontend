/** URLs every micro frontend may link to. The shell owns the top-level routing. */
export const routes = {
  home: '/',
  products: '/products',
  product: (slug: string) => `/products/${encodeURIComponent(slug)}`,
  cart: '/cart',
  checkout: '/checkout',
  pay: (orderId: string) => `/orders/${encodeURIComponent(orderId)}/pay`,
  orders: '/orders',
  order: (orderId: string) => `/orders/${encodeURIComponent(orderId)}`,
  login: (returnTo?: string) =>
    returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login',
  signup: '/signup',
  // Phase 2 P5
  wishlist: '/wishlist',
  deals: '/deals',
  // Account (Phase 2 P3). Email links carry the token after '#'.
  account: '/account',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  // Policy pages (Phase 2 P4)
  privacy: '/privacy',
  terms: '/terms',
  refundPolicy: '/refund-policy',
  shippingPolicy: '/shipping-policy',
  contact: '/contact',
  // Admin micro frontend (admin role only)
  admin: '/admin',
  adminProducts: '/admin/products',
  adminNewProduct: '/admin/products/new',
  adminProduct: (id: string) => `/admin/products/${encodeURIComponent(id)}`,
  adminCoupons: '/admin/coupons',
  adminOrders: '/admin/orders',
  adminOrder: (id: string) => `/admin/orders/${encodeURIComponent(id)}`,
} as const;
