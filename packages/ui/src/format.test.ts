import { describe, expect, it } from 'vitest';
import { formatPaise } from './format';

describe('formatPaise', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatPaise(2499900)).toBe('₹24,999');
    expect(formatPaise(12345678900)).toBe('₹12,34,56,789');
    expect(formatPaise(9950)).toBe('₹99.50');
  });
});
