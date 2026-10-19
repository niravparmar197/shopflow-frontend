import { expect, fakeGateway, test } from './fixtures';

const product = {
  id: '6713a1f2c9e4b2a1d0f3e456',
  name: 'Nova X5 5G',
  slug: 'nova-x5-5g',
  description: 'A phone',
  category: 'phones',
  pricePaise: 1899900,
  currency: 'INR',
  images: [],
  version: 3,
  createdAt: '2026-10-01T10:00:00.000Z',
  attributes: { ram: '8GB' },
};
const order = {
  id: '9b5f1db1-1758-4ae0-88cd-e567aa0b4e8a',
  userId: '0d7f4c1e-0000-4000-8000-000000000001',
  customerEmail: 'ravi@shop.in',
  status: 'PAID',
  paymentStatus: 'SUCCEEDED',
  title: 'Nova X5 5G',
  itemCount: 1,
  totalPaise: 1899900,
  currency: 'INR',
  createdAt: '2026-10-18T10:00:00.000Z',
};

test('a customer cannot open the admin panel and sees no Admin link', async ({ page }) => {
  await fakeGateway(page, { loggedIn: true });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'No access' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
});

test('admin: product list with stock, then create a product (price in paise, slug from the name)', async ({ page, isMobile }) => {
  const { json } = await fakeGateway(page, { loggedIn: true, role: 'admin' });
  await page.route('**/v1/products?*', (route) => json(route, 200, { items: [product], nextCursor: null }));
  await page.route('**/v1/inventory/stock/*', (route) => json(route, 200, { productId: product.id, available: 0, reserved: 2 }));
  let created: Record<string, unknown> | undefined;
  await page.route('**/v1/products', (route) => {
    created = route.request().postDataJSON() as Record<string, unknown>;
    return json(route, 201, { ...product, ...created, id: '6713a1f2c9e4b2a1d0f3e999', version: 0 });
  });
  await page.route('**/v1/products/6713a1f2c9e4b2a1d0f3e999', (route) =>
    json(route, 200, { ...product, ...created, id: '6713a1f2c9e4b2a1d0f3e999', version: 0 }),
  );

  await page.goto('/');
  if (!isMobile) await page.getByRole('link', { name: 'Admin', exact: true }).click();
  else await page.goto('/admin');
  await expect(page).toHaveURL('/admin/products');
  await expect(page.getByRole('link', { name: 'Nova X5 5G' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '0 (+2 reserved)' })).toBeVisible();

  await page.getByRole('link', { name: 'New product' }).click();
  await page.getByLabel('Name').fill('Pulse Fit Pro (AMOLED)');
  await expect(page.getByLabel('Slug (the URL)')).toHaveValue('pulse-fit-pro-amoled');
  await page.getByLabel('Category').fill('watches');
  await page.getByLabel('Price (₹)').fill('6,499.50');
  await page.getByLabel('Specifications').fill('display: AMOLED\ngps: yes');
  await page.getByRole('button', { name: 'Create product' }).click();

  await expect(page).toHaveURL('/admin/products/6713a1f2c9e4b2a1d0f3e999');
  expect(created).toMatchObject({
    name: 'Pulse Fit Pro (AMOLED)',
    slug: 'pulse-fit-pro-amoled',
    category: 'watches',
    pricePaise: 649950,
    attributes: { display: 'AMOLED', gps: 'yes' },
  });
  await expect(page.getByRole('heading', { name: 'Stock' })).toBeVisible();
});

test('admin: orders filtered by status (in the URL), then one order', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true, role: 'admin' });
  const statuses: (string | null)[] = [];
  await page.route('**/v1/admin/orders?*', (route) => {
    statuses.push(new URL(route.request().url()).searchParams.get('status'));
    return json(route, 200, { items: [order], nextCursor: null });
  });
  await page.route(`**/v1/admin/orders/${order.id}`, (route) =>
    json(route, 200, {
      ...order,
      failureReason: null,
      subtotalPaise: 1899900,
      discountPaise: 0,
      couponCode: null,
      items: [{ productId: product.id, name: 'Nova X5 5G', unitPricePaise: 1899900, quantity: 1, lineTotalPaise: 1899900 }],
      updatedAt: '2026-10-18T10:05:00.000Z',
    }),
  );

  await page.goto('/admin/orders');
  await expect(page.getByRole('cell', { name: 'ravi@shop.in' })).toBeVisible();
  await page.getByLabel('Status').selectOption('PAID');
  await expect(page).toHaveURL('/admin/orders?status=PAID');
  await expect.poll(() => statuses.at(-1)).toBe('PAID');

  await page.getByRole('link', { name: '#9B5F1DB1' }).click();
  await expect(page.getByRole('heading', { name: 'Order #9B5F1DB1' })).toBeVisible();
  await expect(page.getByText('ravi@shop.in')).toBeVisible();
});

test('admin: create a coupon (validation, then the API body)', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true, role: 'admin' });
  let body: Record<string, unknown> | undefined;
  await page.route('**/v1/coupons', (route) => {
    if (route.request().method() === 'GET') return json(route, 200, []);
    body = route.request().postDataJSON() as Record<string, unknown>;
    return json(route, 201, { ...body, id: 'c1', usedCount: 0, isActive: true });
  });

  await page.goto('/admin/coupons');
  await page.getByLabel('Code').fill('ab');
  await page.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByText('4-20 letters or digits')).toBeVisible();
  expect(body).toBeUndefined();

  await page.getByLabel('Code').fill('diwali25');
  await page.getByLabel('Percent off').fill('25');
  await page.getByLabel('Minimum cart (₹, optional)').fill('999');
  await page.getByRole('button', { name: 'Create coupon' }).click();
  await expect.poll(() => body).toMatchObject({ code: 'DIWALI25', type: 'PERCENT', value: 25, minCartPaise: 99900 });
});
