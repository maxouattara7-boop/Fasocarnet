import { db } from '../db';
import { Product } from '../../types';

export const productsService = {
  async getAll(): Promise<Product[]> {
    return await db.products.orderBy('name').toArray();
  },

  async create(name: string, price: number, category?: string): Promise<Product> {
    const newProduct: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      price: Math.max(0, price),
      category: category?.trim(),
      createdAt: new Date().toISOString()
    };
    await db.products.put(newProduct);
    return newProduct;
  },

  async delete(id: string): Promise<void> {
    await db.products.delete(id);
  }
};
