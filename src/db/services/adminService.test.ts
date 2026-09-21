import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { adminService } from './adminService';
import { db } from '../db';
import { ShopProfile } from '../../types';

describe('adminService', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.shopProfiles.clear();
    await db.licenses.clear();
    await db.sales.clear();
    await db.debts.clear();
  });

  it('authenticates master admin password correctly', () => {
    expect(adminService.verifyPassword('656126')).toBe(true);
    expect(adminService.verifyPassword('wrongpass')).toBe(false);
    expect(adminService.isAdminCredentials('65616134', '656126')).toBe(true);
    expect(adminService.isAdminCredentials('+22665616134', '656126')).toBe(true);
    expect(adminService.isAdminCredentials('70000000', '656126')).toBe(false);
  });

  it('generates license keys and allows activating them', async () => {
    const keys = await adminService.generateLicenseKeys('monthly', 3, 'Client Test');
    expect(keys).toHaveLength(3);
    expect(keys[0].code).toMatch(/^FASO-1M-/);
    expect(keys[0].plan).toBe('monthly');
    expect(keys[0].isUsed).toBe(false);

    const allLicenses = await adminService.getAllLicenses();
    expect(allLicenses).toHaveLength(3);
  });

  it('computes admin stats and shop details accurately', async () => {
    const shop1: ShopProfile = {
      id: 'shop_admin_1',
      name: 'Superette Ouaga',
      phone: '70000001',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shop1);

    const stats = await adminService.getAdminStats();
    expect(stats.totalShops).toBe(1);
    expect(stats.trialShops).toBe(1);

    const shopsDetails = await adminService.getAllShopsWithDetails();
    expect(shopsDetails).toHaveLength(1);
    expect(shopsDetails[0].name).toBe('Superette Ouaga');

    const extended = await adminService.extendShopLicense('shop_admin_1', 6);
    expect(extended.subscriptionPlan).toBe('semi-annual');
    expect(extended.subscriptionStatus).toBe('active');
  });

  it('computes extended analytics with device installs, operators and cities', async () => {
    const shopOrange: ShopProfile = {
      id: 'shop_orange',
      name: 'Boutique Orange',
      phone: '76000000',
      city: 'Ouagadougou',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const shopMoov: ShopProfile = {
      id: 'shop_moov',
      name: 'Boutique Moov',
      phone: '70000000',
      city: 'Bobo-Dioulasso',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.bulkPut([shopOrange, shopMoov]);

    const analytics = await adminService.getExtendedAnalytics();
    expect(analytics.totalInstalls).toBe(2);
    expect(analytics.operatorStats.orange).toBe(1);
    expect(analytics.operatorStats.moov).toBe(1);
    expect(analytics.cityStats.find(c => c.city === 'Ouagadougou')?.count).toBe(1);
    expect(analytics.cityStats.find(c => c.city === 'Bobo-Dioulasso')?.count).toBe(1);
  });

  it('restores any suspended merchant shop automatically', async () => {
    const shop: ShopProfile = {
      id: 'shop_to_restore',
      name: 'Boutique Suspendue Test',
      phone: '70112233',
      currency: 'FCFA',
      isConfigured: true,
      isSuspended: true,
      suspendedReason: 'Ancienne suspension',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shop);

    const restoredCount = await adminService.restoreAllSuspendedShops();
    expect(restoredCount).toBeGreaterThanOrEqual(1);

    const check = await db.shopProfiles.get('shop_to_restore');
    expect(check?.isSuspended).toBe(false);
    expect(check?.suspendedReason).toBeUndefined();
  });

  it('exports merchant data to formatted CSV', async () => {
    const shop: ShopProfile = {
      id: 'shop_csv_1',
      name: 'Alimentation Faso',
      phone: '76112233',
      ownerName: 'Salif Ouedraogo',
      city: 'Koudougou',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shop);

    const csv = await adminService.exportShopsCsv();
    expect(csv).toContain('ID Boutique;Nom de la Boutique;Téléphone');
    expect(csv).toContain('Alimentation Faso');
    expect(csv).toContain('Salif Ouedraogo');
    expect(csv).toContain('Koudougou');
  });

  it('broadcasts announcement messages to all merchants', async () => {
    await adminService.setBroadcastMessage({
      id: 'bc_test',
      title: 'Mise à jour v1.2',
      message: 'Nouvelles fonctionnalités disponibles !',
      type: 'info',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    const bc = await adminService.getBroadcastMessage();
    expect(bc?.title).toBe('Mise à jour v1.2');
    expect(bc?.isActive).toBe(true);

    await adminService.setBroadcastMessage(null);
    const cleared = await adminService.getBroadcastMessage();
    expect(cleared).toBeNull();
  });

  it('saves and retrieves dynamic Mobile Money deposit numbers', async () => {
    const defaultDep = await adminService.getDepositNumbers();
    expect(defaultDep.orangeMoney).toBe('72990310');
    expect(defaultDep.moovMoney).toBe('03901590');
    expect(defaultDep.wave).toBe('72990310');
    expect(defaultDep.merchantName).toBe('Maxime OUATTARA');

    const updated = await adminService.saveDepositNumbers({
      orangeMoney: '70123456',
      moovMoney: '60987654',
      wave: '70123456',
      merchantName: 'FasoCarnet Support Officiel'
    });

    expect(updated.orangeMoney).toBe('70123456');
    expect(updated.moovMoney).toBe('60987654');
    expect(updated.wave).toBe('70123456');
    expect(updated.merchantName).toBe('FasoCarnet Support Officiel');

    const fetched = await adminService.getDepositNumbers();
    expect(fetched.orangeMoney).toBe('70123456');
    expect(fetched.merchantName).toBe('FasoCarnet Support Officiel');
  });
});

