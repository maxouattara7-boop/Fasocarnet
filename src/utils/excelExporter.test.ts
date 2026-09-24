import { describe, it, expect, vi } from 'vitest';
import { exportMonthlyReportToExcel } from './excelExporter';
import { DailySummary, Sale, DebtPayment, ShopProfile } from '../types';

describe('excelExporter', () => {
  it('generates csv file and triggers download successfully', async () => {
    const summary: DailySummary = {
      date: '2026-09',
      totalSales: 150000,
      cashSales: 100000,
      orangeMoneySales: 30000,
      moovMoneySales: 20000,
      waveSales: 0,
      creditSales: 25000,
      salesCount: 10,
      totalRecoveredDebts: 15000
    };

    const sales: Sale[] = [
      {
        id: 'sale_12345678',
        totalAmount: 15000,
        paymentMethod: 'CASH',
        isCredit: false,
        items: [{ id: '1', description: 'Cahier 200p', quantity: 3, unitPrice: 5000 }],
        createdAt: '2026-09-10T10:00:00.000Z'
      }
    ];

    const debtPayments: DebtPayment[] = [
      {
        id: 'pay_12345678',
        debtId: 'debt_1',
        customerId: 'cust_1',
        amount: 5000,
        paymentMethod: 'ORANGE_MONEY',
        createdAt: '2026-09-12T14:30:00.000Z'
      }
    ];

    const shopProfile: ShopProfile = {
      id: 'shop_test',
      name: 'Boutique Test',
      phone: '70000000',
      currency: 'FCFA',
      isConfigured: true,
      ifu: '00012345A',
      rccm: 'BF-OUA-2024',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    // Mock URL and createElement
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test-url');
    const revokeObjectURLMock = vi.fn();
    (global as any).URL.createObjectURL = createObjectURLMock;
    (global as any).URL.revokeObjectURL = revokeObjectURLMock;

    await expect(
      exportMonthlyReportToExcel({
        monthString: '2026-09',
        summary,
        sales,
        debtPayments,
        shopProfile
      })
    ).resolves.not.toThrow();

    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
