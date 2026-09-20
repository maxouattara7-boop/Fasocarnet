import { describe, it, expect } from 'vitest';
import { formatCurrency, cleanPhoneNumber, calculateChange } from './formatters';

describe('formatters', () => {
  it('formats currency correctly in FCFA', () => {
    expect(formatCurrency(15000)).toBe('15 000 FCFA');
    expect(formatCurrency(0)).toBe('0 FCFA');
    expect(formatCurrency(1250500)).toBe('1 250 500 FCFA');
  });

  it('cleans West African phone numbers correctly', () => {
    expect(cleanPhoneNumber('70 12 34 56')).toBe('22670123456');
    expect(cleanPhoneNumber('+226 75 00 11 22')).toBe('22675001122');
    expect(cleanPhoneNumber('00226 78 99 88 77')).toBe('22678998877');
  });

  it('calculates change accurately', () => {
    expect(calculateChange(5000, 10000)).toBe(5000);
    expect(calculateChange(5000, 5000)).toBe(0);
    expect(calculateChange(5000, 2000)).toBe(0);
  });
});
