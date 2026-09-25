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

  it('manages custom server URL configuration', () => {
    expect(syncService.getServerUrl()).toBe('http://localhost:5000');
    syncService.setServerUrl('https://api.fasocarnet.com/');
    expect(syncService.getServerUrl()).toBe('https://api.fasocarnet.com');
    syncService.setServerUrl('');
    expect(syncService.getServerUrl()).toBe('http://localhost:5000');
  });
});
