import { describe, it, expect } from 'vitest';
import { generateReceiptCanvas, extractReceiptItems } from './receiptGenerator';
import { Sale, ShopProfile } from '../types';

describe('receiptGenerator', () => {
  const mockShop: ShopProfile = {
    id: 'shop_1',
    name: 'Boutique La Grâce',
    phone: '70 12 34 56',
    orangeMoneyNumber: '70 12 34 56',
    moovMoneyNumber: '60 00 11 22',
    currency: 'FCFA',
    isConfigured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockSale: Sale = {
    id: 'sale_12345678',
    totalAmount: 25000,
    paymentMethod: 'ORANGE_MONEY',
    isCredit: false,
    customerName: 'Moussa Ouédraogo',
    notes: '2 sacs de riz 25kg',
    createdAt: new Date().toISOString()
  };

  it('extracts structured items from sale with items array or notes', () => {
    const saleWithItems: Sale = {
      ...mockSale,
      items: [
        { id: '1', description: 'Cahier 200p', quantity: 1, unitPrice: 1500 },
        { id: '2', description: 'Stylo Bic', quantity: 1, unitPrice: 500 }
      ]
    };
    const items = extractReceiptItems(saleWithItems);
    expect(items).toHaveLength(2);
    expect(items[0].description).toBe('Cahier 200p');
    expect(items[0].total).toBe(1500);
  });

  it('generates a valid HTML5 canvas element with custom dimensions', async () => {
    const canvas = await generateReceiptCanvas(mockSale, mockShop);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(640 * 2);
    expect(canvas.height).toBeGreaterThanOrEqual(940 * 2);
  });
});
