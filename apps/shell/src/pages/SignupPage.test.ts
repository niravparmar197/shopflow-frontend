import { describe, expect, it } from 'vitest';
import { validateSignup } from './SignupPage';

describe('validateSignup (same rules as the user service)', () => {
  it('accepts a valid form', () => {
    expect(validateSignup({ name: 'Asha', email: 'asha@shop.in', password: 'secret123' })).toEqual({});
  });
  it('needs a letter AND a digit in the password', () => {
    expect(validateSignup({ name: 'Asha', email: 'asha@shop.in', password: 'onlyletters' }).password).toMatch(/digit/);
  });
  it('checks name length and email', () => {
    const e = validateSignup({ name: 'A', email: 'nope', password: 'secret123' });
    expect(e.name).toBeDefined();
    expect(e.email).toBeDefined();
  });
});
