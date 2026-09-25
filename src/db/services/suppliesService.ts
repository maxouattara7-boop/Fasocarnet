import { db } from '../db';
import { StockSupply } from '../../types';

export const suppliesService = {
  /**
   * Récupère tous les approvisionnements par ordre chronologique inversé (plus récent en premier)
   */
  async getAll(): Promise<StockSupply[]> {
    return await db.supplies.orderBy('createdAt').reverse().toArray();
  },

  /**
   * Récupère les approvisionnements d'un produit spécifique
   */
  async getByProductId(productId: string): Promise<StockSupply[]> {
    return await db.supplies.where('productId').equals(productId).reverse().sortBy('createdAt');
  },

  /**
   * Récupère les approvisionnements d'une date donnée (YYYY-MM-DD)
   */
  async getByDate(dateStr: string): Promise<StockSupply[]> {
    const start = `${dateStr}T00:00:00.000Z`;
    const end = `${dateStr}T23:59:59.999Z`;
    return await db.supplies
      .where('createdAt')
      .between(start, end, true, true)
      .reverse()
      .sortBy('createdAt');
  },

  /**
   * Récupère les approvisionnements d'un mois donné (YYYY-MM)
   */
  async getByMonth(monthStr: string): Promise<StockSupply[]> {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const start = `${monthStr}-01T00:00:00.000Z`;
    const end = `${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
    return await db.supplies
      .where('createdAt')
      .between(start, end, true, true)
      .reverse()
      .sortBy('createdAt');
  },

  /**
   * Enregistre un nouvel approvisionnement, incrémente le stock et actualise le prix d'achat du produit
   */
  async recordSupply(data: {
    productId: string;
    quantity: number;
    costPrice: number;
    sellingPrice?: number;
    supplierName?: string;
    notes?: string;
  }): Promise<StockSupply> {
    const product = await db.products.get(data.productId);
    if (!product) {
      throw new Error(`Article introuvable pour l'ID : ${data.productId}`);
    }

    const cleanQty = Math.max(1, Math.round(data.quantity));
    const cleanCost = Math.max(0, data.costPrice);
    const totalCost = cleanQty * cleanCost;

    const newSupply: StockSupply = {
      id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      productName: product.name,
      quantity: cleanQty,
      costPrice: cleanCost,
      sellingPrice: typeof data.sellingPrice === 'number' ? data.sellingPrice : product.price,
      totalCost,
      supplierName: data.supplierName?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    // 1. Enregistre le mouvement d'approvisionnement
    await db.supplies.put(newSupply);

    // 2. Met à jour le stock et les prix du produit
    const currentStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
    const newStock = Math.max(0, currentStock + cleanQty);

    const updates: any = {
      stockQuantity: newStock,
      costPrice: cleanCost, // Actualisation du coût d'achat unitaire de référence
      updatedAt: new Date().toISOString()
    };

    if (typeof data.sellingPrice === 'number' && data.sellingPrice > 0) {
      updates.price = data.sellingPrice;
    }

    await db.products.update(product.id, updates);

    return newSupply;
  },

  /**
   * Supprime un enregistrement d'approvisionnement
   */
  async delete(id: string): Promise<void> {
    await db.supplies.delete(id);
  }
};
