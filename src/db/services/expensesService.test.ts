import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { expensesService } from './expensesService';

describe('expensesService', () => {
  beforeEach(async () => {
    await db.expenses.clear();
  });

  it('creates an expense and retrieves it', async () => {
    const exp = await expensesService.create({
      title: 'Facture SONABEL',
      amount: 12500,
      category: 'UTILITIES',
      paymentMethod: 'ORANGE_MONEY',
      notes: 'Boutique principale'
    });

    expect(exp.id).toBeDefined();
    expect(exp.title).toBe('Facture SONABEL');
    expect(exp.amount).toBe(12500);

    const all = await expensesService.getAll();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(exp.id);
  });

  it('filters expenses by date and computes summary by channel and category', async () => {
    const today = new Date().toISOString().split('T')[0];

    await expensesService.create({
      title: 'Achat sacs de ciment',
      amount: 45000,
      category: 'STOCK',
      paymentMethod: 'CASH'
    });

    await expensesService.create({
      title: 'Transport taxi marchandise',
      amount: 3000,
      category: 'TRANSPORT',
      paymentMethod: 'CASH'
    });

    await expensesService.create({
      title: 'Recharge Internet',
      amount: 5000,
      category: 'UTILITIES',
      paymentMethod: 'WAVE'
    });

    const dayExpenses = await expensesService.getByDate(today);
    expect(dayExpenses.length).toBe(3);

    const summary = expensesService.computeSummary(dayExpenses);
    expect(summary.totalExpenses).toBe(53000);
    expect(summary.cashExpenses).toBe(48000);
    expect(summary.waveExpenses).toBe(5000);
    expect(summary.byCategory.STOCK).toBe(45000);
    expect(summary.byCategory.TRANSPORT).toBe(3000);
    expect(summary.byCategory.UTILITIES).toBe(5000);
  });

  it('deletes an expense', async () => {
    const exp = await expensesService.create({
      title: 'Repas midi',
      amount: 1500,
      category: 'FOOD',
      paymentMethod: 'CASH'
    });

    let all = await expensesService.getAll();
    expect(all.length).toBe(1);

    await expensesService.delete(exp.id);

    all = await expensesService.getAll();
    expect(all.length).toBe(0);
  });
});
