import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { syncService } from './syncService';
import { db } from '../db';

describe('syncService (Cloud Sync & Single Account per device)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await syncService.clearLocalData();
  });

  it('registers a new shop and sets up cloud storage', async () => {
    const newShop = await syncService.registerShop({
      name: 'Boutique Alpha',
      phone: '70112233',
      city: 'Ouagadougou',
      pinCode: '1234',
      currency: 'FCFA'
    });

    expect(newShop.id).toBeDefined();
    expect(newShop.name).toBe('Boutique Alpha');

    // Vérifier la présence dans Dexie locale
    const local = await db.shopProfiles.get(newShop.id);
    expect(local?.name).toBe('Boutique Alpha');

    // Vérifier la présence dans le Cloud
    const cloudDb = syncService.getCloudDatabase();
    expect(cloudDb[newShop.id]).toBeDefined();
    expect(cloudDb[newShop.id].profile.name).toBe('Boutique Alpha');
  });

  it('allows connecting on another device and restores all data', async () => {
    // 1. Enregistrement initial sur Appareil 1
    const shop = await syncService.registerShop({
      name: 'Superette Bobo',
      phone: '75001122',
      city: 'Bobo-Dioulasso',
      pinCode: '4321',
      currency: 'FCFA'
    });

    // Ajout d'articles et dettes sur Appareil 1
    await db.products.put({
      id: 'prod_1',
      name: 'Riz 25kg',
      price: 15000,
      createdAt: new Date().toISOString()
    });
    await syncService.pushLocalChanges(shop.id);

    // 2. Simulation de l'Appareil 2 (vide au départ)
    await syncService.clearLocalData();
    const countBefore = await db.products.count();
    expect(countBefore).toBe(0);

    // Connexion sur Appareil 2 avec Téléphone + Code PIN
    const loginRes = await syncService.loginAndRestore('75001122', '4321');
    expect(loginRes.success).toBe(true);
    expect(loginRes.shop?.name).toBe('Superette Bobo');

    // Les données sont maintenant restaurées en local sur Appareil 2 !
    const productsAfter = await db.products.toArray();
    expect(productsAfter).toHaveLength(1);
    expect(productsAfter[0].name).toBe('Riz 25kg');
  });

  it('rejects login if PIN is incorrect', async () => {
    await syncService.registerShop({
      name: 'Kiosque Ouaga',
      phone: '70998877',
      city: 'Ouagadougou',
      pinCode: '9999',
      currency: 'FCFA'
    });

    // Tentative de connexion avec mauvais code PIN
    const res = await syncService.loginAndRestore('70998877', '0000');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Code PIN incorrect/i);
  });

  it('exports and imports backup JSON file successfully', async () => {
    const shop = await syncService.registerShop({
      name: 'Boutique Sauvegarde',
      phone: '70223344',
      currency: 'FCFA'
    });

    await db.products.put({
      id: 'prod_sauv',
      name: 'Sucre St Louis',
      price: 1000,
      createdAt: new Date().toISOString()
    });

    const jsonBackup = await syncService.exportBackupData(shop.id);
    expect(jsonBackup).toContain('Boutique Sauvegarde');
    expect(jsonBackup).toContain('Sucre St Louis');

    // Vider la base locale
    await syncService.clearLocalData();
    expect(await db.products.count()).toBe(0);

    // Restaurer depuis le fichier JSON
    const importRes = await syncService.importBackupData(jsonBackup);
    expect(importRes.success).toBe(true);
    expect(importRes.shop?.name).toBe('Boutique Sauvegarde');

    const products = await db.products.toArray();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Sucre St Louis');
  });

  it('detects already registered phone number and prevents creating a 2nd account', async () => {
    // 1. Première inscription réussie
    await syncService.registerShop({
      name: 'Boutique Maman Tina',
      phone: '70 12 34 56',
      city: 'Ouagadougou',
      pinCode: '1111',
      currency: 'FCFA'
    });

    // 2. Vérification avec checkPhoneRegistered
    const checkTaken = await syncService.checkPhoneRegistered('70123456');
    expect(checkTaken.exists).toBe(true);
    expect(checkTaken.shopName).toBe('Boutique Maman Tina');

    const checkWithPrefix = await syncService.checkPhoneRegistered('+226 70 12 34 56');
    expect(checkWithPrefix.exists).toBe(true);

    const checkFree = await syncService.checkPhoneRegistered('75998877');
    expect(checkFree.exists).toBe(false);

    // 3. Tentative de création d'un 2ème compte avec le même numéro -> doit échouer
    await expect(
      syncService.registerShop({
        name: 'Deuxieme Boutique Tentative',
        phone: '+226 70 12 34 56',
        city: 'Bobo-Dioulasso',
        pinCode: '2222',
        currency: 'FCFA'
      })
    ).rejects.toThrow(/déjà associé/i);
  });

  it('protects active Cloud subscription from being overwritten by an expired local profile during pushLocalChanges', async () => {
    // 1. Inscription initiale
    const shop = await syncService.registerShop({
      name: 'Boutique Test Protection',
      phone: '70889900',
      currency: 'FCFA'
    });

    // 2. Simuler que le téléphone local a un profil expiré
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await db.shopProfiles.update(shop.id, {
      subscriptionStatus: 'expired',
      subscriptionExpiresAt: pastDate
    });

    // 3. Simuler que l'Admin a activé la boutique sur le Cloud pour 1 mois
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const cloudDb = syncService.getCloudDatabase();
    cloudDb[shop.id].profile.subscriptionStatus = 'active';
    cloudDb[shop.id].profile.subscriptionPlan = 'monthly';
    cloudDb[shop.id].profile.subscriptionExpiresAt = futureDate;
    cloudDb[shop.id].profile.licenseKey = 'ADMIN-MANUAL-1M-TEST';
    cloudDb[shop.id].licenses = [{
      id: 'lic_test_1',
      code: 'ADMIN-MANUAL-1M-TEST',
      plan: 'monthly',
      durationDays: 30,
      price: 2000,
      createdAt: new Date().toISOString(),
      isUsed: true,
      usedByShopId: shop.id,
      usedByShopName: shop.name,
      usedAt: new Date().toISOString()
    }];
    syncService.saveCloudDatabase(cloudDb);

    // 4. Le commerçant déclenche pushLocalChanges (ex: après une vente)
    await syncService.pushLocalChanges(shop.id);

    // 5. Vérifier que l'IndexedDB locale a ADOPTÉ la licence active
    const localAfter = await db.shopProfiles.get(shop.id);
    expect(localAfter?.subscriptionStatus).toBe('active');
    expect(localAfter?.subscriptionPlan).toBe('monthly');
    expect(localAfter?.subscriptionExpiresAt).toBe(futureDate);
    expect(localAfter?.licenseKey).toBe('ADMIN-MANUAL-1M-TEST');

    // 6. Vérifier que le Cloud n'a PAS été écrasé
    const cloudAfter = syncService.getCloudDatabase();
    expect(cloudAfter[shop.id].profile.subscriptionStatus).toBe('active');
    expect(cloudAfter[shop.id].profile.subscriptionExpiresAt).toBe(futureDate);
  });
});

