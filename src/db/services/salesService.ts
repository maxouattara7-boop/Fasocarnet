import { db } from '../db';
import { DailySummary, PaymentMethod, Sale } from '../../types';
import { debtsService } from './debtsService';
import { productsService } from './productsService';
import { expensesService } from './expensesService';

export const salesService = {
  async recordSale(data: {
    totalAmount: number;
    subtotalAmount?: number;
    discountAmount?: number;
    discountType?: 'PERCENT' | 'AMOUNT';
    discountValue?: number;
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
    // Enrichir chaque article avec son coût d'achat actuel pour historique de rentabilité fiable
    let enrichedItems = data.items;
    if (data.items && data.items.length > 0) {
      enrichedItems = await Promise.all(
        data.items.map(async (item) => {
          if (item.costPrice !== undefined) return item;
          const targetId = item.productId || item.id;
          if (targetId) {
            const product = await db.products.get(targetId);
            if (product && typeof product.costPrice === 'number') {
              return { ...item, costPrice: product.costPrice };
            }
          }
          return item;
        })
      );
    }

    const sale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      totalAmount: data.totalAmount,
      subtotalAmount: data.subtotalAmount,
      discountAmount: data.discountAmount,
      discountType: data.discountType,
      discountValue: data.discountValue,
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
      items: enrichedItems,
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
      totalCostOfGoodsSold: 0,
      grossProfit: 0,
      netProfit: 0,
      totalOutstandingDebt,
      debtorsCount
    };

    let totalCOGS = 0;

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

      // Calcul du coût de revient des articles vendus
      if (sale.items && sale.items.length > 0) {
        for (const it of sale.items) {
          if (it.costPrice && it.costPrice > 0) {
            totalCOGS += it.costPrice * (it.quantity || 1);
          }
        }
      }
    }

    // Flux net de trésorerie = (Ventes encaissées + Dettes récupérées) - Dépenses totales
    summary.netCashFlow = (summary.totalSales + summary.totalRecoveredDebts) - summary.totalExpenses!;
    summary.totalCostOfGoodsSold = totalCOGS;
    // Marge Brute = Chiffre d'affaires total (encaissé + accordé à crédit) - Coût des marchandises
    const totalVolume = summary.totalSales + summary.creditSales;
    summary.grossProfit = Math.max(0, totalVolume - totalCOGS);
    // Bénéfice Net = Marge Brute - Dépenses d'exploitation
    summary.netProfit = summary.grossProfit - summary.totalExpenses!;

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
      totalCostOfGoodsSold: 0,
      grossProfit: 0,
      netProfit: 0,
      totalOutstandingDebt,
      debtorsCount
    };

    let totalMonthCOGS = 0;

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

      if (sale.items && sale.items.length > 0) {
        for (const it of sale.items) {
          if (it.costPrice && it.costPrice > 0) {
            totalMonthCOGS += it.costPrice * (it.quantity || 1);
          }
        }
      }
    }

    summary.netCashFlow = (summary.totalSales + summary.totalRecoveredDebts) - summary.totalExpenses!;
    summary.totalCostOfGoodsSold = totalMonthCOGS;
    const totalVolume = summary.totalSales + summary.creditSales;
    summary.grossProfit = Math.max(0, totalVolume - totalMonthCOGS);
    summary.netProfit = summary.grossProfit - summary.totalExpenses!;

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
