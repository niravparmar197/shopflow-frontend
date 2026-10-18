import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import { login, restoreSession } from './auth';
import { newIdempotencyKey, request } from './client';
import { ordersApi } from './endpoints';
import { session } from './session';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const user = { id: 'u1', email: 'a@b.in', fullName: 'Asha', role: 'customer', isActive: true, createdAt: '2026-10-01T00:00:00Z' };

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init ?? {})));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];

beforeEach(() => {
  session.setAnonymous();
});

describe('request', () => {
  it('sends the access token and a correlation id', async () => {
    session.setAuthenticated(user as never, 'tok-1');
    const fetch = mockFetch(() => json(200, { ok: true }));

    await request('/v1/cart');

    const init = fetch.mock.calls[0]![1]!;
    expect(header(init, 'Authorization')).toBe('Bearer tok-1');
    expect(header(init, 'x-correlation-id')).toMatch(/.{8,}/);
    expect(init.credentials).toBe('same-origin');
  });

  it('turns the error body into an ApiError with code, retry time and reference', async () => {
    mockFetch(() =>
      json(429, { code: 'SERVER_BUSY', message: 'Busy', details: { retryAfterSec: 3 }, correlationId: 'cid-9' }, { 'Retry-After': '3' }),
    );

    const err = await request('/v1/orders', { method: 'POST' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 429, code: 'SERVER_BUSY', retryAfterSec: 3, correlationId: 'cid-9' });
  });

  it('maps a network failure to NETWORK_ERROR', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(request('/v1/products')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('on 401 refreshes ONCE for many parallel calls, then retries each call', async () => {
    session.setAuthenticated(user as never, 'old');
    let refreshCalls = 0;
    const fetch = mockFetch(async (url, init) => {
      if (url === '/v1/auth/refresh') {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, { accessToken: 'new', tokenType: 'Bearer', expiresIn: 900 });
      }
      return header(init, 'Authorization') === 'Bearer new' ? json(200, { ok: true }) : json(401, { code: 'UNAUTHORIZED', message: 'expired' });
    });

    const results = await Promise.all([request('/v1/cart'), request('/v1/orders'), request('/v1/users/me')]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1); // reusing a rotated refresh token would revoke the family
    expect(fetch).toHaveBeenCalledTimes(7); // 3 + 1 refresh + 3 retries
    expect(session.getState().status).toBe('authenticated');
  });

  it('logs the user out when the refresh fails', async () => {
    session.setAuthenticated(user as never, 'old');
    mockFetch((url) => (url === '/v1/auth/refresh' ? json(401, { code: 'UNAUTHORIZED', message: 'reused' }) : json(401, { code: 'UNAUTHORIZED', message: 'x' })));

    await expect(request('/v1/cart')).rejects.toMatchObject({ status: 401 });
    expect(session.getState().status).toBe('anonymous');
    expect(session.getAccessToken()).toBeNull();
  });

  it('never refreshes for the auth routes themselves', async () => {
    const fetch = mockFetch(() => json(401, { code: 'UNAUTHORIZED', message: 'Invalid email or password' }));
    await expect(login('a@b.in', 'wrong')).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('orders', () => {
  it('sends the Idempotency-Key and reports a replay', async () => {
    session.setAuthenticated(user as never, 't');
    const key = newIdempotencyKey();
    const fetch = mockFetch(() => json(201, { id: 'o1' }, { 'Idempotent-Replayed': 'true' }));

    const res = await ordersApi.place(key, 249900);

    const init = fetch.mock.calls[0]![1]!;
    expect(header(init, 'Idempotency-Key')).toBe(key);
    expect(JSON.parse(String(init.body))).toEqual({ expectedTotalPaise: 249900 });
    expect(res).toEqual({ order: { id: 'o1' }, replayed: true });
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });
});

describe('restoreSession', () => {
  it('gets a token from the refresh cookie, then loads the user', async () => {
    mockFetch((url) =>
      url === '/v1/auth/refresh' ? json(200, { accessToken: 'fresh', tokenType: 'Bearer', expiresIn: 900 }) : json(200, { user }),
    );
    await restoreSession();
    expect(session.getState()).toEqual({ status: 'authenticated', user });
    expect(session.getAccessToken()).toBe('fresh');
  });

  it('ends anonymous without a valid cookie', async () => {
    mockFetch(() => json(401, { code: 'UNAUTHORIZED', message: 'Missing refresh token' }));
    await restoreSession();
    expect(session.getState().status).toBe('anonymous');
  });
});
