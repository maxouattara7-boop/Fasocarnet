import { describe, it, expect } from 'vitest';
import { 
  hashPin, 
  hashPassword, 
  verifyHash, 
  isHashed,
  generateSignedLicenseKey,
  verifyLicenseSignature,
  generateShopAuthToken,
  verifyShopAuthToken
} from './crypto';

describe('crypto security utility', () => {
  it('hashes a PIN with salt in sha256$<salt>$<hash> format', () => {
    const hashed = hashPin('1234');
    expect(hashed).toMatch(/^sha256\$[a-f0-9]{16}\$[a-f0-9]{64}$/);
    expect(isHashed(hashed)).toBe(true);
    expect(isHashed('1234')).toBe(false);
  });

  it('verifies correctly matching PIN and rejects incorrect PIN', () => {
    const hashed = hashPin('5678');
    expect(verifyHash('5678', hashed)).toBe(true);
    expect(verifyHash('0000', hashed)).toBe(false);
    expect(verifyHash('5679', hashed)).toBe(false);
  });

  it('supports legacy cleartext PINs seamlessly for backward compatibility', () => {
    expect(verifyHash('1234', '1234')).toBe(true);
    expect(verifyHash('wrong', '1234')).toBe(false);
  });

  it('hashes admin password and verifies correctly', () => {
    const hashedPass = hashPassword('faso2026');
    expect(verifyHash('faso2026', hashedPass)).toBe(true);
    expect(verifyHash('wrongpassword', hashedPass)).toBe(false);
  });

  it('generates unique salts for same input', () => {
    const hash1 = hashPin('1111');
    const hash2 = hashPin('1111');
    expect(hash1).not.toBe(hash2); // Différents sels
    expect(verifyHash('1111', hash1)).toBe(true);
    expect(verifyHash('1111', hash2)).toBe(true);
  });

  describe('cryptographic license keys', () => {
    it('generates and verifies valid signed license keys for all plan durations', () => {
      const monthlyKey = generateSignedLicenseKey('monthly');
      const monthlyRes = verifyLicenseSignature(monthlyKey);
      expect(monthlyRes.isValid).toBe(true);
      expect(monthlyRes.plan).toBe('monthly');
      expect(monthlyRes.durationDays).toBe(30);

      const semiKey = generateSignedLicenseKey('semi-annual');
      const semiRes = verifyLicenseSignature(semiKey);
      expect(semiRes.isValid).toBe(true);
      expect(semiRes.plan).toBe('semi-annual');
      expect(semiRes.durationDays).toBe(180);

      const annualKey = generateSignedLicenseKey('annual');
      const annualRes = verifyLicenseSignature(annualKey);
      expect(annualRes.isValid).toBe(true);
      expect(annualRes.plan).toBe('annual');
      expect(annualRes.durationDays).toBe(365);
    });

    it('rejects tampered or forged license keys', () => {
      expect(verifyLicenseSignature('FASO-1AN-FAKE-0000').isValid).toBe(false);
      expect(verifyLicenseSignature('FASO-6M-ABCD-EFGH').isValid).toBe(false);
      expect(verifyLicenseSignature('RANDOM_CODE_123').isValid).toBe(false);
      expect(verifyLicenseSignature('FASO-1M-AAAA').isValid).toBe(false);
    });
  });

  describe('shop authorization tokens', () => {
    it('generates and validates shop auth tokens', () => {
      const token = generateShopAuthToken('shop_123', '70000000');
      expect(token).toMatch(/^fct_shop_123_[a-f0-9]{24}$/);
      expect(verifyShopAuthToken(token, 'shop_123', '70000000')).toBe(true);
      expect(verifyShopAuthToken(token, 'shop_123', '70000001')).toBe(false);
      expect(verifyShopAuthToken(token, 'shop_999', '70000000')).toBe(false);
    });
  });
});
