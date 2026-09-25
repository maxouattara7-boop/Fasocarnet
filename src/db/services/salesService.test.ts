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

  it('automatically decrements product stock when sale is recorded with items', async () => {
    await db.products.add({
      id: 'prod_stock_test_1',
      name: 'Savon BF',
      price: 350,
      stockQuantity: 15,
      minStockAlert: 5,
      createdAt: new Date().toISOString()
    });

    await salesService.recordSale({
      totalAmount: 1400,
      paymentMethod: 'CASH',
      isCredit: false,
      receivedAmount: 1400,
      changeAmount: 0,
      items: [
        {
          id: 'item_1',
          productId: 'prod_stock_test_1',
          description: 'Savon BF',
          unitPrice: 350,
          quantity: 4
        }
      ]
    });

    const updatedProduct = await db.products.get('prod_stock_test_1');
    expect(updatedProduct?.stockQuantity).toBe(11); // 15 - 4
  });

  it('filters sales by specific date and computes monthly summary', async () => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);

    await salesService.recordSale({
      totalAmount: 5000,
      paymentMethod: 'CASH',
      isCredit: false
    });

    await salesService.recordSale({
      totalAmount: 15000,
      paymentMethod: 'ORANGE_MONEY',
      isCredit: false
    });

    const todaySales = await salesService.getSalesByDate(today);
    expect(todaySales.length).toBe(2);
    expect(todaySales[0].totalAmount).toBe(15000);

    const monthlySummary = await salesService.getMonthlySummary(thisMonth);
    expect(monthlySummary.totalSales).toBe(20000);
    expect(monthlySummary.cashSales).toBe(5000);
    expect(monthlySummary.orangeMoneySales).toBe(15000);
    expect(monthlySummary.salesCount).toBe(2);

    const monthSales = await salesService.getSalesByMonth(thisMonth);
    expect(monthSales.length).toBe(2);
  });

  it('records partial credit sale (down payment + remaining debt) correctly', async () => {
    const customer = await customersService.create({
      name: 'Sawadogo Karim',
      phone: '70223344'
    });

    const sale = await salesService.recordSale({
      totalAmount: 20000,
      paymentMethod: 'CASH',
      isCredit: false,
      isPartialCredit: true,
      paidAmount: 8000,
      creditAmount: 12000,
      downPaymentMethod: 'CASH',
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      receivedAmount: 8000,
      changeAmount: 0
    });

    expect(sale.isPartialCredit).toBe(true);
    expect(sale.paidAmount).toBe(8000);
    expect(sale.creditAmount).toBe(12000);

    // Vérifier la mise à jour de la dette client
    const updatedCustomer = await customersService.getById(customer.id);
    expect(updatedCustomer?.totalDebt).toBe(12000);

    // Vérifier l'enregistrement de la dette
    const debts = await debtsService.getByCustomerId(customer.id);
    expect(debts.length).toBe(1);
    expect(debts[0].initialAmount).toBe(12000);
    expect(debts[0].remainingAmount).toBe(12000);

    // Vérifier le Bilan journalier
    const summary = await salesService.getDailySummary();
    expect(summary.totalSales).toBe(8000); // Seul l'acompte encaissé compte en CA
    expect(summary.cashSales).toBe(8000);
    expect(summary.creditSales).toBe(12000); // Le reliquat est comptabilisé en crédit
  });
});
