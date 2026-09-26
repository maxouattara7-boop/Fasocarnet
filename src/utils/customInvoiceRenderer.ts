import { CustomInvoice, ShopProfile } from '../types';
import { formatCurrency } from './formatters';

/**
 * Génère le message texte formaté pour le partage WhatsApp d'une Facture ou d'un Devis
 */
export function generateCustomInvoiceWhatsAppMessage(
  invoice: CustomInvoice,
  shop?: Partial<ShopProfile>
): string {
  const isQuote = invoice.type === 'QUOTE';
  const isProforma = invoice.type === 'PROFORMA';
  const typeLabel = isQuote ? 'DEVIS' : isProforma ? 'FACTURE PROFORMA' : 'FACTURE';
  
  const shopName = shop?.name || 'Notre Boutique';
  const lines: string[] = [];

  lines.push(`📄 *${typeLabel} N° ${invoice.number}*`);
  lines.push(`🏪 *${shopName}*`);
  if (shop?.phone) lines.push(`📞 Contact : ${shop.phone}`);
  if (shop?.address) lines.push(`📍 ${shop.address}`);
  lines.push('────────────────────────');

  lines.push(`👤 *Client :* ${invoice.clientName}`);
  if (invoice.clientPhone) lines.push(`📱 Tél : ${invoice.clientPhone}`);
  lines.push(`📅 Date : ${new Date(invoice.issueDate).toLocaleDateString('fr-FR')}`);
  if (invoice.dueDate) {
    lines.push(`⏳ Échéance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`);
  }
  lines.push('────────────────────────');

  lines.push('*DÉTAIL DES ARTICLES :*');
  invoice.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. *${item.description}*`);
    lines.push(`   ${item.quantity} x ${formatCurrency(item.unitPrice)} = *${formatCurrency(item.totalPrice)}*`);
  });

  lines.push('────────────────────────');
  lines.push(`Sous-total : *${formatCurrency(invoice.subtotal)}*`);

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    const discLabel = invoice.discountType === 'PERCENT' && invoice.discountValue 
      ? `Remise (${invoice.discountValue}%)` 
      : 'Remise';
    lines.push(`🎁 ${discLabel} : -${formatCurrency(invoice.discountAmount)}`);
  }

  if (invoice.taxAmount && invoice.taxAmount > 0) {
    lines.push(`🏛️ TVA (${invoice.taxRate || 18}%) : +${formatCurrency(invoice.taxAmount)}`);
  }

  lines.push(`👉 *TOTAL NET À PAYER : ${formatCurrency(invoice.totalAmount)}*`);
  lines.push('────────────────────────');

  // Coordonnées de paiement
  if (shop?.orangeMoneyNumber || shop?.moovMoneyNumber || shop?.waveNumber) {
    lines.push('*Moyens de paiement acceptés :*');
    if (shop.orangeMoneyNumber) lines.push(`• Orange Money : ${shop.orangeMoneyNumber}`);
    if (shop.moovMoneyNumber) lines.push(`• Moov Money : ${shop.moovMoneyNumber}`);
    if (shop.waveNumber) lines.push(`• Wave : ${shop.waveNumber}`);
    lines.push('────────────────────────');
  }

  if (invoice.paymentTerms) {
    lines.push(`ℹ️ _Conditions : ${invoice.paymentTerms}_`);
  }
  if (invoice.notes) {
    lines.push(`📝 _Note : ${invoice.notes}_`);
  }

  lines.push(`\n🙏 _Merci pour votre confiance !_`);

  return lines.join('\n');
}

/**
 * Génère le code HTML complet et stylisé pour l'impression A4 standard ou Ticket
 */
export function generateCustomInvoiceHtml(
  invoice: CustomInvoice,
  shop?: Partial<ShopProfile>
): string {
  const isQuote = invoice.type === 'QUOTE';
  const isProforma = invoice.type === 'PROFORMA';
  const docTitle = isQuote 
    ? 'DEVIS' 
    : isProforma 
    ? 'FACTURE PROFORMA' 
    : 'FACTURE COMMERCIALE';

  const issueDateFormatted = new Date(invoice.issueDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const dueDateFormatted = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${invoice.number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      color: #1e293b;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #047857;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .shop-info {
      max-width: 60%;
    }
    .shop-name {
      font-size: 22px;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .shop-details {
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      background: #047857;
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 6px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .doc-number {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .doc-date {
      font-size: 12px;
      color: #64748b;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #047857;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .table-container {
      margin-bottom: 25px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 10px 12px;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .total-highlight {
      background: #ecfdf5;
      color: #065f46;
      font-size: 16px;
      font-weight: 800;
      border-top: 2px solid #047857 !important;
      border-bottom: 2px solid #047857 !important;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
      margin-bottom: 25px;
    }
    .signature-box {
      border-top: 1px dashed #94a3b8;
      padding-top: 8px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- EN-TÊTE DE FACTURE -->
  <div class="header">
    <div class="shop-info">
      ${shop?.logo ? `<img src="${shop.logo}" alt="Logo" style="max-height: 55px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" />` : ''}
      <div class="shop-name">${shop?.name || 'FASOCARNET'}</div>
      <div class="shop-details">
        ${shop?.description ? `<div><em>${shop.description}</em></div>` : ''}
        ${shop?.address ? `<div>📍 ${shop.address}${shop.city ? ', ' + shop.city : ''}</div>` : ''}
        ${shop?.phone ? `<div>📞 Tél : ${shop.phone}</div>` : ''}
        ${shop?.email ? `<div>✉️ Email : ${shop.email}</div>` : ''}
        ${shop?.ifu ? `<div><strong>IFU :</strong> ${shop.ifu}</div>` : ''}
        ${shop?.rccm ? `<div><strong>RCCM :</strong> ${shop.rccm}</div>` : ''}
      </div>
    </div>

    <div class="doc-meta">
      <div class="doc-badge">${docTitle}</div>
      <div class="doc-number">N° <strong>${invoice.number}</strong></div>
      <div class="doc-date">Date : <strong>${issueDateFormatted}</strong></div>
      ${dueDateFormatted ? `<div class="doc-date">Échéance : <strong>${dueDateFormatted}</strong></div>` : ''}
    </div>
  </div>

  <!-- CADRES CLIENT & CONDITIONS -->
  <div class="grid-info">
    <div class="card">
      <div class="card-title">Facturé à (Client)</div>
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
        ${invoice.clientName}
      </div>
      ${invoice.clientPhone ? `<div style="color: #475569;">📞 ${invoice.clientPhone}</div>` : ''}
      ${invoice.clientAddress ? `<div style="color: #475569;">📍 ${invoice.clientAddress}</div>` : ''}
      ${invoice.clientIfu ? `<div style="color: #475569;"><strong>IFU Client :</strong> ${invoice.clientIfu}</div>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Modalités & Règlement</div>
      <div><strong>État :</strong> ${
        invoice.status === 'PAID' ? '✅ PAYÉE' : invoice.status === 'SENT' ? '📤 ENVOYÉE' : '📝 BROUILLON'
      }</div>
      ${invoice.paymentTerms ? `<div style="margin-top: 4px;"><strong>Conditions :</strong> ${invoice.paymentTerms}</div>` : ''}
      ${(shop?.orangeMoneyNumber || shop?.moovMoneyNumber || shop?.waveNumber) ? `
        <div style="margin-top: 6px; font-size: 11px; color: #475569;">
          <strong>Paiement Mobile :</strong><br/>
          ${shop.orangeMoneyNumber ? `• OM : ${shop.orangeMoneyNumber} ` : ''}
          ${shop.moovMoneyNumber ? `• Moov : ${shop.moovMoneyNumber} ` : ''}
          ${shop.waveNumber ? `• Wave : ${shop.waveNumber}` : ''}
        </div>
      ` : ''}
    </div>
  </div>

  <!-- TABLEAU DES ARTICLES -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 50%;">Désignation</th>
          <th style="width: 15%;" class="text-center">Quantité</th>
          <th style="width: 15%;" class="text-right">Prix Unitaire</th>
          <th style="width: 15%;" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((it, idx) => `
          <tr>
            <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
            <td style="font-weight: 600; color: #1e293b;">${it.description}</td>
            <td class="text-center font-bold">${it.quantity}</td>
            <td class="text-right">${formatCurrency(it.unitPrice)}</td>
            <td class="text-right font-extrabold" style="color: #047857;">${formatCurrency(it.totalPrice)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- TOTAUX & CALCULS -->
  <div class="totals-container">
    <table class="totals-table">
      <tr>
        <td style="color: #64748b; font-weight: 600;">Sous-total HT</td>
        <td class="text-right font-bold">${formatCurrency(invoice.subtotal)}</td>
      </tr>
      ${(invoice.discountAmount && invoice.discountAmount > 0) ? `
        <tr>
          <td style="color: #dc2626; font-weight: 600;">
            Remise ${invoice.discountType === 'PERCENT' && invoice.discountValue ? `(${invoice.discountValue}%)` : ''}
          </td>
          <td class="text-right font-bold" style="color: #dc2626;">-${formatCurrency(invoice.discountAmount)}</td>
        </tr>
      ` : ''}
      ${(invoice.taxAmount && invoice.taxAmount > 0) ? `
        <tr>
          <td style="color: #64748b; font-weight: 600;">TVA (${invoice.taxRate || 18}%)</td>
          <td class="text-right font-bold">+${formatCurrency(invoice.taxAmount)}</td>
        </tr>
      ` : ''}
      <tr class="total-highlight">
        <td>TOTAL NET TTC</td>
        <td class="text-right">${formatCurrency(invoice.totalAmount)}</td>
      </tr>
      ${(typeof invoice.paidAmount === 'number' && invoice.paidAmount > 0) ? `
        <tr>
          <td style="color: #047857; font-weight: 600;">Montant Encaissé</td>
          <td class="text-right font-bold" style="color: #047857;">${formatCurrency(invoice.paidAmount)}</td>
        </tr>
        <tr>
          <td style="color: #b91c1c; font-weight: 700;">Reste à payer</td>
          <td class="text-right font-extrabold" style="color: #b91c1c;">${formatCurrency(invoice.remainingAmount || 0)}</td>
        </tr>
      ` : ''}
    </table>
  </div>

  <!-- NOTES / MENTIONS SPÉCIALES -->
  ${invoice.notes ? `
    <div style="background: #f8fafc; border-left: 3px solid #047857; padding: 10px 14px; margin-bottom: 25px; font-size: 12px; color: #334155;">
      <strong>Note :</strong> ${invoice.notes}
    </div>
  ` : ''}

  <!-- SIGNATURES -->
  <div class="signature-grid">
    <div class="signature-box">
      Signature & Cachet Client
    </div>
    <div class="signature-box">
      Pour <strong>${shop?.name || 'FASOCARNET'}</strong> (Signature & Cachet)
    </div>
  </div>

  <!-- PIED DE PAGE -->
  <div class="footer">
    <div style="text-align: center;">
      ${shop?.name || 'FASOCARNET'} ${shop?.ifu ? `• IFU : ${shop.ifu}` : ''} ${shop?.rccm ? `• RCCM : ${shop.rccm}` : ''} ${shop?.phone ? `• Tél : ${shop.phone}` : ''}<br/>
      Document généré avec précision sur <strong>FasoCarnet</strong>.
    </div>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Déclenche l'impression directe du document (A4 standard)
 */
export function printCustomInvoice(invoice: CustomInvoice, shop?: Partial<ShopProfile>): void {
  const html = generateCustomInvoiceHtml(invoice, shop);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  }
}
