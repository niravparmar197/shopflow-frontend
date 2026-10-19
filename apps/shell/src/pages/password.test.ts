import { describe, expect, it } from 'vitest';
import { normalisePhone } from './AccountPage';
import { passwordProblem, tokenFromHash } from './password';

describe('account helpers', () => {
  it('reads the token after # only', () => {
    const token = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde';
    expect(tokenFromHash(`#token=${token}`)).toBe(token);
    expect(tokenFromHash('')).toBeNull();
    expect(tokenFromHash('#token=short')).toBeNull();
    expect(tokenFromHash('#other=1')).toBeNull();
  });

  it('uses the same password rule as the user service', () => {
    expect(passwordProblem('secret123')).toBeUndefined();
    expect(passwordProblem('short1')).toMatch(/8–72/);
    expect(passwordProblem('onlyletters')).toMatch(/digit/);
    expect(passwordProblem('x'.repeat(72) + '1')).toMatch(/8–72/);
  });

  it('normalises an Indian mobile like the backend', () => {
    expect(normalisePhone('+91 98765-43210')).toBe('9876543210');
    expect(normalisePhone('09876543210')).toBe('9876543210');
    expect(normalisePhone('')).toBe('');
  });
});
