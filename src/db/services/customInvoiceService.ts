import { db } from '../db';
import { CustomInvoice, CustomInvoiceType } from '../../types';

export const customInvoiceService = {
  /**
   * Récupère toutes les factures et devis par ordre chronologique inversé
   */
  async getAll(): Promise<CustomInvoice[]> {
    return await db.customInvoices.orderBy('createdAt').reverse().toArray();
  },

  /**
   * Récupère un document par son identifiant
   */
  async getById(id: string): Promise<CustomInvoice | undefined> {
    return await db.customInvoices.get(id);
  },

  /**
   * Récupère les documents par type (INVOICE, QUOTE, PROFORMA)
   */
  async getByType(type: CustomInvoiceType): Promise<CustomInvoice[]> {
    return await db.customInvoices.where('type').equals(type).reverse().sortBy('createdAt');
  },

  /**
   * Génère automatiquement le prochain numéro séquentiel
   * Exemples : FAC-202609-001, DEV-202609-001, PRO-202609-001
   */
  async generateNumber(type: CustomInvoiceType): Promise<string> {
    const prefix = type === 'INVOICE' ? 'FAC' : type === 'QUOTE' ? 'DEV' : 'PRO';
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Compter les factures existantes de ce mois et de ce type
    const all = await db.customInvoices.toArray();
    const matching = all.filter(doc => doc.number && doc.number.startsWith(`${prefix}-${yearMonth}`));
    const seq = matching.length + 1;
    const seqStr = String(seq).padStart(3, '0');

    return `${prefix}-${yearMonth}-${seqStr}`;
  },

  /**
   * Crée et enregistre une nouvelle facture / devis
   */
  async create(data: Omit<CustomInvoice, 'id' | 'createdAt'>): Promise<CustomInvoice> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const invoice: CustomInvoice = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.customInvoices.put(invoice);
    return invoice;
  },

  /**
   * Met à jour une facture ou un devis existant
   */
  async update(id: string, updates: Partial<CustomInvoice>): Promise<void> {
    await db.customInvoices.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Supprime une facture / devis
   */
  async delete(id: string): Promise<void> {
    await db.customInvoices.delete(id);
  }
};
