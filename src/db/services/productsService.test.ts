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
});
