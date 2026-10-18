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
