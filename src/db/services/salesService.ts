import { db } from '../db';
import { DailySummary, PaymentMethod, Sale } from '../../types';
import { debtsService } from './debtsService';
import { productsService } from './productsService';

export const salesService = {
  async recordSale(data: {
    totalAmount: number;
    paymentMethod: PaymentMethod;
    isCredit: boolean;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    receivedAmount?: number;
    changeAmount?: number;
    notes?: string;
    items?: import('../../types').SaleItem[];
  }): Promise<Sale> {
    const sale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      isCredit: data.isCredit,
      customerId: data.customerId,
      customerName: data.customerName,
      receivedAmount: data.receivedAmount,
      changeAmount: data.changeAmount,
      notes: data.notes,
      items: data.items,
      createdAt: new Date().toISOString()
    };

    await db.sales.put(sale);

    // Décrémentation automatique du stock pour les articles vendus
    if (data.items && data.items.length > 0) {
      await productsService.decrementStock(data.items);
    }

    // Si la vente est à crédit, créer l'enregistrement de dette correspondant
    if (data.isCredit && data.customerId && data.customerName && data.customerPhone) {
      await debtsService.createDebt(
        data.customerId,
        data.customerName,
        data.customerPhone,
        data.totalAmount,
        sale.id
      );
    }

    return sale;
  },

  async getRecentSales(limit: number = 50): Promise<Sale[]> {
    return await db.sales.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  async getDailySummary(dateString?: string): Promise<DailySummary> {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const daySales = await db.sales
      .where('createdAt')
      .between(startOfDay, endOfDay, true, true)
      .toArray();

    const dayPayments = await db.debtPayments
      .where('createdAt')
      .between(startOfDay, endOfDay, true, true)
      .toArray();

    const summary: DailySummary = {
      date: targetDate,
      totalSales: 0,
      cashSales: 0,
      orangeMoneySales: 0,
      moovMoneySales: 0,
      waveSales: 0,
      creditSales: 0,
      salesCount: daySales.length,
      totalRecoveredDebts: dayPayments.reduce((sum, p) => sum + p.amount, 0)
    };

    for (const sale of daySales) {
      if (sale.isCredit) {
        summary.creditSales += sale.totalAmount;
      } else {
        summary.totalSales += sale.totalAmount;
        if (sale.paymentMethod === 'CASH') summary.cashSales += sale.totalAmount;
        if (sale.paymentMethod === 'ORANGE_MONEY') summary.orangeMoneySales += sale.totalAmount;
        if (sale.paymentMethod === 'MOOV_MONEY') summary.moovMoneySales += sale.totalAmount;
        if (sale.paymentMethod === 'WAVE') summary.waveSales += sale.totalAmount;
      }
    }

    return summary;
  }
};
