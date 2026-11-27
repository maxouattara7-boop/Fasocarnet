import { db } from '../db';
import { Product, StockSupply, SupplyBatch } from '../../types';
import { syncService } from './syncService';
import { expensesService } from './expensesService';

export interface BatchSupplyItemInput {
  productId?: string;
  newProductName?: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
}

export interface RecordBatchSupplyInput {
  supplyDate: string; // YYYY-MM-DD
  supplierName: string;
  supplierPhone?: string;
  paymentMethod?: 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE';
  notes?: string;
  items: BatchSupplyItemInput[];
}

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
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const batchRef = `APP-${todayStr.replace(/-/g, '')}`;

    let expenseId: string | undefined;
    if (totalCost > 0) {
      const expense = await expensesService.create({
        title: `Approvisionnement ${product.name} (x${cleanQty})${data.supplierName?.trim() ? ` • ${data.supplierName.trim()}` : ''}`,
        amount: totalCost,
        category: 'STOCK',
        paymentMethod: 'CASH',
        notes: data.notes?.trim() || `${batchRef} • ${product.name}`,
        createdAt: nowIso,
      });
      expenseId = expense.id;
    }

    const newSupply: StockSupply = {
      id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      productName: product.name,
      quantity: cleanQty,
      costPrice: cleanCost,
      sellingPrice: typeof data.sellingPrice === 'number' ? data.sellingPrice : product.price,
      totalCost,
      supplierName: data.supplierName?.trim() || undefined,
      paymentMethod: 'CASH',
      expenseId,
      notes: data.notes?.trim() || undefined,
      createdAt: nowIso
    };

    // 1. Enregistre le mouvement d'approvisionnement
    await db.supplies.put(newSupply);

    // 2. Met à jour le stock et les prix du produit
    const currentStock = Number(product.stockQuantity) || 0;
    const newStock = Math.max(0, currentStock + cleanQty);

    const updatedProduct: Product = {
      ...product,
      stockQuantity: newStock,
      costPrice: cleanCost,
      updatedAt: nowIso,
      ...(typeof data.sellingPrice === 'number' && data.sellingPrice > 0
        ? { price: data.sellingPrice }
        : {}),
    };

    await db.products.put(updatedProduct);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fasocarnet_database_updated'));
    }
    syncService.triggerAutoPush();

    return newSupply;
  },

  /**
   * Enregistre une Fiche d'Approvisionnement complète (Date, Fournisseur + plusieurs articles)
   */
  async recordBatchSupply(data: RecordBatchSupplyInput): Promise<SupplyBatch> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Ajoutez au moins un article à la fiche.');
    }

    const cleanDate = data.supplyDate || new Date().toISOString().slice(0, 10);
    const dateCompact = cleanDate.replace(/-/g, '');
    const existingForDate = await db.supplies
      .filter((s) => (s.supplyDate || s.createdAt.slice(0, 10)) === cleanDate)
      .toArray();
    const existingBatchesCount = new Set(
      existingForDate.map((s) => s.batchId || s.id)
    ).size;

    const batchId = `fiche_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const batchRef = `APP-${dateCompact}-${String(existingBatchesCount + 1).padStart(2, '0')}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso =
      cleanDate === todayStr
        ? new Date().toISOString()
        : `${cleanDate}T12:00:00.000Z`;
    const paymentMethod = data.paymentMethod || 'CASH';
    const createdItems: StockSupply[] = [];

    for (const item of data.items) {
      let product: Product | undefined = item.productId
        ? await db.products.get(item.productId)
        : undefined;

      const cleanQty = Math.max(1, Math.round(item.quantity));
      const cleanCost = Math.max(0, item.costPrice);

      // Si c'est un nouvel article créé directement depuis la fiche d'approvisionnement
      if (!product && item.newProductName?.trim()) {
        const cleanName = item.newProductName.trim();
        const existingByName = await db.products
          .filter((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase())
          .first();

        if (existingByName) {
          const currentStock = Number(existingByName.stockQuantity) || 0;
          const updatedExisting: Product = {
            ...existingByName,
            stockQuantity: Math.max(0, currentStock + cleanQty),
            costPrice: cleanCost,
            updatedAt: nowIso,
            ...(typeof item.sellingPrice === 'number' && item.sellingPrice > 0
              ? { price: item.sellingPrice }
              : {}),
          };
          await db.products.put(updatedExisting);
          product = updatedExisting;
        } else {
          const cleanPrice =
            typeof item.sellingPrice === 'number' && item.sellingPrice > 0
              ? item.sellingPrice
              : cleanCost > 0
              ? cleanCost
              : 100;
          const newProd: Product = {
            id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: cleanName,
            price: cleanPrice,
            costPrice: cleanCost,
            stockQuantity: cleanQty,
            minStockAlert: 5,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          await db.products.put(newProd);
          product = newProd;
        }
      } else if (product) {
        const currentStock = Number(product.stockQuantity) || 0;
        const updatedProduct: Product = {
          ...product,
          stockQuantity: Math.max(0, currentStock + cleanQty),
          costPrice: cleanCost,
          updatedAt: nowIso,
          ...(typeof item.sellingPrice === 'number' && item.sellingPrice > 0
            ? { price: item.sellingPrice }
            : {}),
        };
        await db.products.put(updatedProduct);
      } else {
        throw new Error(`Article introuvable pour l'ID : ${item.productId}`);
      }

      const totalCost = cleanQty * cleanCost;
      const newSupply: StockSupply = {
        id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        batchId,
        batchRef,
        supplyDate: cleanDate,
        productId: product.id,
        productName: product.name,
        quantity: cleanQty,
        costPrice: cleanCost,
        sellingPrice: typeof item.sellingPrice === 'number' ? item.sellingPrice : product.price,
        totalCost,
        supplierName: data.supplierName.trim() || undefined,
        supplierPhone: data.supplierPhone?.trim() || undefined,
        paymentMethod,
        notes: data.notes?.trim() || undefined,
        createdAt: nowIso,
      };

      createdItems.push(newSupply);
    }

    const totalBatchCost = createdItems.reduce((s, i) => s + i.totalCost, 0);
    let expenseId: string | undefined;

    // Enregistrer automatiquement la dépense d'approvisionnement dans le Bilan
    if (totalBatchCost > 0) {
      const itemsSummary = createdItems
        .map((it) => `${it.productName} (x${it.quantity})`)
        .join(', ');
      const expense = await expensesService.create({
        title: `Approvisionnement ${batchRef}${data.supplierName.trim() ? ` • ${data.supplierName.trim()}` : ''}`,
        amount: totalBatchCost,
        category: 'STOCK',
        paymentMethod,
        notes: data.notes?.trim() ? `${itemsSummary} — ${data.notes.trim()}` : itemsSummary,
        createdAt: nowIso,
      });
      expenseId = expense.id;
    }

    for (const supply of createdItems) {
      if (expenseId) supply.expenseId = expenseId;
      await db.supplies.put(supply);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fasocarnet_database_updated'));
    }
    syncService.triggerAutoPush();

    return {
      batchId,
      batchRef,
      supplyDate: cleanDate,
      supplierName: data.supplierName.trim() || undefined,
      supplierPhone: data.supplierPhone?.trim() || undefined,
      paymentMethod,
      expenseId,
      notes: data.notes?.trim() || undefined,
      createdAt: nowIso,
      items: createdItems,
      totalQuantity: createdItems.reduce((s, i) => s + i.quantity, 0),
      totalCost: totalBatchCost,
    };
  },

  /**
   * Regroupe les lignes d'approvisionnement en Fiches (rétrocompatible avec les anciennes entrées)
   */
  groupIntoBatches(supplies: StockSupply[]): SupplyBatch[] {
    const map = new Map<string, SupplyBatch>();

    for (const s of supplies) {
      const key = s.batchId || s.id;
      const dateStr = s.supplyDate || s.createdAt.slice(0, 10);
      const existing = map.get(key);
      if (existing) {
        existing.items.push(s);
        existing.totalQuantity += s.quantity;
        existing.totalCost += s.totalCost;
      } else {
        map.set(key, {
          batchId: key,
          batchRef: s.batchRef || `APP-${dateStr.replace(/-/g, '')}`,
          supplyDate: dateStr,
          supplierName: s.supplierName,
          supplierPhone: s.supplierPhone,
          paymentMethod: s.paymentMethod,
          expenseId: s.expenseId,
          notes: s.notes,
          createdAt: s.createdAt,
          items: [s],
          totalQuantity: s.quantity,
          totalCost: s.totalCost,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.supplyDate.localeCompare(a.supplyDate) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Supprime un enregistrement d'approvisionnement
   */
  async delete(id: string): Promise<void> {
    await db.supplies.delete(id);
    syncService.triggerAutoPush();
  },

  /**
   * Supprime toutes les lignes d'une fiche d'approvisionnement (et la dépense liée au Bilan)
   */
  async deleteBatch(batchId: string): Promise<void> {
    const toDelete = await db.supplies
      .filter((s) => (s.batchId || s.id) === batchId)
      .toArray();
    if (toDelete.length > 0) {
      const expenseIds = Array.from(
        new Set(toDelete.map((s) => s.expenseId).filter(Boolean) as string[])
      );
      if (expenseIds.length > 0) {
        await db.expenses.bulkDelete(expenseIds);
      }
      await db.supplies.bulkDelete(toDelete.map((s) => s.id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fasocarnet_database_updated'));
      }
      syncService.triggerAutoPush();
    }
  }
};
