import { db } from '../db';
import { Product } from '../../types';

export const productsService = {
  async getAll(): Promise<Product[]> {
    return await db.products.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
  },

  async create(
    name: string,
    price: number,
    barcode?: string,
    category?: string,
    stockQuantity?: number,
    minStockAlert: number = 5,
    costPrice?: number
  ): Promise<Product> {
    let cleanCategory: string | undefined = undefined;
    let cleanStock: number | undefined = undefined;
    let cleanMinAlert = minStockAlert;
    let cleanCost = typeof costPrice === 'number' ? Math.max(0, costPrice) : undefined;

    // Support si category a été omis et que le stock est passé en 4ème argument
    if (typeof category === 'number') {
      cleanStock = category;
      if (typeof stockQuantity === 'number') {
        cleanMinAlert = stockQuantity;
      }
    } else if (typeof category === 'string') {
      cleanCategory = category.trim() || undefined;
      cleanStock = typeof stockQuantity === 'number' ? stockQuantity : undefined;
    } else {
      cleanStock = typeof stockQuantity === 'number' ? stockQuantity : undefined;
    }

    const newProduct: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      price: Math.max(0, price),
      costPrice: cleanCost,
      barcode: barcode?.trim() || undefined,
      category: cleanCategory,
      stockQuantity: typeof cleanStock === 'number' ? Math.max(0, cleanStock) : undefined,
      minStockAlert: typeof cleanMinAlert === 'number' ? Math.max(0, cleanMinAlert) : 5,
      createdAt: new Date().toISOString()
    };
    await db.products.put(newProduct);

    // Si stock initial et coût d'achat renseignés, consigner dans l'historique des approvisionnements
    if (typeof cleanStock === 'number' && cleanStock > 0 && typeof cleanCost === 'number' && cleanCost > 0) {
      await db.supplies.put({
        id: `sup_init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: newProduct.id,
        productName: newProduct.name,
        quantity: cleanStock,
        costPrice: cleanCost,
        sellingPrice: newProduct.price,
        totalCost: cleanStock * cleanCost,
        notes: 'Stock initial à la création',
        createdAt: newProduct.createdAt
      });
    }

    return newProduct;
  },

  async findByBarcode(barcode: string): Promise<Product | undefined> {
    const cleanCode = barcode.trim();
    if (!cleanCode) return undefined;
    return await db.products.where('barcode').equals(cleanCode).first();
  },

  async update(id: string, updates: Partial<Product>): Promise<void> {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Décrémente le stock des articles vendus lors d'un encaissement
   */
  async decrementStock(items?: { id?: string; productId?: string; description?: string; quantity: number }[]): Promise<void> {
    if (!items || items.length === 0) return;

    for (const item of items) {
      const targetId = item.productId || item.id;
      let product: Product | undefined;

      if (targetId) {
        product = await db.products.get(targetId);
      }
      
      // Fallback par nom de description si non trouvé par ID
      if (!product && item.description) {
        product = await db.products.where('name').equals(item.description.trim()).first();
      }

      if (product && typeof product.stockQuantity === 'number') {
        const qtyToDeduct = Math.max(1, item.quantity || 1);
        const newStock = Math.max(0, product.stockQuantity - qtyToDeduct);
        await db.products.update(product.id, {
          stockQuantity: newStock,
          updatedAt: new Date().toISOString()
        });
      }
    }
  },

  /**
   * Ajoute une quantité au stock existant (Réapprovisionnement)
   */
  async addStock(productId: string, quantityToAdd: number): Promise<number | undefined> {
    const product = await db.products.get(productId);
    if (!product) return undefined;

    const currentStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
    const newStock = Math.max(0, currentStock + quantityToAdd);
    await db.products.update(productId, {
      stockQuantity: newStock,
      updatedAt: new Date().toISOString()
    });
    return newStock;
  },

  /**
   * Ajuste directement la valeur absolue du stock
   */
  async setStock(productId: string, newStock: number | undefined): Promise<void> {
    const validStock = typeof newStock === 'number' ? Math.max(0, newStock) : undefined;
    await db.products.update(productId, {
      stockQuantity: validStock,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Récupère tous les articles dont le stock est inférieur ou égal au seuil critique
   */
  async getLowStockProducts(threshold: number = 5): Promise<Product[]> {
    const all = await db.products.toArray();
    return all.filter((p) => typeof p.stockQuantity === 'number' && p.stockQuantity <= (p.minStockAlert ?? threshold));
  },

  async delete(id: string): Promise<void> {
    await db.products.delete(id);
  }
};
