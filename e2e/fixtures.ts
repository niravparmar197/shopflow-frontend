import { test as base, type Page, type Route } from '@playwright/test';

const customer = {
  id: 'u1',
  email: 'asha@shop.in',
  fullName: 'Asha Patel',
  role: 'customer',
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  phone: null as string | null,
  emailVerifiedAt: '2026-10-01T10:05:00.000Z' as string | null,
};

const json = (route: Route, status: number, body: unknown, headers: Record<string, string> = {}) =>
  route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });

const unauthorized = { code: 'UNAUTHORIZED', message: 'Missing refresh token', correlationId: 'e2e' };

/**
 * A tiny fake gateway. `loggedIn` decides what /v1/auth/refresh answers.
 * Tests add more routes on top (later routes win in Playwright).
 */
export async function fakeGateway(
  page: Page,
  opts: { loggedIn?: boolean; role?: 'customer' | 'admin'; verified?: boolean } = {},
) {
  let loggedIn = opts.loggedIn ?? false;
  const user = {
    ...customer,
    role: opts.role ?? 'customer',
    emailVerifiedAt: opts.verified === false ? null : customer.emailVerifiedAt,
  };
  await page.route('**/v1/**', (route) => json(route, 404, { code: 'NOT_FOUND', message: 'Not mocked', correlationId: 'e2e' }));
  await page.route('**/v1/auth/refresh', (route) =>
    loggedIn ? json(route, 200, { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 900 }) : json(route, 401, unauthorized),
  );
  await page.route('**/v1/users/me', (route) => (loggedIn ? json(route, 200, { user }) : json(route, 401, unauthorized)));
  await page.route('**/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.password !== 'secret123') return json(route, 401, { code: 'UNAUTHORIZED', message: 'Invalid email or password', correlationId: 'e2e' });
    loggedIn = true;
    return json(route, 200, { user, accessToken: 'tok', tokenType: 'Bearer', expiresIn: 900 });
  });
  await page.route('**/v1/auth/logout', (route) => {
    loggedIn = false;
    return route.fulfill({ status: 204 });
  });
  await page.route('**/v1/cart', (route) =>
    json(route, 200, { items: [], itemCount: 0, subtotalPaise: 0, pricingAvailable: true, coupon: null, discountPaise: 0, totalPaise: 0 }),
  );
  await page.route('**/v1/products?*', (route) => json(route, 200, { items: [], nextCursor: null }));
  return { json, user };
}

export const test = base;
export { expect } from '@playwright/test';
