import { db } from '../db';
import { DailySummary, PaymentMethod, Sale } from '../../types';
import { debtsService } from './debtsService';
import { productsService } from './productsService';
import { expensesService } from './expensesService';

export const salesService = {
  async recordSale(data: {
    totalAmount: number;
    paymentMethod: PaymentMethod;
    isCredit: boolean;
    isPartialCredit?: boolean;
    paidAmount?: number;
    creditAmount?: number;
    downPaymentMethod?: PaymentMethod;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    receivedAmount?: number;
    changeAmount?: number;
    transactionRef?: string;
    notes?: string;
    items?: import('../../types').SaleItem[];
  }): Promise<Sale> {
    const sale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      isCredit: data.isCredit,
      isPartialCredit: data.isPartialCredit,
      paidAmount: data.paidAmount,
      creditAmount: data.creditAmount,
      downPaymentMethod: data.downPaymentMethod,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      receivedAmount: data.receivedAmount,
      changeAmount: data.changeAmount,
      transactionRef: data.transactionRef,
      notes: data.notes,
      items: data.items,
      createdAt: new Date().toISOString()
    };

    await db.sales.put(sale);

    // Décrémentation automatique du stock pour les articles vendus
    if (data.items && data.items.length > 0) {
      await productsService.decrementStock(data.items);
    }

    // Si la vente est à 100% à crédit, créer l'enregistrement de dette correspondant au montant total
    if (data.isCredit && data.customerId && data.customerName && data.customerPhone) {
      await debtsService.createDebt(
        data.customerId,
        data.customerName,
        data.customerPhone,
        data.totalAmount,
        sale.id
      );
    } else if (data.isPartialCredit && data.creditAmount && data.creditAmount > 0 && data.customerId && data.customerName && data.customerPhone) {
      // Si la vente est à crédit partiel (acompte versé + solde dû), créer la dette pour le reliquat uniquement
      await debtsService.createDebt(
        data.customerId,
        data.customerName,
        data.customerPhone,
        data.creditAmount,
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

    const dayExpenses = await expensesService.getByDate(targetDate);
    const expSummary = expensesService.computeSummary(dayExpenses);

    const activeDebts = await debtsService.getActiveDebts();
    const totalOutstandingDebt = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const debtorsCount = activeDebts.map(d => d.customerId).filter((v, i, a) => a.indexOf(v) === i).length;

    const summary: DailySummary = {
      date: targetDate,
      totalSales: 0,
      cashSales: 0,
      orangeMoneySales: 0,
      moovMoneySales: 0,
      waveSales: 0,
      creditSales: 0,
      salesCount: daySales.length,
      totalRecoveredDebts: dayPayments.reduce((sum, p) => sum + p.amount, 0),
      totalExpenses: expSummary.totalExpenses,
      cashExpenses: expSummary.cashExpenses,
      orangeMoneyExpenses: expSummary.orangeMoneyExpenses,
      moovMoneyExpenses: expSummary.moovMoneyExpenses,
      waveExpenses: expSummary.waveExpenses,
      netCashFlow: 0,
      totalOutstandingDebt,
      debtorsCount
    };

    for (const sale of daySales) {
      if (sale.isCredit) {
        summary.creditSales += sale.totalAmount;
      } else if (sale.isPartialCredit) {
        const paid = sale.paidAmount !== undefined ? sale.paidAmount : (sale.totalAmount - (sale.creditAmount || 0));
        const credit = sale.creditAmount !== undefined ? sale.creditAmount : (sale.totalAmount - paid);
        summary.totalSales += paid;
        summary.creditSales += credit;

        const method = sale.downPaymentMethod || sale.paymentMethod;
        if (method === 'CASH') summary.cashSales += paid;
        if (method === 'ORANGE_MONEY') summary.orangeMoneySales += paid;
        if (method === 'MOOV_MONEY') summary.moovMoneySales += paid;
        if (method === 'WAVE') summary.waveSales += paid;
      } else {
        summary.totalSales += sale.totalAmount;
        if (sale.paymentMethod === 'CASH') summary.cashSales += sale.totalAmount;
        if (sale.paymentMethod === 'ORANGE_MONEY') summary.orangeMoneySales += sale.totalAmount;
        if (sale.paymentMethod === 'MOOV_MONEY') summary.moovMoneySales += sale.totalAmount;
        if (sale.paymentMethod === 'WAVE') summary.waveSales += sale.totalAmount;
      }
    }

    // Flux net de trésorerie = (Ventes encaissées + Dettes récupérées) - Dépenses totales
    summary.netCashFlow = (summary.totalSales + summary.totalRecoveredDebts) - summary.totalExpenses!;

    return summary;
  },

  async getSalesByDate(dateString: string): Promise<Sale[]> {
    const targetDate = dateString || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const sales = await db.sales
      .where('createdAt')
      .between(startOfDay, endOfDay, true, true)
      .toArray();

    return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getMonthlySummary(monthString: string): Promise<DailySummary> {
    const targetMonth = monthString || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const startOfMonth = `${targetMonth}-01T00:00:00.000Z`;
    const endOfMonth = `${targetMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const monthSales = await db.sales
      .where('createdAt')
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    const monthPayments = await db.debtPayments
      .where('createdAt')
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    const monthExpenses = await expensesService.getByMonth(targetMonth);
    const expSummary = expensesService.computeSummary(monthExpenses);

    const activeDebts = await debtsService.getActiveDebts();
    const totalOutstandingDebt = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const debtorsCount = activeDebts.map(d => d.customerId).filter((v, i, a) => a.indexOf(v) === i).length;

    const summary: DailySummary = {
      date: targetMonth,
      totalSales: 0,
      cashSales: 0,
      orangeMoneySales: 0,
      moovMoneySales: 0,
      waveSales: 0,
      creditSales: 0,
      salesCount: monthSales.length,
      totalRecoveredDebts: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      totalExpenses: expSummary.totalExpenses,
      cashExpenses: expSummary.cashExpenses,
      orangeMoneyExpenses: expSummary.orangeMoneyExpenses,
      moovMoneyExpenses: expSummary.moovMoneyExpenses,
      waveExpenses: expSummary.waveExpenses,
      netCashFlow: 0,
      totalOutstandingDebt,
      debtorsCount
    };

    for (const sale of monthSales) {
      if (sale.isCredit) {
        summary.creditSales += sale.totalAmount;
      } else if (sale.isPartialCredit) {
        const paid = sale.paidAmount !== undefined ? sale.paidAmount : (sale.totalAmount - (sale.creditAmount || 0));
        const credit = sale.creditAmount !== undefined ? sale.creditAmount : (sale.totalAmount - paid);
        summary.totalSales += paid;
        summary.creditSales += credit;

        const method = sale.downPaymentMethod || sale.paymentMethod;
        if (method === 'CASH') summary.cashSales += paid;
        if (method === 'ORANGE_MONEY') summary.orangeMoneySales += paid;
        if (method === 'MOOV_MONEY') summary.moovMoneySales += paid;
        if (method === 'WAVE') summary.waveSales += paid;
      } else {
        summary.totalSales += sale.totalAmount;
        if (sale.paymentMethod === 'CASH') summary.cashSales += sale.totalAmount;
        if (sale.paymentMethod === 'ORANGE_MONEY') summary.orangeMoneySales += sale.totalAmount;
        if (sale.paymentMethod === 'MOOV_MONEY') summary.moovMoneySales += sale.totalAmount;
        if (sale.paymentMethod === 'WAVE') summary.waveSales += sale.totalAmount;
      }
    }

    summary.netCashFlow = (summary.totalSales + summary.totalRecoveredDebts) - summary.totalExpenses!;

    return summary;
  },

  async getSalesByMonth(monthString: string): Promise<Sale[]> {
    const targetMonth = monthString || new Date().toISOString().slice(0, 7);
    const [year, month] = targetMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const startOfMonth = `${targetMonth}-01T00:00:00.000Z`;
    const endOfMonth = `${targetMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const sales = await db.sales
      .where('createdAt')
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};
