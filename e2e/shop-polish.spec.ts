import type { Page } from '@playwright/test';
import { expect, fakeGateway, test } from './fixtures';

// Phase 2 P5: sorting, categories from the API, wishlist, reviews, deals.
const product = (i: number, name: string, category: string, rupees: number, rating = 0, reviews = 0) => ({
  id: `${'0'.repeat(23)}${i}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  description: `${name}: a great pick.`,
  category,
  pricePaise: rupees * 100,
  currency: 'INR',
  images: [],
  version: 1,
  createdAt: '2026-10-01T10:00:00.000Z',
  attributes: {},
  ratingAvg: rating,
  ratingCount: reviews,
});
const PHONE = product(1, 'Nova X5', 'phones', 18999, 4.5, 2);
const SHOE = product(2, 'CityWalk Sneakers', 'shoes', 2499);
const ALL = [PHONE, SHOE];

async function catalog(page: Page) {
  const listCalls: URL[] = [];
  await page.route('**/v1/products?*', (route) => {
    const url = new URL(route.request().url());
    listCalls.push(url);
    const ids = url.searchParams.get('ids');
    const items = ids ? ALL.filter((p) => ids.split(',').includes(p.id)) : ALL;
    return route.fulfill({ json: { items, nextCursor: null } });
  });
  await page.route('**/v1/products/categories', (route) =>
    route.fulfill({ json: { items: [{ slug: 'phones', count: 4 }, { slug: 'shoes', count: 3 }, { slug: 'toys', count: 1 }] } }),
  );
  await page.route(`**/v1/products/${PHONE.slug}`, (route) => route.fulfill({ json: PHONE }));
  return listCalls;
}

const review = (id: string, rating: number, authorName: string) => ({
  id,
  rating,
  title: rating > 4 ? 'Love it' : 'Good',
  body: 'Battery lasts two days and the camera is fine.',
  authorName,
  verifiedPurchase: true,
  createdAt: '2026-10-10T10:00:00.000Z',
  updatedAt: '2026-10-10T10:00:00.000Z',
});

test('sort by price and categories with counts from the API', async ({ page, isMobile }) => {
  await fakeGateway(page);
  const calls = await catalog(page);
  await page.goto('/products');
  await expect(page.getByRole('article')).toHaveCount(2);

  await page.getByRole('combobox', { name: 'Sort products' }).selectOption('price_asc');
  await expect(page).toHaveURL('/products?sort=price_asc');
  await expect.poll(() => calls.at(-1)?.searchParams.get('sort')).toBe('price_asc');

  if (isMobile) await page.getByRole('button', { name: 'Filters' }).click();
  // "Toys" only exists in the API's list: the panel uses it.
  await expect(page.getByRole('button', { name: /Toys\s*1/ })).toBeVisible();
  await page.getByRole('button', { name: /Shoes\s*3/ }).click();
  await expect(page).toHaveURL('/products?category=shoes&sort=price_asc'); // the order stays
});

test('ratings on cards; a guest tapping the heart is asked to log in', async ({ page }) => {
  await fakeGateway(page);
  await catalog(page);
  await page.goto('/products');
  await expect(page.getByRole('img', { name: 'Rated 4.5 out of 5' })).toBeVisible();
  await page.getByRole('button', { name: 'Save Nova X5 to wishlist' }).click();
  await expect(page).toHaveURL('/login?returnTo=%2Fproducts');
});

test('wishlist: save from a card, see it on /wishlist, remove it', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  await catalog(page);
  let saved: string[] = [];
  await page.route('**/v1/users/me/wishlist', (route) =>
    json(route, 200, { items: saved.map((productId) => ({ productId, createdAt: '2026-10-19T10:00:00.000Z' })) }),
  );
  await page.route('**/v1/users/me/wishlist/*', (route) => {
    const id = route.request().url().split('/').pop()!;
    saved = route.request().method() === 'PUT' ? [id, ...saved.filter((s) => s !== id)] : saved.filter((s) => s !== id);
    return route.fulfill({ status: 204 });
  });

  await page.goto('/products');
  const heart = page.getByRole('button', { name: 'Save Nova X5 to wishlist' });
  await heart.click();
  await expect(page.getByRole('button', { name: 'Remove Nova X5 from wishlist' })).toHaveAttribute('aria-pressed', 'true');
  expect(saved).toEqual([PHONE.id]);

  await page.goto('/wishlist');
  await expect(page.getByRole('heading', { name: 'Your wishlist' })).toBeVisible();
  await expect(page.getByText('1 saved product')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove Nova X5 from wishlist' }).click();
  await expect(page.getByRole('heading', { name: 'Your wishlist is empty' })).toBeVisible();
});

test('reviews: summary and list; a buyer writes one; a non-buyer is told why', async ({ page }) => {
  const { json } = await fakeGateway(page, { loggedIn: true });
  await catalog(page);
  const reviews = [review('r1', 5, 'Ravi K.'), review('r2', 4, 'Meena S.')];
  await page.route(`**/v1/products/${PHONE.id}/reviews?*`, (route) =>
    json(route, 200, {
      items: reviews,
      nextCursor: null,
      summary: { ratingAvg: 4.5, ratingCount: 2, stars: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } },
    }),
  );
  await page.route(`**/v1/products/${PHONE.id}/reviews/mine`, (route) =>
    json(route, 404, { code: 'REVIEW_NOT_FOUND', message: 'You have not reviewed this product', correlationId: 'e2e' }),
  );
  let buyer = false;
  let written: unknown;
  await page.route(`**/v1/products/${PHONE.id}/reviews`, (route) => {
    written = route.request().postDataJSON();
    return buyer
      ? json(route, 200, { ...review('r3', 4, 'Asha P.'), ...(written as object) })
      : json(route, 403, { code: 'NOT_A_BUYER', message: 'Only customers who received this product can review it', correlationId: 'e2e' });
  });

  await page.goto(`/products/${PHONE.slug}`);
  await expect(page.getByRole('heading', { name: 'Ratings and reviews' })).toBeVisible();
  await expect(page.getByText('Ravi K.')).toBeVisible();
  await expect(page.getByText('Verified purchase').first()).toBeVisible();
  await expect(page.getByRole('list', { name: 'Reviews by stars' })).toContainText('5 star');

  await page.getByRole('button', { name: 'Write a review' }).click();
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByText('Please choose 1 to 5 stars')).toBeVisible();

  await page.locator('label', { hasText: '4 stars: Very good' }).click();
  await expect(page.getByRole('radio', { name: '4 stars: Very good' })).toBeChecked();
  await page.getByLabel('Your review').fill('Fast delivery, works well so far.');
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByRole('alert')).toContainText('Only customers who received this product can review it');

  buyer = true;
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByText('Thank you for your review!')).toBeVisible();
  expect(written).toEqual({ rating: 4, body: 'Fast delivery, works well so far.', authorName: 'Asha P.' });
});

test('deals: live flash sales with time and units left; empty state', async ({ page }) => {
  await fakeGateway(page);
  await catalog(page);
  let sales = [{ productId: PHONE.id, left: 3, total: 10, maxPerUser: 1, endsInSec: 3725 }];
  await page.route('**/v1/flash-sales', (route) => route.fulfill({ json: { items: sales } }));

  await page.goto('/deals');
  await expect(page.getByRole('heading', { name: 'Flash deals' })).toBeVisible();
  await expect(page.getByText('3 of 10 left')).toBeVisible();
  await expect(page.getByText(/^1h 02m 0\ds$/)).toBeVisible();
  await expect(page.getByText('Limit 1 per customer')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);

  sales = [];
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No flash deals right now' })).toBeVisible();
});
