import { describe, expect, it } from 'vitest';
import { shortName } from './components/Reviews';
import { formatLeft } from './pages/DealsPage';
import { attributeLabel } from './pages/ProductDetailPage';

describe('catalog labels', () => {
  it('spec names', () => {
    expect(attributeLabel('storage')).toBe('Storage');
    expect(attributeLabel('batteryLife')).toBe('Battery life');
    expect(attributeLabel('ram')).toBe('RAM');
  });
  it('review author: first name + initial', () => {
    expect(shortName('Asha Patel')).toBe('Asha P.');
    expect(shortName('  Ravi  ')).toBe('Ravi');
    expect(shortName('A')).toBe('A.');
  });
  it('time left', () => {
    expect(formatLeft(3725)).toBe('1h 02m 05s');
    expect(formatLeft(65)).toBe('01m 05s');
    expect(formatLeft(-3)).toBe('00m 00s');
  });
});
