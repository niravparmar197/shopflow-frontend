import { ApiError } from './errors';
import { session } from './session';
import type { AccessToken } from './types';

export type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Send the access token (default true). Public calls set false. */
  auth?: boolean;
  /** Idempotency-Key header (place order). Reuse the same key on retry. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/** The raw response for callers that need headers (e.g. Idempotent-Replayed). */
interface ApiResponse<T> {
  data: T;
  headers: Headers;
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function buildUrl(path: string, query?: Query): string {
  // Same origin: Caddy (prod) or the Vite proxy (dev) sends /v1 to the gateway.
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function send(path: string, opts: RequestOptions, correlationId: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-correlation-id': correlationId,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  const token = session.getAccessToken();
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: 'same-origin', // the refresh cookie (path /v1/auth)
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw ApiError.network(err, correlationId);
  }
}

/*
 * One refresh at a time. Ten calls that all get a 401 at once share ONE
 * POST /v1/auth/refresh. That matters: the refresh token rotates, and reusing an
 * old one revokes the whole family (the backend's stolen-token detection).
 */
let refreshing: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const res = await send('/v1/auth/refresh', { method: 'POST', auth: false }, newId());
      if (!res.ok) return null;
      const body = (await res.json()) as AccessToken;
      session.setAccessToken(body.accessToken);
      return body.accessToken;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Sends the call; on an expired token, refreshes once and retries once. Throws on errors. */
async function fetchOk(path: string, opts: RequestOptions): Promise<Response> {
  const correlationId = newId();
  let res = await send(path, opts, correlationId);

  // Expired access token: refresh once, then retry the same call once.
  const canRefresh = opts.auth !== false && !path.startsWith('/v1/auth/');
  if (res.status === 401 && canRefresh) {
    const token = await refreshAccessToken();
    if (!token) {
      session.setAnonymous();
      throw await ApiError.fromResponse(res, correlationId);
    }
    res = await send(path, opts, correlationId);
    if (res.status === 401) session.setAnonymous();
  }

  if (!res.ok) throw await ApiError.fromResponse(res, correlationId);
  return res;
}

export async function requestRaw<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const res = await fetchOk(path, opts);
  const text = res.status === 204 ? '' : await res.text();
  return { data: (text ? JSON.parse(text) : undefined) as T, headers: res.headers };
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return (await requestRaw<T>(path, opts)).data;
}

/**
 * A file from the API (e.g. an invoice PDF). Not a plain <a href>: the call
 * needs the access token, which lives in memory only.
 */
export async function requestFile(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetchOk(path, {});
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? null;
  return { blob: await res.blob(), filename };
}

/** A fresh key per checkout attempt (8-100 letters, digits, - or _). */
export const newIdempotencyKey = (): string => newId();
