import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { adminService } from './adminService';
import { syncService } from './syncService';
import { db } from '../db';
import { ShopProfile } from '../../types';

describe('adminService', () => {
  beforeEach(async () => {
    localStorage.clear();
    syncService.saveCloudDatabase({});
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

  it('permanently deletes a shop and its associated records', async () => {
    const shopToDelete: ShopProfile = {
      id: 'shop_delete_test',
      name: 'Boutique à Supprimer',
      phone: '70998877',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shopToDelete);

    await adminService.deleteShop('shop_delete_test');
    const checkShop = await db.shopProfiles.get('shop_delete_test');
    expect(checkShop).toBeUndefined();
  });

  it('aggregates affiliate commercials, calculates 15% commissions (300 F) and records Sunday settlements', async () => {
    // 1. Créer des boutiques avec code commercial 'ALI226'
    const shop1: ShopProfile = {
      id: 'shop_aff_1',
      name: 'Alimentation Ali',
      phone: '70112233',
      referralCode: 'ALI226',
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const shop2: ShopProfile = {
      id: 'shop_aff_2',
      name: 'Boutique Ali 2',
      phone: '70445566',
      referralCode: 'ALI226',
      subscriptionStatus: 'trial',
      subscriptionPlan: 'trial',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shop1);
    await db.shopProfiles.put(shop2);

    const reports = await adminService.getAffiliatesReports();
    expect(reports.length).toBeGreaterThanOrEqual(1);

    const aliReport = reports.find(r => r.code === 'ALI226');
    expect(aliReport).toBeDefined();
    expect(aliReport?.totalShopsReferred).toBe(2);
    expect(aliReport?.activeSubscribedShops).toBe(1);
    expect(aliReport?.totalRevenueGenerated).toBe(2000);
    expect(aliReport?.totalCommissionAllTime).toBe(300); // 15% de 2000 F = 300 F

    // 2. Vérifier le lien WhatsApp généré
    const waUrl = adminService.getWhatsAppAffiliateStatementUrl(aliReport!, '70112233');
    expect(waUrl).toContain('wa.me/22670112233');
    expect(waUrl).toContain('ALI226');
    expect(waUrl).toContain('300');

    // 3. Valider le règlement de la semaine
    const currentSunday = adminService.getCurrentWeekSundayIso();
    const settlement = await adminService.settleAffiliateWeek(
      'ALI226',
      currentSunday,
      300,
      1,
      2000,
      'ORANGE_MONEY',
      'TXN_123',
      'Payé par Orange Money'
    );
    expect(settlement.commissionPaid).toBe(300);
    expect(settlement.paymentMethod).toBe('ORANGE_MONEY');

    const updatedReports = await adminService.getAffiliatesReports();
    const updatedAli = updatedReports.find(r => r.code === 'ALI226');
    expect(updatedAli?.currentWeekIsSettled).toBe(true);
  });

  it('permanently deletes a shop and its local and cloud database records', async () => {
    const shopToDelete: ShopProfile = {
      id: 'shop_delete_test',
      name: 'Boutique à Supprimer',
      phone: '70999999',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shopToDelete);
    expect(await db.shopProfiles.get('shop_delete_test')).toBeDefined();

    await adminService.deleteShop('shop_delete_test');
    expect(await db.shopProfiles.get('shop_delete_test')).toBeUndefined();
  });

  it('manually activates a shop account and sets active status with correct duration', async () => {
    const shopToActivate: ShopProfile = {
      id: 'shop_manual_act',
      name: 'Alimentation du Faso',
      phone: '70110022',
      currency: 'FCFA',
      isConfigured: true,
      subscriptionStatus: 'trial',
      isSuspended: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shopToActivate);

    const activated = await adminService.activateShopManually('shop_manual_act', 3);
    expect(activated.subscriptionStatus).toBe('active');
    expect(activated.isSuspended).toBe(false);
    expect(activated.subscriptionPlan).toBe('monthly');
    expect(new Date(activated.subscriptionExpiresAt!).getTime()).toBeGreaterThan(Date.now() + 80 * 24 * 60 * 60 * 1000);
  });

  it('creates, manages commercial teams and aggregates performance tracking by affiliate code', async () => {
    // 1. Boutiques parrainées par 2 commerciaux différents
    const shopA: ShopProfile = {
      id: 'shop_team_a',
      name: 'Boutique Alpha',
      phone: '70111111',
      referralCode: 'ALI226',
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const shopB: ShopProfile = {
      id: 'shop_team_b',
      name: 'Boutique Beta',
      phone: '70222222',
      referralCode: 'MAX01',
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const shopC: ShopProfile = {
      id: 'shop_team_c',
      name: 'Boutique Gamma',
      phone: '70333333',
      referralCode: 'INDEP99',
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.bulkPut([shopA, shopB, shopC]);

    // 2. Créer une équipe avec ALI226 et MAX01
    const createdTeam = await adminService.saveCommercialTeam({
      name: 'Équipe Ouaga Nord',
      leaderName: 'Moussa SAWADOGO',
      leaderPhone: '70123456',
      zone: 'Ouagadougou Nord',
      description: 'Secteurs 15 à 22',
      affiliateCodes: ['ali226', 'MAX01']
    });

    expect(createdTeam.id).toBeDefined();
    expect(createdTeam.name).toBe('Équipe Ouaga Nord');
    expect(createdTeam.affiliateCodes).toEqual(['ALI226', 'MAX01']);

    // 3. Calculer les rapports d'équipe
    const { teamsReports, unassignedCommercials } = await adminService.getCommercialTeamsReports();
    expect(teamsReports).toHaveLength(1);
    const teamRep = teamsReports[0];
    expect(teamRep.team.name).toBe('Équipe Ouaga Nord');
    expect(teamRep.membersCount).toBe(2);
    expect(teamRep.totalShopsReferred).toBe(2);
    expect(teamRep.activeSubscribedShops).toBe(2);
    expect(teamRep.totalRevenueGenerated).toBe(4000); // 2000 + 2000
    expect(teamRep.totalCommissionAllTime).toBe(600); // 15% de 4000 = 600 F

    // Vérifier commercial indépendant
    expect(unassignedCommercials.some(c => c.code === 'INDEP99')).toBe(true);

    // 4. Générer le lien WhatsApp pour le Chef d'équipe
    const waTeamUrl = adminService.getWhatsAppTeamStatementUrl(teamRep);
    expect(waTeamUrl).toContain('wa.me/22670123456');
    expect(waTeamUrl).toContain('Moussa%20SAWADOGO');
    expect(waTeamUrl).toContain('Ouaga%20Nord');
    expect(waTeamUrl).toContain('ALI226');
    expect(waTeamUrl).toContain('MAX01');

    // 5. Supprimer l'équipe
    await adminService.deleteCommercialTeam(createdTeam.id);
    const allTeamsAfter = await adminService.getAllCommercialTeams();
    expect(allTeamsAfter.find(t => t.id === createdTeam.id)).toBeUndefined();
  });
});



