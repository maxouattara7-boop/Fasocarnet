import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { customersService } from './customersService';
import { salesService } from './salesService';
import { debtsService } from './debtsService';

describe('Database Services (Offline-First)', () => {
  beforeEach(async () => {
    await db.customers.clear();
    await db.sales.clear();
    await db.debts.clear();
    await db.debtPayments.clear();
  });

  it('records cash sale and updates summary', async () => {
    const sale = await salesService.recordSale({
      totalAmount: 10000,
      paymentMethod: 'CASH',
      isCredit: false,
      receivedAmount: 10000,
      changeAmount: 0
    });

    expect(sale.id).toBeDefined();
    expect(sale.totalAmount).toBe(10000);

    const summary = await salesService.getDailySummary();
    expect(summary.totalSales).toBe(10000);
    expect(summary.cashSales).toBe(10000);
    expect(summary.salesCount).toBe(1);
  });

  it('records credit sale and automatically creates debt record', async () => {
    const customer = await customersService.create({
      name: 'Ouedraogo Salif',
      phone: '70112233'
    });

    await salesService.recordSale({
      totalAmount: 25000,
      paymentMethod: 'CREDIT',
      isCredit: true,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone
    });

    const updatedCustomer = await customersService.getById(customer.id);
    expect(updatedCustomer?.totalDebt).toBe(25000);

    const activeDebts = await debtsService.getActiveDebts();
    expect(activeDebts.length).toBe(1);
    expect(activeDebts[0].remainingAmount).toBe(25000);

    // Paiement partiel de la dette
    const { debt } = await debtsService.recordPayment(activeDebts[0].id, 10000, 'ORANGE_MONEY');
    expect(debt.remainingAmount).toBe(15000);
    expect(debt.status).toBe('PARTIAL');

    const customerAfterPayment = await customersService.getById(customer.id);
    expect(customerAfterPayment?.totalDebt).toBe(15000);
  });
});
