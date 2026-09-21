import { describe, it, expect } from 'vitest';
import { sanitizeTextForPrinter, formatTwoColumns, formatArticleLine, buildEscPosPayload, isBluetoothSupported, printViaRawBt } from './bluetoothPrinter';
import { Sale } from '../types';

describe('bluetoothPrinter', () => {
  it('sanitizes accented characters for thermal printers', () => {
    const raw = 'Élégant Café & Délices';
    const clean = sanitizeTextForPrinter(raw);
    expect(clean).toBe('Elegant Cafe & Delices');
  });

  it('formats two columns with exact character width', () => {
    const formatted = formatTwoColumns('Cahier 200p', '1500 F', 32);
    expect(formatted.length).toBe(32);
    expect(formatted.startsWith('Cahier 200p')).toBe(true);
    expect(formatted.endsWith('1500 F')).toBe(true);
  });

  it('formats single article line with description and price', () => {
    const line = formatArticleLine('Stylo Bleu', 250, 32);
    expect(line.length).toBe(32);
    expect(line).toContain('Stylo Bleu');
    expect(line).toContain('250 F');
  });

  it('builds ESC/POS binary payload with multi-items and totals', () => {
    const mockSale: Sale = {
      id: 'sale_test_123',
      totalAmount: 17500,
      paymentMethod: 'CASH',
      isCredit: false,
      customerName: 'Oumar Traore',
      items: [
        { id: '1', description: 'Riz 25kg', quantity: 1, unitPrice: 15000 },
        { id: '2', description: 'Huile 1L', quantity: 1, unitPrice: 2500 }
      ],
      createdAt: new Date().toISOString()
    };

    const payload = buildEscPosPayload(mockSale, { name: 'Alimentation du Faso', phone: '70001122' }, '58mm');
    expect(payload).toBeInstanceOf(Uint8Array);
    expect(payload.length).toBeGreaterThan(50);

    // Vérifie la présence des commandes ESC @ (0x1B, 0x40)
    expect(payload[0]).toBe(0x1B);
    expect(payload[1]).toBe(0x40);
  });

  it('checks bluetooth support without crashing', () => {
    const supported = isBluetoothSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('generates rawbt url without throwing', () => {
    const mockSale: Sale = {
      id: 'sale_test_rawbt',
      totalAmount: 5000,
      paymentMethod: 'CASH',
      isCredit: false,
      createdAt: new Date().toISOString()
    };
    const res = printViaRawBt(mockSale, { name: 'Boutique LAS' }, '58mm');
    expect(res.success).toBe(true);
  });
});
