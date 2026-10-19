/** The user service's password rule, checked before a request. */
export function passwordProblem(password: string): string | undefined {
  if (password.length < 8 || password.length > 72) return 'Use 8–72 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least one letter and one digit';
  return undefined;
}

export const PASSWORD_HINT = '8–72 characters, at least one letter and one digit';

/**
 * The one-time token from an email link: /reset-password#token=...
 * It sits after '#', so the browser never sends it to a server (no logs).
 */
export function tokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  return token && token.length >= 20 ? token : null;
}
