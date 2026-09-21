import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { productsService } from './productsService';

describe('productsService', () => {
  beforeEach(async () => {
    await db.products.clear();
  });

  it('creates, retrieves and deletes products from catalog', async () => {
    const p1 = await productsService.create('Sac de riz 25kg', 18500);
    const p2 = await productsService.create("Bidon d'huile 5L", 7500);

    expect(p1.id).toBeDefined();
    expect(p1.name).toBe('Sac de riz 25kg');
    expect(p1.price).toBe(18500);

    const all = await productsService.getAll();
    expect(all.length).toBe(2);

    await productsService.delete(p1.id);
    const afterDelete = await productsService.getAll();
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe(p2.id);
  });

  it('handles barcode associations and lookups', async () => {
    const pWithBarcode = await productsService.create('Coca-Cola 33cl', 500, '5449000000996');
    expect(pWithBarcode.barcode).toBe('5449000000996');

    const found = await productsService.findByBarcode('5449000000996');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Coca-Cola 33cl');
    expect(found?.price).toBe(500);

    const notFound = await productsService.findByBarcode('0000000000000');
    expect(notFound).toBeUndefined();

    // Update with new barcode
    await productsService.update(pWithBarcode.id, { barcode: '1234567890128' });
    const updated = await productsService.findByBarcode('1234567890128');
    expect(updated?.id).toBe(pWithBarcode.id);
  });
});
