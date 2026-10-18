import { expect, fakeGateway, test } from './fixtures';

const ORDER = '9b5f1db1-1758-4ae0-88cd-e567aa0b4e8a';
const cart = {
  items: [{ productId: 'p1', qty: 1, name: 'Nova X5 5G', category: 'phones', unitPricePaise: 1899900, lineTotalPaise: 1899900, available: true }],
  itemCount: 1,
  subtotalPaise: 1899900,
  pricingAvailable: true,
  coupon: null,
  discountPaise: 0,
  totalPaise: 1899900,
};
const saved = {
  id: 'a1',
  fullName: 'Asha Patel',
  phone: '9876543210',
  line1: '12, Shanti Nagar, SG Highway',
  line2: null,
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '380015',
  isDefault: true,
  createdAt: '2026-10-18T10:00:00.000Z',
};
const order = (status: string, extra: object = {}) => ({
  id: ORDER,
  status,
  failureReason: null,
  subtotalPaise: 1899900,
  discountPaise: 0,
  totalPaise: 1899900,
  couponCode: null,
  currency: 'INR',
  items: [{ productId: 'p1', name: 'Nova X5 5G', unitPricePaise: 1899900, quantity: 1, lineTotalPaise: 1899900 }],
  createdAt: '2026-10-18T10:00:00.000Z',
  shippingAddress: { ...saved, id: undefined, isDefault: undefined, createdAt: undefined },
  carrier: null,
  trackingNumber: null,
  ...extra,
});
const tracking = (status: string, reason: string | null = null) => ({
  orderId: ORDER,
  status,
  paymentStatus: status === 'PAID' ? 'SUCCEEDED' : null,
  failureReason: reason,
  title: 'Nova X5 5G',
  totalPaise: 1899900,
  currency: 'INR',
  syncing: false,
  timeline: [{ step: 'PLACED', label: 'Order placed', at: '2026-10-18T10:00:00.000Z', reason: null }],
});

test('checkout: no saved address → the form; bad PIN refused; saved address goes with the order', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  await page.route('**/v1/cart', (route) => json(route, 200, cart));
  let book: object[] = [];
  let createdBody: Record<string, unknown> | undefined;
  await page.route('**/v1/users/me/addresses', (route) => {
    if (route.request().method() === 'GET') return json(route, 200, { items: book });
    createdBody = route.request().postDataJSON() as Record<string, unknown>;
    book = [saved];
    return json(route, 201, saved);
  });
  let placed: Record<string, unknown> | undefined;
  await page.route('**/v1/orders', (route) => {
    placed = route.request().postDataJSON() as Record<string, unknown>;
    return json(route, 201, order('PENDING'));
  });
  await page.route(`**/v1/payments/${ORDER}**`, (route) => json(route, 404, { code: 'PAYMENT_NOT_FOUND', message: 'x', correlationId: 'e2e' }));
  await page.route(`**/v1/orders/${ORDER}**`, (route) => json(route, 200, order('PENDING')));

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place order' })).toBeDisabled();

  await page.getByLabel('Full name').fill('Asha Patel');
  await page.getByLabel('Mobile number').fill('98765 43210');
  await page.getByLabel('House / flat, building, street').fill('12, Shanti Nagar, SG Highway');
  await page.getByLabel('City').fill('Ahmedabad');
  await page.getByLabel('State').fill('Gujarat');
  await page.getByLabel('PIN code').fill('3800');
  await page.getByRole('button', { name: 'Save and deliver here' }).click();
  await expect(page.getByText('Enter a 6-digit PIN code')).toBeVisible();
  expect(createdBody).toBeUndefined();

  await page.getByLabel('PIN code').fill('380015');
  await page.getByRole('button', { name: 'Save and deliver here' }).click();
  await expect(page.getByRole('radio', { name: /Asha Patel/ })).toBeChecked();
  expect(createdBody).toMatchObject({ fullName: 'Asha Patel', pincode: '380015', city: 'Ahmedabad' });

  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page).toHaveURL(`/orders/${ORDER}/pay`);
  expect(placed).toMatchObject({
    expectedTotalPaise: 1899900,
    shippingAddress: { fullName: 'Asha Patel', phone: '9876543210', line1: '12, Shanti Nagar, SG Highway', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' },
  });
});

test('tracking: the customer cancels a paid order (refund message), then sees it cancelled', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  let state = 'PAID';
  let cancelCalls = 0;
  await page.route(`**/v1/orders/${ORDER}/tracking`, (route) =>
    json(route, 200, state === 'PAID' ? tracking('PAID') : tracking('CANCELLED', 'USER_CANCELLED')),
  );
  await page.route(`**/v1/orders/${ORDER}/cancel`, (route) => {
    cancelCalls++;
    state = 'CANCELLED';
    return json(route, 200, order('CANCELLED', { failureReason: 'USER_CANCELLED' }));
  });
  await page.route(`**/v1/orders/${ORDER}`, (route) => json(route, 200, order(state)));

  await page.goto(`/orders/${ORDER}`);
  await expect(page.getByText('Ahmedabad, Gujarat 380015')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('the full amount is refunded to you automatically')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my order' }).click();
  expect(cancelCalls).toBe(0);

  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Yes, cancel it' }).click();
  await expect(page.getByText('You cancelled this order')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
  expect(cancelCalls).toBe(1);
});

test('admin: ship a paid order with courier + tracking number, then mark delivered', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true, role: 'admin' });
  let current = { ...order('PAID'), userId: 'u2', customerEmail: 'ravi@shop.in', updatedAt: '2026-10-18T10:05:00.000Z' };
  let shipBody: Record<string, unknown> | undefined;
  await page.route(`**/v1/admin/orders/${ORDER}`, (route) => json(route, 200, current));
  await page.route(`**/v1/admin/orders/${ORDER}/ship`, (route) => {
    shipBody = route.request().postDataJSON() as Record<string, unknown>;
    current = { ...current, status: 'SHIPPED', carrier: 'Delhivery', trackingNumber: 'DL123' } as typeof current;
    return json(route, 200, current);
  });
  await page.route(`**/v1/admin/orders/${ORDER}/deliver`, (route) => {
    current = { ...current, status: 'DELIVERED' };
    return json(route, 200, current);
  });

  await page.goto(`/admin/orders/${ORDER}`);
  await expect(page.getByText('Deliver to')).toBeVisible();
  await page.getByLabel('Courier (optional)').fill('Delhivery');
  await page.getByLabel('Tracking number (optional)').fill('DL123');
  await page.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(page.getByRole('button', { name: 'Mark as delivered' })).toBeVisible();
  expect(shipBody).toEqual({ carrier: 'Delhivery', trackingNumber: 'DL123' });

  await page.getByRole('button', { name: 'Mark as delivered' }).click();
  await expect(page.getByRole('heading', { name: 'Next step' })).toHaveCount(0);
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible();
});
