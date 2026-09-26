import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { customInvoiceService } from './customInvoiceService';
import { generateCustomInvoiceWhatsAppMessage, generateCustomInvoiceHtml } from '../../utils/customInvoiceRenderer';

describe('customInvoiceService', () => {
  beforeEach(async () => {
    await db.customInvoices.clear();
  });

  it('generates sequential document numbers based on type and current month', async () => {
    const num1 = await customInvoiceService.generateNumber('INVOICE');
    const num2 = await customInvoiceService.generateNumber('QUOTE');
    const num3 = await customInvoiceService.generateNumber('PROFORMA');

    expect(num1).toMatch(/^FAC-\d{6}-001$/);
    expect(num2).toMatch(/^DEV-\d{6}-001$/);
    expect(num3).toMatch(/^PRO-\d{6}-001$/);

    // Save one invoice and generate next
    await customInvoiceService.create({
      number: num1,
      type: 'INVOICE',
      clientName: 'Entreprise Faso Tech',
      issueDate: '2026-09-26',
      items: [{ id: '1', description: 'Imprimante thermique', quantity: 2, unitPrice: 35000, totalPrice: 70000 }],
      subtotal: 70000,
      totalAmount: 70000,
      status: 'SENT'
    });

    const nextInvoiceNum = await customInvoiceService.generateNumber('INVOICE');
    expect(nextInvoiceNum).toMatch(/^FAC-\d{6}-002$/);
  });

  it('creates, retrieves, updates and deletes custom invoices', async () => {
    const inv = await customInvoiceService.create({
      number: 'FAC-202609-001',
      type: 'INVOICE',
      clientName: 'Client Alpha',
      clientPhone: '70000001',
      issueDate: '2026-09-26',
      items: [
        { id: '1', description: 'Sac de riz', quantity: 1, unitPrice: 18500, totalPrice: 18500 },
        { id: '2', description: 'Huile 5L', quantity: 2, unitPrice: 7500, totalPrice: 15000 }
      ],
      subtotal: 33500,
      discountAmount: 1500,
      discountType: 'AMOUNT',
      discountValue: 1500,
      totalAmount: 32000,
      status: 'SENT'
    });

    expect(inv.id).toBeDefined();
    expect(inv.clientName).toBe('Client Alpha');

    const all = await customInvoiceService.getAll();
    expect(all.length).toBe(1);

    await customInvoiceService.update(inv.id, { status: 'PAID', paidAmount: 32000 });
    const updated = await customInvoiceService.getById(inv.id);
    expect(updated?.status).toBe('PAID');
    expect(updated?.paidAmount).toBe(32000);

    await customInvoiceService.delete(inv.id);
    const afterDelete = await customInvoiceService.getAll();
    expect(afterDelete.length).toBe(0);
  });

  it('generates formatted WhatsApp message and HTML document properly', () => {
    const invoice = {
      id: 'doc_123',
      number: 'DEV-202609-001',
      type: 'QUOTE' as const,
      clientName: 'M. Ouedraogo',
      clientPhone: '76000000',
      issueDate: '2026-09-26',
      items: [
        { id: '1', description: 'Prestation Informatique', quantity: 1, unitPrice: 50000, totalPrice: 50000 }
      ],
      subtotal: 50000,
      discountAmount: 5000,
      discountType: 'PERCENT' as const,
      discountValue: 10,
      totalAmount: 45000,
      status: 'SENT' as const,
      paymentTerms: 'Paiement à la livraison',
      createdAt: '2026-09-26T10:00:00.000Z'
    };

    const waMsg = generateCustomInvoiceWhatsAppMessage(invoice, {
      name: 'Super Quincaillerie',
      phone: '70112233',
      orangeMoneyNumber: '70112233'
    });

    expect(waMsg).toContain('DEVIS N° DEV-202609-001');
    expect(waMsg).toContain('Super Quincaillerie');
    expect(waMsg).toContain('Prestation Informatique');
    expect(waMsg).toContain('45 000');

    const html = generateCustomInvoiceHtml(invoice, {
      name: 'Super Quincaillerie',
      phone: '70112233'
    });

    expect(html).toContain('DEVIS');
    expect(html).toContain('DEV-202609-001');
    expect(html).toContain('M. Ouedraogo');
    expect(html).toContain('Prestation Informatique');
  });
});
