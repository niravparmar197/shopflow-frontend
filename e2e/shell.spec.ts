import { expect, fakeGateway, test } from './fixtures';

test('the shell loads the catalog remote, with one shared React', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname);
  });
  await fakeGateway(page);

  await page.goto('/');

  await expect(page.getByRole('link', { name: 'ShopFlow home' })).toBeVisible();
  await expect(page.locator('main')).toContainText(/catalog/i);
  expect(scripts.some((s) => s.startsWith('/mfe/catalog/'))).toBe(true);
  // Remotes must use the shell's React, never download their own copy.
  expect(scripts.filter((s) => s.startsWith('/mfe/') && /prebuild__react/.test(s))).toEqual([]);
});

test('a broken remote shows a fallback and the rest of the page keeps working', async ({ page }) => {
  await fakeGateway(page, { loggedIn: true });
  await page.route('**/mfe/cart/**', (route) => route.abort());

  await page.goto('/cart');

  await expect(page.getByRole('heading', { name: 'The cart is not available right now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  // header (shell) still works, and the cart icon falls back to a plain link
  await expect(page.getByRole('link', { name: 'Cart', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'ShopFlow home' }).click();
  await expect(page.locator('main')).toContainText(/catalog/i);
});

test('unknown pages show a 404 with a way back', async ({ page }) => {
  await fakeGateway(page);
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Go to shop' }).click();
  await expect(page).toHaveURL('/');
});
