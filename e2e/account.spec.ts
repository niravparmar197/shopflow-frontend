import { expect, fakeGateway, test } from './fixtures';

// Phase 2 P3: forgot / reset password, verify email, account page.
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde';

test('forgot password from the login page', async ({ page }) => {
  await fakeGateway(page);
  let sent: unknown;
  await page.route('**/v1/auth/forgot-password', (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ status: 202, json: {} });
  });

  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL('/forgot-password');
  await page.getByLabel('Email').fill(' asha@shop.in ');
  await page.getByRole('button', { name: 'Send reset link' }).click();

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'asha@shop.in' })).toBeVisible();
  expect(sent).toEqual({ email: 'asha@shop.in' });
});

test('reset password: the token leaves the address bar, then log in', async ({ page }) => {
  await fakeGateway(page);
  let sent: unknown;
  await page.route('**/v1/auth/reset-password', (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ status: 204 });
  });

  await page.goto(`/reset-password#token=${TOKEN}`);
  await expect(page).toHaveURL('/reset-password'); // no #token any more
  await page.getByLabel('New password').fill('newpass456');
  await page.getByLabel('Type it again').fill('newpass457');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText('The two passwords are not the same')).toBeVisible();
  expect(sent).toBeUndefined();

  await page.getByLabel('Type it again').fill('newpass456');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByText('Password changed. Please log in')).toBeVisible();
  expect(sent).toEqual({ token: TOKEN, password: 'newpass456' });
});

test('reset password: an old link offers a new one', async ({ page }) => {
  const { json } = await fakeGateway(page);
  await page.route('**/v1/auth/reset-password', (route) =>
    json(route, 400, { code: 'TOKEN_EXPIRED', message: 'This link has expired. Please ask for a new one.', correlationId: 'e2e' }),
  );

  await page.goto(`/reset-password#token=${TOKEN}`);
  await page.getByLabel('New password').fill('newpass456');
  await page.getByLabel('Type it again').fill('newpass456');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('This link has expired');
  await page.getByRole('link', { name: 'Ask for a new link' }).click();
  await expect(page).toHaveURL('/forgot-password');
});

test('reset page without a token says the link is not complete', async ({ page }) => {
  await fakeGateway(page);
  await page.goto('/reset-password');
  await expect(page.getByRole('alert')).toContainText('This link is not complete');
  await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled();
});

test('unconfirmed email: banner, send again, then the link confirms it', async ({ page }) => {
  const { json, user } = await fakeGateway(page, { loggedIn: true, verified: false });
  let resent = 0;
  await page.route('**/v1/users/me/verify-email', (route) => {
    resent++;
    return route.fulfill({ status: 202, json: {} });
  });
  const verifyCalls: unknown[] = [];
  await page.route('**/v1/auth/verify-email', (route) => {
    verifyCalls.push(route.request().postDataJSON());
    return json(route, 200, { user: { ...user, emailVerifiedAt: '2026-10-19T10:00:00.000Z' } });
  });

  await page.goto('/');
  await expect(page.getByText('Please confirm your email')).toBeVisible();
  await page.getByRole('button', { name: 'Send it again' }).click();
  await expect(page.getByText('We sent a new link to asha@shop.in')).toBeVisible();
  expect(resent).toBe(1);

  await page.goto(`/verify-email#token=${TOKEN}`);
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
  await expect(page).toHaveURL('/verify-email');
  expect(verifyCalls).toEqual([{ token: TOKEN }]); // once, even in StrictMode

  await page.getByRole('link', { name: 'Go to my account' }).click();
  await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'ShopFlow home' }).click();
  await expect(page.getByText('Please confirm your email')).toHaveCount(0);
});

test('account page: edit profile and change password', async ({ page }) => {
  const { json, user } = await fakeGateway(page, { loggedIn: true });
  let patched: unknown;
  await page.route('**/v1/users/me', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    patched = route.request().postDataJSON();
    return json(route, 200, { user: { ...user, ...(patched as object) } });
  });
  const changes: unknown[] = [];
  await page.route('**/v1/auth/change-password', (route) => {
    const body = route.request().postDataJSON() as { currentPassword: string };
    changes.push(body);
    return body.currentPassword === 'secret123'
      ? route.fulfill({ status: 204 })
      : json(route, 400, { code: 'WRONG_PASSWORD', message: 'Your current password is not correct', correlationId: 'e2e' });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('link', { name: 'My account' }).click();
  await expect(page).toHaveURL('/account');
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();

  // Profile: the phone goes in clean, like the backend stores it.
  const save = page.getByRole('button', { name: 'Save changes' });
  await expect(save).toBeDisabled(); // nothing changed yet
  await page.getByLabel('Mobile number (optional)').fill('12345');
  await save.click();
  await expect(page.getByText('Enter a 10-digit mobile number')).toBeVisible();
  await page.getByLabel('Mobile number (optional)').fill('+91 98765-43210');
  await save.click();
  await expect(page.getByText('Profile saved')).toBeVisible();
  expect(patched).toEqual({ fullName: 'Asha Patel', phone: '9876543210' });

  // Password: a wrong current password shows on its field.
  await page.getByLabel('Current password').fill('wrong1234');
  await page.getByLabel('New password', { exact: true }).fill('newpass456');
  await page.getByLabel('Type the new password again').fill('newpass456');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Your current password is not correct')).toBeVisible();

  await page.getByLabel('Current password').fill('secret123');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed. Other devices were logged out.')).toBeVisible();
  await expect(page.getByLabel('Current password')).toHaveValue('');
  expect(changes.at(-1)).toEqual({ currentPassword: 'secret123', newPassword: 'newpass456' });
});
