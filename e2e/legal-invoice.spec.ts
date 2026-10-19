import { expect, fakeGateway, test } from './fixtures';

// Phase 2 P4: policy pages in the footer, GST invoice downloads.
const ORDER = '9b5f1db1-1758-4ae0-88cd-e567aa0b4e8a';
const PDF = Buffer.from('%PDF-1.3\n% fake invoice for the test\n%%EOF\n');

const tracking = (status: string, paymentStatus: string | null) => ({
  orderId: ORDER,
  status,
  paymentStatus,
  failureReason: null,
  title: 'Nova X5 5G',
  totalPaise: 1899900,
  currency: 'INR',
  syncing: false,
  timeline: [{ step: 'PLACED', label: 'Order placed', at: '2026-10-18T10:00:00.000Z', reason: null }],
});
const order = (status: string) => ({
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
  shippingAddress: null,
  carrier: null,
  trackingNumber: null,
});

test('footer links to every policy page; each page links to the others', async ({ page }) => {
  await fakeGateway(page);
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  for (const name of ['Privacy policy', 'Terms of use', 'Cancellation and refund policy', 'Shipping policy', 'Contact us']) {
    await expect(footer.getByRole('link', { name })).toBeVisible();
  }

  await footer.getByRole('link', { name: 'Cancellation and refund policy' }).click();
  await expect(page).toHaveURL('/refund-policy');
  await expect(page.getByRole('heading', { level: 1, name: 'Cancellation and refund policy' })).toBeVisible();
  await expect(page).toHaveTitle('Cancellation and refund policy · ShopFlow');
  const nav = page.getByRole('navigation', { name: 'Policies', exact: true });
  await expect(nav.getByRole('link', { name: 'Cancellation and refund policy' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Contact us' }).click();
  await expect(page.getByRole('heading', { name: 'Grievance officer' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'support@shopflow.example' }).first()).toHaveAttribute(
    'href',
    'mailto:support@shopflow.example',
  );
});

test('signup links to the terms and the privacy policy', async ({ page }) => {
  await fakeGateway(page);
  await page.goto('/signup');
  await page.getByRole('link', { name: 'Privacy policy' }).first().click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.getByRole('heading', { name: 'What we collect' })).toBeVisible();
});

test('a paid order: download the GST invoice PDF', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  let auth: string | undefined;
  await page.route(`**/v1/orders/${ORDER}/tracking`, (route) => json(route, 200, tracking('PAID', 'SUCCEEDED')));
  await page.route(`**/v1/orders/${ORDER}`, (route) => json(route, 200, order('PAID')));
  await page.route(`**/v1/orders/${ORDER}/invoice`, (route) => {
    auth = route.request().headers().authorization;
    return route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Content-Disposition': 'attachment; filename="invoice-SF-26-27-000042.pdf"' },
      body: PDF,
    });
  });

  await page.goto(`/orders/${ORDER}`);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Invoice (PDF)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('invoice-SF-26-27-000042.pdf');
  expect(auth).toBe('Bearer tok'); // the token goes along: not a plain link
});

test('no invoice button before payment', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  await page.route(`**/v1/orders/${ORDER}/tracking`, (route) => json(route, 200, tracking('CONFIRMED', 'PENDING')));
  await page.route(`**/v1/orders/${ORDER}`, (route) => json(route, 200, order('CONFIRMED')));
  await page.goto(`/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: /Order #9B5F1DB1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invoice (PDF)' })).toHaveCount(0);
});

test('admin: invoice download on the order page', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true, role: 'admin' });
  await page.route(`**/v1/admin/orders/${ORDER}`, (route) =>
    json(route, 200, { ...order('SHIPPED'), userId: 'u2', customerEmail: 'ravi@shop.in', updatedAt: '2026-10-18T12:00:00.000Z' }),
  );
  await page.route(`**/v1/admin/orders/${ORDER}/invoice`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Content-Disposition': 'attachment; filename="invoice-SF-26-27-000007.pdf"' },
      body: PDF,
    }),
  );
  await page.goto(`/admin/orders/${ORDER}`);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Invoice' }).click();
  expect((await download).suggestedFilename()).toBe('invoice-SF-26-27-000007.pdf');
});
