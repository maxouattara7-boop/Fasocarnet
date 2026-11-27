import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { suppliesService } from './suppliesService';

vi.mock('./syncService', () => ({
  syncService: {
    triggerAutoPush: vi.fn(),
  },
}));

describe('suppliesService.recordBatchSupply', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.supplies.clear();
    await db.expenses.clear();
  });

  it('increments stock, creates new products, and records linked STOCK expense for Bilan', async () => {
    await db.products.put({
      id: 'p1',
      name: 'Riz 25kg',
      price: 12000,
      costPrice: 10000,
      stockQuantity: 5,
      createdAt: '2026-11-01T08:00:00.000Z',
    });

    const eventSpy = vi.spyOn(window, 'dispatchEvent');

    const batch = await suppliesService.recordBatchSupply({
      supplyDate: '2026-11-27',
      supplierName: 'Grossiste Ouaga',
      paymentMethod: 'ORANGE_MONEY',
      items: [
        { productId: 'p1', quantity: 10, costPrice: 9500 },
        { newProductName: 'Sucre 1kg', quantity: 20, costPrice: 600, sellingPrice: 800 },
      ],
    });

    expect(batch.items).toHaveLength(2);
    expect(batch.totalQuantity).toBe(30);
    expect(batch.totalCost).toBe(10 * 9500 + 20 * 600);
    expect(batch.expenseId).toBeDefined();

    // Vérifier la mise à jour du produit existant
    const updatedP1 = await db.products.get('p1');
    expect(updatedP1?.stockQuantity).toBe(15);
    expect(updatedP1?.costPrice).toBe(9500);

    // Vérifier la création du nouvel article avec son stock
    const allProducts = await db.products.toArray();
    const createdSucre = allProducts.find((p) => p.name === 'Sucre 1kg');
    expect(createdSucre).toBeDefined();
    expect(createdSucre?.stockQuantity).toBe(20);
    expect(createdSucre?.price).toBe(800);

    // Vérifier la dépense enregistrée dans db.expenses pour le Bilan
    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].id).toBe(batch.expenseId);
    expect(expenses[0].category).toBe('STOCK');
    expect(expenses[0].paymentMethod).toBe('ORANGE_MONEY');
    expect(expenses[0].amount).toBe(107000);
    expect(expenses[0].title).toContain(batch.batchRef);

    // Vérifier que la suppression de la fiche supprime aussi la dépense liée
    await suppliesService.deleteBatch(batch.batchId);
    expect(await db.supplies.count()).toBe(0);
    expect(await db.expenses.count()).toBe(0);

    expect(eventSpy).toHaveBeenCalled();
    eventSpy.mockRestore();
  });
});
