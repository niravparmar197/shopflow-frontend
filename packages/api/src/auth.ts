import { refreshAccessToken, request } from './client';
import { session } from './session';
import type { LoginResponse, User } from './types';

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await request<LoginResponse>('/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  session.setAuthenticated(res.user, res.accessToken);
  return res.user;
}

/** Creates the account. The backend returns no token: log in next. */
export async function signup(input: SignupInput): Promise<User> {
  const res = await request<{ user: User }>('/v1/auth/signup', {
    method: 'POST',
    auth: false,
    body: input,
  });
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    // Revokes the refresh token family and clears the cookie.
    await request<void>('/v1/auth/logout', { method: 'POST', auth: false });
  } finally {
    session.setAnonymous();
  }
}

/* ---------- Account (Phase 2 P3) ---------- */

/** Emails a reset link if the account exists. Same answer either way. */
export async function forgotPassword(email: string): Promise<void> {
  await request<void>('/v1/auth/forgot-password', { method: 'POST', auth: false, body: { email } });
}

/** New password from the emailed link. Every device is logged out, this one too. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await request<void>('/v1/auth/reset-password', { method: 'POST', auth: false, body: { token, password } });
  session.setAnonymous();
}

/** Confirms the email from the link. Updates the session if it is this user. */
export async function verifyEmail(token: string): Promise<User> {
  const { user } = await request<{ user: User }>('/v1/auth/verify-email', { method: 'POST', auth: false, body: { token } });
  // Opened from the email = a fresh page load, so the session may still be
  // restoring (and may load the user from before this click). Wait, then
  // put the confirmed user in.
  if (restoring) await restoring;
  session.updateUser(user);
  return user;
}

export async function resendVerification(): Promise<void> {
  await request<void>('/v1/users/me/verify-email', { method: 'POST' });
}

/** Logged in. This device stays logged in; other devices are logged out. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<void>('/v1/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
}

export async function updateProfile(changes: { fullName?: string; phone?: string | null }): Promise<User> {
  const { user } = await request<{ user: User }>('/v1/users/me', { method: 'PATCH', body: changes });
  session.updateUser(user);
  return user;
}

// The user service wraps it: { user: {...} }
const getMe = async () => (await request<{ user: User }>('/v1/users/me')).user;

let restoring: Promise<void> | null = null;

/**
 * After a page load: the access token is gone (memory only), but the refresh
 * cookie may still be valid. Ask for a new token, then load the user.
 */
export function restoreSession(): Promise<void> {
  restoring ??= (async () => {
    try {
      const token = await refreshAccessToken();
      if (!token) {
        session.setAnonymous();
        return;
      }
      const user = await getMe();
      session.setAuthenticated(user, token);
    } catch {
      session.setAnonymous();
    } finally {
      restoring = null;
    }
  })();
  return restoring;
}
