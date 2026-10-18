import type { Page } from '@playwright/test';
import { expect, fakeGateway, test } from './fixtures';

const product = (i: number, name: string, category: string, rupees: number) => ({
  id: `p${i}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
  description: `${name}: a great pick for everyday use.`,
  category,
  pricePaise: rupees * 100,
  currency: 'INR',
  images: [],
  version: 1,
  createdAt: '2026-10-01T10:00:00.000Z',
  attributes: category === 'phones' ? { ram: '8GB', storage: '128GB' } : { size: 'M' },
});

const page1 = [
  product(1, 'OnePlus Nord CE 4 (8GB, 128GB)', 'phones', 24999),
  product(2, 'Samsung Galaxy M34 5G', 'phones', 16999),
  product(3, 'Lenovo IdeaPad Slim 3', 'laptops', 45990),
  product(4, 'Noise ColorFit Ultra 3', 'watches', 2999),
];
const page2 = [product(5, 'Puma Nitro Running Shoes', 'shoes', 7499)];

async function catalogApi(page: Page) {
  const calls: URL[] = [];
  await page.route('**/v1/products?*', (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    const category = url.searchParams.get('category');
    const items = url.searchParams.get('cursor') === 'c2' ? page2 : page1.filter((p) => !category || p.category === category);
    const nextCursor = url.searchParams.get('cursor') || category ? null : 'c2';
    return route.fulfill({ json: { items, nextCursor } });
  });
  await page.route('**/v1/products/*', (route) => {
    const slug = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!);
    const found = [...page1, ...page2].find((p) => p.slug === slug);
    return found
      ? route.fulfill({ json: found })
      : route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Product not found', correlationId: 'e2e' } });
  });
  return calls;
}

test('browse: grid, load more, category filter in the URL', async ({ page, isMobile }) => {
  await fakeGateway(page);
  const calls = await catalogApi(page);
  await page.goto('/products');

  await expect(page.getByRole('heading', { name: 'All products' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByText('₹24,999')).toBeVisible();

  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await expect(page.getByText('You have seen all 5 products')).toBeVisible();

  if (isMobile) await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'Phones', exact: true }).click();
  await expect(page).toHaveURL('/products?category=phones');
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(calls.at(-1)?.searchParams.get('category')).toBe('phones');
});

test('search from the header sends q and price filters in paise', async ({ page, isMobile }) => {
  await fakeGateway(page);
  const calls = await catalogApi(page);
  await page.goto('/');

  await page.getByRole('searchbox', { name: 'Search products' }).fill('phone');
  await page.getByRole('searchbox', { name: 'Search products' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Results for “phone”' })).toBeVisible();

  if (isMobile) await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByLabel('Min').fill('1000');
  await page.getByLabel('Max').fill('20000');
  await page.getByRole('button', { name: 'Apply price' }).click();
  await expect(page).toHaveURL(/min=1000&max=20000/);
  // The request for the new filters starts just AFTER the URL changes: wait for it.
  await expect.poll(() => calls.at(-1)?.searchParams.get('minPrice')).toBe('100000');
  const last = calls.at(-1)!;
  expect(last.searchParams.get('q')).toBe('phone');
  expect(last.searchParams.get('maxPrice')).toBe('2000000');
});

test('product detail, and add to cart asks a guest to log in', async ({ page }) => {
  await fakeGateway(page);
  await catalogApi(page);
  await page.goto('/products');

  await page.getByRole('link', { name: /OnePlus Nord CE 4/ }).click();
  await expect(page).toHaveURL('/products/oneplus-nord-ce-4-8gb-128gb');
  await expect(page.getByRole('heading', { level: 1, name: /OnePlus Nord CE 4/ })).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: '128GB' })).toBeVisible(); // specifications

  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL('/login?returnTo=%2Fproducts%2Foneplus-nord-ce-4-8gb-128gb');
});

test('logged in: add to cart calls the API and shows a toast', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  await catalogApi(page);
  let added: unknown;
  await page.route('**/v1/cart/items', (route) => {
    added = route.request().postDataJSON();
    return json(route, 201, { items: [], itemCount: 2, subtotalPaise: 0, pricingAvailable: true, coupon: null, discountPaise: 0, totalPaise: 0 });
  });

  await page.goto('/products/oneplus-nord-ce-4-8gb-128gb');
  await page.getByRole('button', { name: 'Increase' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByText('Added to your cart')).toBeVisible();
  expect(added).toEqual({ productId: 'p1', qty: 2 });
});

test('unknown product shows not found', async ({ page }) => {
  await fakeGateway(page);
  await catalogApi(page);
  await page.goto('/products/nope');
  await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
});
