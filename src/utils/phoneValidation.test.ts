import { describe, it, expect } from 'vitest';
import { cleanPhoneNumber, formatPhoneNumberDisplay, isValidPhoneNumber } from './phoneValidation';

describe('phoneValidation', () => {
  describe('cleanPhoneNumber', () => {
    it('removes all non-digit characters except leading plus', () => {
      expect(cleanPhoneNumber('70-12-34-56')).toBe('70123456');
      expect(cleanPhoneNumber('70 12 34 56')).toBe('70123456');
      expect(cleanPhoneNumber('abc 70 12 34 56 xyz')).toBe('70123456');
      expect(cleanPhoneNumber('+226 70 12 34 56')).toBe('+22670123456');
      expect(cleanPhoneNumber('(+226) 70.12.34.56')).toBe('22670123456');
    });

    it('returns empty string for empty input', () => {
      expect(cleanPhoneNumber('')).toBe('');
    });
  });

  describe('formatPhoneNumberDisplay', () => {
    it('formats 8-digit number in pairs of 2', () => {
      expect(formatPhoneNumberDisplay('70123456')).toBe('70 12 34 56');
    });

    it('formats international number with +226 prefix', () => {
      expect(formatPhoneNumberDisplay('+22670123456')).toBe('+226 70 12 34 56');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('validates 8-digit Burkina Faso phone numbers', () => {
      expect(isValidPhoneNumber('70123456').isValid).toBe(true);
      expect(isValidPhoneNumber('60112233').isValid).toBe(true);
    });

    it('validates +226 international format', () => {
      expect(isValidPhoneNumber('+22670123456').isValid).toBe(true);
    });

    it('rejects short numbers less than 8 digits', () => {
      const res = isValidPhoneNumber('70123');
      expect(res.isValid).toBe(false);
      expect(res.message).toContain('trop court');
    });

    it('rejects empty input', () => {
      const res = isValidPhoneNumber('');
      expect(res.isValid).toBe(false);
    });
  });
});
