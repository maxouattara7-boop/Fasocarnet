import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { subscriptionService } from './subscriptionService';
import { db } from '../db';
import { ShopProfile } from '../../types';
import { generateSignedLicenseKey } from '../../utils/crypto';

describe('subscriptionService', () => {
  beforeEach(async () => {
    await db.shopProfiles.clear();
  });

  it('calculates 10 days trial info by default for a new shop', () => {
    const mockProfile: ShopProfile = {
      id: 'shop_test',
      name: 'Boutique Test',
      phone: '70000000',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const info = subscriptionService.getSubscriptionInfo(mockProfile);
    expect(info.isTrial).toBe(true);
    expect(info.daysRemaining).toBeGreaterThanOrEqual(9);
    expect(info.daysRemaining).toBeLessThanOrEqual(10);
    expect(info.isExpired).toBe(false);
    expect(info.canUseApp).toBe(true);
  });

  it('activates 1 year signed license key successfully and rejects fake keys', async () => {
    const mockProfile: ShopProfile = {
      id: 'shop_123',
      name: 'Alimentation Ouaga',
      phone: '70112233',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(mockProfile);

    // Rejette une fausse clé forgée
    const fakeResult = await subscriptionService.activateLicenseKey('shop_123', 'FASO-PRO-1AN-2026');
    expect(fakeResult.success).toBe(false);
    expect(fakeResult.message).toContain('invalide');

    // Accepte une vraie clé signée par FasoCarnet
    const signedKey = generateSignedLicenseKey('annual');
    const result = await subscriptionService.activateLicenseKey('shop_123', signedKey);
    expect(result.success).toBe(true);
    expect(result.shop?.subscriptionPlan).toBe('annual');
    expect(result.shop?.subscriptionStatus).toBe('active');

    const updatedInfo = subscriptionService.getSubscriptionInfo(result.shop);
    expect(updatedInfo.daysRemaining).toBeGreaterThanOrEqual(364);
    expect(updatedInfo.isTrial).toBe(false);
  });

  it('prevents reusing an already activated license key and syncs properly', async () => {
    localStorage.clear();
    await db.licenses.clear();

    const shopA: ShopProfile = {
      id: 'shop_a',
      name: 'Boutique A',
      phone: '70000001',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const shopB: ShopProfile = {
      id: 'shop_b',
      name: 'Boutique B',
      phone: '70000002',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.bulkPut([shopA, shopB]);

    // Générer une clé officielle
    const key = {
      id: 'lic_test_123',
      code: 'FASO-1M-TEST-KEY1',
      plan: 'monthly' as const,
      durationDays: 30,
      price: 2000,
      isUsed: false,
      createdAt: new Date().toISOString()
    };
    await db.licenses.put(key);

    // Activer pour boutique A
    const resA = await subscriptionService.activateLicenseKey('shop_a', 'FASO-1M-TEST-KEY1');
    expect(resA.success).toBe(true);

    // Vérifier que la licence est marquée utilisée
    const licInDb = await db.licenses.get('lic_test_123');
    expect(licInDb?.isUsed).toBe(true);
    expect(licInDb?.usedByShopName).toBe('Boutique A');

    // Tenter d'activer pour boutique B -> doit être rejeté
    const resB = await subscriptionService.activateLicenseKey('shop_b', 'FASO-1M-TEST-KEY1');
    expect(resB.success).toBe(false);
    expect(resB.message).toContain('déjà été utilisée');
  });
});
