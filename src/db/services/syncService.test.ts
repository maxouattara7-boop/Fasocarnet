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
});
