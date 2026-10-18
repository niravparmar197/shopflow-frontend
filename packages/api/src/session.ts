import type { User } from './types';

type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

export interface SessionState {
  status: SessionStatus;
  user: User | null;
}

type Listener = (state: SessionState) => void;

/*
 * The login session, kept in memory only. The access token is never written to
 * localStorage (an XSS could read it there); after a reload we get a new one from
 * the httpOnly refresh cookie. This module is a Module Federation singleton, so
 * the shell and every remote see the same session.
 */
let state: SessionState = { status: 'unknown', user: null };
let accessToken: string | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l(state));

export const session = {
  getState: (): SessionState => state,

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getAccessToken: (): string | null => accessToken,

  setAccessToken(token: string) {
    accessToken = token;
  },

  setAuthenticated(user: User, token: string) {
    accessToken = token;
    state = { status: 'authenticated', user };
    emit();
  },

  setAnonymous() {
    accessToken = null;
    if (state.status === 'anonymous' && state.user === null) return;
    state = { status: 'anonymous', user: null };
    emit();
  },
};
