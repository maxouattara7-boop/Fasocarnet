import { describe, expect, it } from 'vitest';
import {
  buildPaymentSlices,
  buildTimeSeries,
  computeExpenseBreakdown,
  computePerformanceRatios,
  computeTopProducts,
  computeTrendDelta,
  getPreviousPeriod,
} from './reportAnalytics';
import { DailySummary, Expense, Sale } from '../types';

describe('reportAnalytics', () => {
  it('calculates previous day and month correctly', () => {
    expect(getPreviousPeriod('day', '2026-11-27')).toBe('2026-11-26');
    expect(getPreviousPeriod('day', '2026-03-01')).toBe('2026-02-28');
    expect(getPreviousPeriod('month', '2026-01')).toBe('2025-12');
    expect(getPreviousPeriod('month', '2026-11')).toBe('2026-10');
  });

  it('computes trend deltas safely', () => {
    expect(computeTrendDelta(120, 100)).toEqual({ value: 20, direction: 'up', hasBaseline: true });
    expect(computeTrendDelta(80, 100)).toEqual({ value: -20, direction: 'down', hasBaseline: true });
    expect(computeTrendDelta(0, 0)).toEqual({ value: 0, direction: 'flat', hasBaseline: false });
  });

  it('computes performance ratios from summary', () => {
    const summary: DailySummary = {
      date: '2026-11-27',
      totalSales: 100000,
      cashSales: 60000,
      orangeMoneySales: 40000,
      moovMoneySales: 0,
      waveSales: 0,
      creditSales: 25000,
      salesCount: 10,
      totalRecoveredDebts: 0,
      totalExpenses: 20000,
      grossProfit: 40000,
      netProfit: 20000,
    };

    const ratios = computePerformanceRatios(summary);
    expect(ratios.averageBasket).toBe(10000);
    expect(ratios.grossMarginRate).toBe(40);
    expect(ratios.netMarginRate).toBe(20);
    expect(ratios.expenseRatio).toBe(20);
    expect(ratios.creditRate).toBe(20);
  });

  it('builds hourly and daily time series excluding cancelled sales', () => {
    const sales: Sale[] = [
      {
        id: 's1',
        totalAmount: 15000,
        paymentMethod: 'CASH',
        isCredit: false,
        createdAt: '2026-11-27T10:15:00',
      },
      {
        id: 's2',
        totalAmount: 5000,
        paymentMethod: 'CASH',
        isCredit: false,
        isCancelled: true,
        createdAt: '2026-11-27T10:30:00',
      },
    ];
    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Transport',
        category: 'TRANSPORT',
        amount: 3000,
        paymentMethod: 'CASH',
        createdAt: '2026-11-27T10:45:00',
      },
    ];

    const daySeries = buildTimeSeries('day', '2026-11-27', sales, expenses);
    const h10 = daySeries.find((p) => p.label === '10h');
    expect(h10?.revenue).toBe(15000);
    expect(h10?.expenses).toBe(3000);
    expect(h10?.net).toBe(12000);
    expect(h10?.salesCount).toBe(1);

    const monthSeries = buildTimeSeries('month', '2026-11', sales, expenses);
    expect(monthSeries).toHaveLength(30);
    const d27 = monthSeries.find((p) => p.label === '27');
    expect(d27?.revenue).toBe(15000);
    expect(d27?.expenses).toBe(3000);
  });

  it('computes top products and expense breakdown', () => {
    const sales: Sale[] = [
      {
        id: 's1',
        totalAmount: 20000,
        paymentMethod: 'CASH',
        isCredit: false,
        createdAt: '2026-11-27T09:00:00',
        items: [
          { id: 'i1', description: 'Riz 25kg', quantity: 2, unitPrice: 8000, costPrice: 6500 },
          { id: 'i2', description: 'Huile 5L', quantity: 1, unitPrice: 4000 },
        ],
      },
    ];
    const top = computeTopProducts(sales, 5);
    expect(top[0]).toEqual({ name: 'Riz 25kg', quantity: 2, revenue: 16000, profit: 3000 });
    expect(top[1]).toEqual({ name: 'Huile 5L', quantity: 1, revenue: 4000, profit: 0 });

    const expenses: Expense[] = [
      { id: 'e1', title: 'Loyer', category: 'UTILITIES', amount: 30000, paymentMethod: 'CASH', createdAt: '2026-11-27T08:00:00' },
      { id: 'e2', title: 'Électricité', category: 'UTILITIES', amount: 10000, paymentMethod: 'CASH', createdAt: '2026-11-27T09:00:00' },
    ];
    const expStats = computeExpenseBreakdown(expenses, 5);
    expect(expStats[0]).toEqual({ label: 'Loyer', amount: 30000, count: 1, percentage: 75 });
    expect(expStats[1]).toEqual({ label: 'Électricité', amount: 10000, count: 1, percentage: 25 });
  });

  it('builds payment slices with percentages', () => {
    const slices = buildPaymentSlices({
      date: '2026-11-27',
      totalSales: 10000,
      cashSales: 5000,
      orangeMoneySales: 5000,
      moovMoneySales: 0,
      waveSales: 0,
      creditSales: 0,
      salesCount: 2,
      totalRecoveredDebts: 0,
    });
    expect(slices).toHaveLength(2);
    expect(slices[0].percentage).toBe(50);
    expect(slices[1].percentage).toBe(50);
  });
});
