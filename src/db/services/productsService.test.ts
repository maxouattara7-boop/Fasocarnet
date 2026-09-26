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

  it('manages stock quantities, alerts and restock operations', async () => {
    // 1. Creation with stock and min alert
    const p1 = await productsService.create('Lait Nido 400g', 3500, undefined, undefined, 10, 3);
    const p2 = await productsService.create('Sucre 1kg', 800, undefined, undefined, 2, 5);
    const p3 = await productsService.create('Service Divers', 1000); // stock par defaut 0

    expect(p1.stockQuantity).toBe(10);
    expect(p1.minStockAlert).toBe(3);
    expect(p3.stockQuantity).toBe(0);

    // 2. Low stock retrieval (p2 a 2 <= 5, p3 a 0 <= 5)
    let lowStockList = await productsService.getLowStockProducts();
    expect(lowStockList.length).toBe(2);

    // 3. Stock decrementation
    await productsService.decrementStock([
      { productId: p1.id, description: p1.name, quantity: 8 }, // 10 - 8 = 2 (now <= 3 alert)
      { productId: p2.id, description: p2.name, quantity: 5 }  // 2 - 5 = 0 (never negative)
    ]);

    const p1After = await productsService.getById(p1.id);
    const p2After = await productsService.getById(p2.id);

    expect(p1After?.stockQuantity).toBe(2);
    expect(p2After?.stockQuantity).toBe(0);

    // All 3 are now low stock or out of stock
    lowStockList = await productsService.getLowStockProducts();
    expect(lowStockList.length).toBe(3);

    // 4. Restock
    await productsService.addStock(p1.id, 15); // 2 + 15 = 17
    const p1Restocked = await productsService.getById(p1.id);
    expect(p1Restocked?.stockQuantity).toBe(17);

    // 5. Direct stock override
    await productsService.setStock(p2.id, 50);
    const p2Overridden = await productsService.getById(p2.id);
    expect(p2Overridden?.stockQuantity).toBe(50);
  });
});
