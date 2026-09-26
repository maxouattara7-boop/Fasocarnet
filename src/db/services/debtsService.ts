import { db } from '../db';
import { DebtPayment, DebtRecord } from '../../types';
import { customersService } from './customersService';

export const debtsService = {
  async getByCustomerId(customerId: string): Promise<DebtRecord[]> {
    return await db.debts.where('customerId').equals(customerId).toArray();
  },

  async getActiveDebts(): Promise<DebtRecord[]> {
    return await db.debts
      .filter(d => d.status === 'PENDING' || d.status === 'PARTIAL')
      .reverse()
      .toArray();
  },

  async getTotalOutstandingDebt(): Promise<number> {
    const debts = await this.getActiveDebts();
    return debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  },

  async createDebt(
    customerId: string,
    customerName: string,
    customerPhone: string,
    amount: number,
    saleId?: string,
    dueDate?: string
  ): Promise<DebtRecord> {
    const debt: DebtRecord = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerId,
      customerName,
      customerPhone,
      saleId,
      initialAmount: amount,
      remainingAmount: amount,
      status: 'PENDING',
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.debts.put(debt);
    await customersService.updateDebt(customerId, amount);
    return debt;
  },

  async recordPayment(
    debtId: string,
    amount: number,
    paymentMethod: 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE',
    notes?: string
  ): Promise<{ payment: DebtPayment; debt: DebtRecord }> {
    const debt = await db.debts.get(debtId);
    if (!debt) throw new Error(`Dette non trouvée : ${debtId}`);

    const effectivePay = Math.min(amount, debt.remainingAmount);
    const newRemaining = debt.remainingAmount - effectivePay;
    const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIAL';

    const updatedDebt: DebtRecord = {
      ...debt,
      remainingAmount: newRemaining,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    const payment: DebtPayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      debtId,
      customerId: debt.customerId,
      amount: effectivePay,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString()
    };

    await db.debts.put(updatedDebt);
    await db.debtPayments.put(payment);
    await customersService.updateDebt(debt.customerId, -effectivePay);

    return { payment, debt: updatedDebt };
  },

  async getPaymentsByCustomerId(customerId: string): Promise<DebtPayment[]> {
    return await db.debtPayments.where('customerId').equals(customerId).reverse().toArray();
  },

  async getCustomerFullDebtHistory(customerId: string): Promise<{ debts: DebtRecord[]; payments: DebtPayment[] }> {
    const [debts, payments] = await Promise.all([
      db.debts.where('customerId').equals(customerId).reverse().toArray(),
      db.debtPayments.where('customerId').equals(customerId).reverse().toArray()
    ]);
    return { debts, payments };
  },

  /**
   * Annule ou supprime la dette liée à une vente annulée et ajuste le solde du client
   */
  async cancelDebtBySaleId(saleId: string): Promise<void> {
    const debts = await db.debts.where('saleId').equals(saleId).toArray();
    for (const d of debts) {
      if (d.remainingAmount > 0) {
        await customersService.updateDebt(d.customerId, -d.remainingAmount);
      }
      await db.debts.delete(d.id);
    }
  }
};
