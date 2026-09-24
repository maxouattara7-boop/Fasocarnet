import { describe, it, expect } from 'vitest';
import { 
  generateWhatsAppDebtReminderUrl, 
  generateWhatsAppReceiptUrl, 
  generateWhatsAppDebtPaymentReceiptUrl,
  generateDailyReportWhatsAppUrl 
} from './whatsapp';
import { Customer, DailySummary, Sale, ShopProfile } from '../types';

describe('whatsapp utility', () => {
  const mockShop: ShopProfile = {
    id: 'shop_1',
    name: 'Boutique Horizon',
    ownerName: 'M. Traoré',
    ownerPhone: '70998877',
    phone: '70000001',
    orangeMoneyNumber: '70000001',
    moovMoneyNumber: '60000002',
    waveNumber: '70000001',
    currency: 'FCFA',
    isConfigured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockCustomer: Customer = {
    id: 'cust_1',
    name: 'Moussa Traore',
    phone: '70123456',
    totalDebt: 12500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('generates a valid WhatsApp debt reminder url', () => {
    const url = generateWhatsAppDebtReminderUrl(mockCustomer, { remainingAmount: 12500 }, mockShop);
    expect(url).toContain('https://wa.me/22670123456?text=');
    expect(url).toContain(encodeURIComponent('Moussa Traore'));
    expect(url).toContain(encodeURIComponent('12 500 FCFA'));
    expect(url).toContain(encodeURIComponent('Boutique Horizon'));
    expect(url).toContain(encodeURIComponent('70000001'));
  });

  it('generates a valid WhatsApp sale receipt url', () => {
    const mockSale: Sale = {
      id: 'sale_1',
      totalAmount: 5000,
      paymentMethod: 'CASH',
      isCredit: false,
      receivedAmount: 10000,
      changeAmount: 5000,
      createdAt: new Date().toISOString()
    };

    const url = generateWhatsAppReceiptUrl(mockSale, mockShop, '75112233');
    expect(url).toContain('https://wa.me/22675112233?text=');
    expect(url).toContain(encodeURIComponent('5 000 FCFA'));
    expect(url).toContain(encodeURIComponent('Espèces (Cash)'));
  });

  it('generates itemized details with quantity, unit price and total', () => {
    const mockSaleWithItems: Sale = {
      id: 'sale_2',
      totalAmount: 300,
      paymentMethod: 'CASH',
      isCredit: false,
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          description: 'Bic Bleu',
          quantity: 3,
          unitPrice: 100
        }
      ],
      createdAt: new Date().toISOString()
    };

    const url = generateWhatsAppReceiptUrl(mockSaleWithItems, mockShop, '75112233');
    expect(url).toContain(encodeURIComponent('Bic Bleu : 3 x 100 FCFA = *300 FCFA*'));
  });

  it('generates a valid WhatsApp payment receipt url', () => {
    const url = generateWhatsAppDebtPaymentReceiptUrl('Moussa', '70123456', 5000, 7500, mockShop);
    expect(url).toContain('https://wa.me/22670123456?text=');
    expect(url).toContain(encodeURIComponent('5 000 FCFA'));
    expect(url).toContain(encodeURIComponent('7 500 FCFA'));
  });

  it('generates a valid Daily Report WhatsApp message for the shop owner', () => {
    const mockSummary: DailySummary = {
      date: '2026-09-18',
      totalSales: 85000,
      cashSales: 50000,
      orangeMoneySales: 35000,
      moovMoneySales: 0,
      waveSales: 0,
      creditSales: 15000,
      salesCount: 12,
      totalRecoveredDebts: 12500
    };

    const url = generateDailyReportWhatsAppUrl(mockSummary, mockShop);
    expect(url).toContain('https://wa.me/22670998877?text=');
    expect(url).toContain(encodeURIComponent('POINT DE CAISSE DU SOIR'));
    expect(url).toContain(encodeURIComponent('85 000 FCFA'));
    expect(url).toContain(encodeURIComponent('50 000 FCFA'));
    expect(url).toContain(encodeURIComponent('35 000 FCFA'));
    expect(url).toContain(encodeURIComponent('15 000 FCFA'));
    expect(url).toContain(encodeURIComponent('12 500 FCFA'));
  });
});
