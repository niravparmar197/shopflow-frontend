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
} as const;
