import { expect, fakeGateway, test } from './fixtures';

test('a guest is sent to login, then back to the page they wanted', async ({ page }) => {
  await fakeGateway(page);
  await page.goto('/orders');

  await expect(page).toHaveURL('/login?returnTo=%2Forders');
  await page.getByLabel('Email').fill('asha@shop.in');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');

  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/orders');
  await expect(page.getByText('Welcome back, Asha Patel!')).toBeVisible();
});

test('the session survives a reload (refresh cookie), and log out ends it', async ({ page }) => {
  await fakeGateway(page, { loggedIn: true });
  await page.goto('/');
  await page.reload();

  await page.getByRole('button', { name: 'Account menu for Asha Patel' }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

test('sign up validates like the backend', async ({ page }) => {
  await fakeGateway(page);
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Asha');
  await page.getByLabel('Email').fill('asha@shop.in');
  await page.getByLabel('Password', { exact: true }).fill('lettersonly');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Use at least one letter and one digit')).toBeVisible();
});
