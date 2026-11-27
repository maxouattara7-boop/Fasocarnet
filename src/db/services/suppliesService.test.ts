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
  });

  it('increments product stockQuantity and updates costPrice for all items in the batch', async () => {
    await db.products.bulkPut([
      {
        id: 'p1',
        name: 'Riz 25kg',
        price: 12000,
        costPrice: 10000,
        stockQuantity: 5,
        createdAt: '2026-11-01T08:00:00.000Z',
      },
      {
        id: 'p2',
        name: 'Huile 5L',
        price: 5000,
        stockQuantity: 0,
        createdAt: '2026-11-01T08:00:00.000Z',
      },
    ]);

    const eventSpy = vi.spyOn(window, 'dispatchEvent');

    const batch = await suppliesService.recordBatchSupply({
      supplyDate: '2026-11-27',
      supplierName: 'Grossiste Ouaga',
      items: [
        { productId: 'p1', quantity: 10, costPrice: 9500 },
        { productId: 'p2', quantity: 20, costPrice: 4000, sellingPrice: 5200 },
      ],
    });

    expect(batch.items).toHaveLength(2);
    expect(batch.totalQuantity).toBe(30);

    const updatedP1 = await db.products.get('p1');
    const updatedP2 = await db.products.get('p2');

    expect(updatedP1?.stockQuantity).toBe(15);
    expect(updatedP1?.costPrice).toBe(9500);
    expect(updatedP2?.stockQuantity).toBe(20);
    expect(updatedP2?.price).toBe(5200);
    expect(eventSpy).toHaveBeenCalled();

    eventSpy.mockRestore();
  });
});
