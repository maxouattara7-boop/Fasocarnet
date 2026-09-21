import { describe, it, expect } from 'vitest';
import { hashPin, hashPassword, verifyHash, isHashed } from './crypto';

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
});
