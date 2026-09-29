import { jsPDF } from 'jspdf';
import { CustomInvoice, ShopProfile } from '../types';
import { formatCurrency } from './formatters';
import { downloadOrSharePdfBlob, FileActionResult } from './fileDownloader';
import { getLegalArreteMention } from './numberToWords';

export interface GeneratePdfOptions {
  directShare?: boolean;
}

/**
 * Génère un document PDF haute résolution (format A4 Portrait) pour une Facture, un Devis ou une Proforma
 */
export function generateCustomInvoicePdf(
  invoice: CustomInvoice,
  shop?: Partial<ShopProfile>
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isQuote = invoice.type === 'QUOTE';
  const isProforma = invoice.type === 'PROFORMA';

  // Palette de couleurs dynamique
  const themeColor = isQuote 
    ? [29, 78, 216] // Bleu roi (#1d4ed8)
    : isProforma 
    ? [99, 102, 241] // Indigo (#6366f1)
    : [4, 120, 87]; // Émeraude FasoCarnet (#047857)

  const themeLightBg = isQuote 
    ? [239, 246, 255] // Bleu très clair (#eff6ff)
    : isProforma 
    ? [238, 242, 255] // Indigo très clair (#eef2ff)
    : [236, 253, 245]; // Vert très clair (#ecfdf5)

  const docTypeTitle = isQuote 
    ? 'DEVIS ESTIMATIF' 
    : isProforma 
    ? 'FACTURE PROFORMA' 
    : 'FACTURE COMMERCIALE';

  const marginX = 14;
  let currentY = 16;

  // 1. EN-TÊTE DE LA BOUTIQUE / ENTREPRISE
  const shopName = shop?.name || 'COMMERCE FASOCARNET';
  
  // Si le logo de la boutique existe (Base64 data URL)
  if (shop?.logo && typeof shop.logo === 'string' && shop.logo.startsWith('data:image')) {
    try {
      doc.addImage(shop.logo, 'PNG', marginX, currentY - 2, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
      doc.text(shopName.toUpperCase(), marginX + 24, currentY + 4);

      let subY = currentY + 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      if (shop?.description) {
        doc.text(shop.description, marginX + 24, subY);
        subY += 4;
      }
      const contacts: string[] = [];
      if (shop?.phone) contacts.push(`Tél: ${shop.phone}`);
      if (shop?.city || shop?.address) contacts.push(`Ville: ${shop?.city || shop?.address}`);
      if (contacts.length > 0) {
        doc.text(contacts.join(' • '), marginX + 24, subY);
        subY += 4;
      }
      const legals: string[] = [];
      if (shop?.ifu) legals.push(`IFU: ${shop.ifu}`);
      if (shop?.rccm) legals.push(`RCCM: ${shop.rccm}`);
      if (legals.length > 0) {
        doc.text(legals.join(' • '), marginX + 24, subY);
      }
      currentY += 24;
    } catch {
      // Fallback sans image si format non supporté
      renderShopHeaderWithoutLogo();
    }
  } else {
    renderShopHeaderWithoutLogo();
  }

  function renderShopHeaderWithoutLogo() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text(shopName.toUpperCase(), marginX, currentY + 2);

    let subY = currentY + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    if (shop?.description) {
      doc.text(shop.description, marginX, subY);
      subY += 4;
    }
    const contacts: string[] = [];
    if (shop?.phone) contacts.push(`Tél: ${shop.phone}`);
    if (shop?.city || shop?.address) contacts.push(`Localité: ${shop?.city || shop?.address}`);
    if (contacts.length > 0) {
      doc.text(contacts.join(' • '), marginX, subY);
      subY += 4;
    }
    const legals: string[] = [];
    if (shop?.ifu) legals.push(`N° IFU: ${shop.ifu}`);
    if (shop?.rccm) legals.push(`N° RCCM: ${shop.rccm}`);
    if (legals.length > 0) {
      doc.text(legals.join(' • '), marginX, subY);
      subY += 4;
    }
    currentY = subY + 2;
  }

  // 2. BANDEAU DE TITRE DU DOCUMENT (TYPE & NUMÉRO)
  currentY += 2;
  doc.setFillColor(themeLightBg[0], themeLightBg[1], themeLightBg[2]);
  doc.roundedRect(marginX, currentY, 182, 16, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text(`${docTypeTitle} N° ${invoice.number}`, marginX + 4, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const issueDateFormatted = new Date(invoice.issueDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Date d'émission : ${issueDateFormatted}`, marginX + 4, currentY + 11.5);

  if (invoice.dueDate) {
    const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Échéance : ${dueDateFormatted}`, 130, currentY + 11.5);
  }

  // Statut du document
  const statusLabel = invoice.status === 'PAID' ? 'PAYÉ ✓' : invoice.status === 'SENT' ? 'ENVOYÉ' : 'OFFICIEL';
  const statusBg = invoice.status === 'PAID' ? [4, 120, 87] : [30, 41, 59];
  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(162, currentY + 3.5, 26, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, 175, currentY + 7.5, { align: 'center' });

  currentY += 21;

  // 3. ENCADRÉ INFORMATIONS DU CLIENT
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, 182, 17, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('FACTURÉ À / CLIENT :', marginX + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.clientName || 'Client Comptant', marginX + 4, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const clientDetails: string[] = [];
  if (invoice.clientPhone) clientDetails.push(`📞 Tél: ${invoice.clientPhone}`);
  if (invoice.clientAddress) clientDetails.push(`📍 ${invoice.clientAddress}`);
  if (invoice.clientIfu) clientDetails.push(`IFU: ${invoice.clientIfu}`);
  if (clientDetails.length > 0) {
    doc.text(clientDetails.join('   •   '), marginX + 4, currentY + 14.5);
  }

  currentY += 22;

  // 4. TABLEAU DES ARTICLES / PRESTATIONS
  const colX = {
    num: marginX + 3,
    desc: marginX + 12,
    qty: marginX + 112,
    unitPrice: marginX + 142,
    totalPrice: marginX + 178
  };

  // En-tête du tableau
  doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.roundedRect(marginX, currentY, 182, 7.5, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('#', colX.num, currentY + 5);
  doc.text('DÉSIGNATION DES ARTICLES / PRESTATIONS', colX.desc, currentY + 5);
  doc.text('QTÉ', colX.qty, currentY + 5, { align: 'center' });
  doc.text('P. UNITAIRE', colX.unitPrice, currentY + 5, { align: 'right' });
  doc.text('TOTAL FCFA', colX.totalPrice, currentY + 5, { align: 'right' });

  currentY += 8.5;

  // Lignes d'articles
  invoice.items.forEach((item, index) => {
    // Vérification de saut de page si nécessaire
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY - 1, 182, 7, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    // Numéro
    doc.text(String(index + 1), colX.num, currentY + 3.5);

    // Désignation (avec troncature propre si trop longue)
    const descLines = doc.splitTextToSize(item.description || 'Article', 95);
    doc.text(descLines[0] || 'Article', colX.desc, currentY + 3.5);

    // Quantité
    doc.text(String(item.quantity), colX.qty, currentY + 3.5, { align: 'center' });

    // Prix Unitaire
    doc.text(formatCurrency(item.unitPrice), colX.unitPrice, currentY + 3.5, { align: 'right' });

    // Total Ligne
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(item.totalPrice), colX.totalPrice, currentY + 3.5, { align: 'right' });

    currentY += 7;
  });

  // Ligne de séparation sous le tableau
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, currentY, marginX + 182, currentY);
  currentY += 5;

  // 5. BLOC TOTAUX (SOUS-TOTAL, REMISE, TVA, TOTAL NET)
  const totalsBoxWidth = 85;
  const totalsBoxX = marginX + 182 - totalsBoxWidth;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Sous-total :', totalsBoxX + 2, currentY + 3);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(invoice.subtotal), marginX + 182, currentY + 3, { align: 'right' });
  currentY += 5;

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    const discLabel = invoice.discountType === 'PERCENT' && invoice.discountValue 
      ? `Remise (${invoice.discountValue}%) :` 
      : 'Remise exceptionnelle :';
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(217, 119, 6);
    doc.text(discLabel, totalsBoxX + 2, currentY + 3);
    doc.setFont('helvetica', 'bold');
    doc.text(`- ${formatCurrency(invoice.discountAmount)}`, marginX + 182, currentY + 3, { align: 'right' });
    currentY += 5;
  }

  if (invoice.taxAmount && invoice.taxAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`TVA (${invoice.taxRate || 18}%) :`, totalsBoxX + 2, currentY + 3);
    doc.setFont('helvetica', 'bold');
    doc.text(`+ ${formatCurrency(invoice.taxAmount)}`, marginX + 182, currentY + 3, { align: 'right' });
    currentY += 5;
  }

  // Encadré TOTAL NET À PAYER
  currentY += 2;
  doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 10, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NET À PAYER :', totalsBoxX + 4, currentY + 6.5);

  doc.setFontSize(11);
  doc.text(formatCurrency(invoice.totalAmount), marginX + 180, currentY + 6.5, { align: 'right' });

  currentY += 14;

  // Si acompte / montant payé
  if (typeof invoice.paidAmount === 'number' && invoice.paidAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87);
    doc.text('Montant déjà réglé / Acompte :', totalsBoxX + 2, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(invoice.paidAmount), marginX + 182, currentY, { align: 'right' });
    currentY += 4.5;

    if (invoice.remainingAmount && invoice.remainingAmount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text('Solde restant dû :', totalsBoxX + 2, currentY);
      doc.text(formatCurrency(invoice.remainingAmount), marginX + 182, currentY, { align: 'right' });
      currentY += 6;
    }
  }

  // Mention Légale d'Arrêté du montant
  const arreteInfo = getLegalArreteMention(invoice.type, invoice.totalAmount);
  doc.setFillColor(themeLightBg[0], themeLightBg[1], themeLightBg[2]);
  doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.roundedRect(marginX, currentY, 182, 8, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text(arreteInfo.fullMention, marginX + 3, currentY + 5.2);
  currentY += 12;

  // 6. MOYENS DE PAIEMENT & CONDITIONS
  const paymentMethods: string[] = [];
  if (shop?.orangeMoneyNumber) paymentMethods.push(`🟠 Orange Money: ${shop.orangeMoneyNumber}`);
  if (shop?.moovMoneyNumber) paymentMethods.push(`🔵 Moov Money: ${shop.moovMoneyNumber}`);
  if (shop?.waveNumber) paymentMethods.push(`🌊 Wave: ${shop.waveNumber}`);

  if (paymentMethods.length > 0 || invoice.paymentTerms || invoice.notes) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, 182, 18, 2, 2, 'FD');

    let textY = currentY + 4.5;
    if (paymentMethods.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('MOYENS DE PAIEMENT :', marginX + 3, textY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(paymentMethods.join('   •   '), marginX + 39, textY);
      textY += 4.5;
    }

    if (invoice.paymentTerms) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CONDITIONS :', marginX + 3, textY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(invoice.paymentTerms, marginX + 25, textY);
      textY += 4.5;
    }

    if (invoice.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('NOTE :', marginX + 3, textY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(invoice.notes, marginX + 16, textY);
    }

    currentY += 22;
  }

  // 7. ZONES DE SIGNATURE ET CACHET
  if (currentY > 255) {
    doc.addPage();
    currentY = 20;
  }

  const sigBoxY = Math.max(currentY + 2, 245);
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  
  // Cadre Signature Client
  doc.roundedRect(marginX, sigBoxY, 85, 24, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SIGNATURE & CACHET CLIENT', marginX + 4, sigBoxY + 5);

  // Cadre Signature Fournisseur / Commerce
  doc.roundedRect(marginX + 97, sigBoxY, 85, 24, 2, 2, 'D');
  doc.text(`POUR ${shopName.toUpperCase()}`, marginX + 101, sigBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Signature & Cachet autorisés', marginX + 101, sigBoxY + 9);

  // 8. PIED DE PAGE
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, 282, marginX + 182, 282);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const footerText = `${shopName} • Document certifié conforme généré sur l'application FasoCarnet`;
  doc.text(footerText, 105, 286, { align: 'center' });

  return doc;
}

/**
 * Télécharge ou partage le document PDF directement sur le périphérique
 */
export async function downloadOrShareCustomInvoicePdf(
  invoice: CustomInvoice,
  shop?: Partial<ShopProfile>,
  options: GeneratePdfOptions = {}
): Promise<FileActionResult> {
  const isQuote = invoice.type === 'QUOTE';
  const prefix = isQuote ? 'Devis' : invoice.type === 'PROFORMA' ? 'Proforma' : 'Facture';
  const cleanNumber = invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${prefix}_${cleanNumber}.pdf`;

  const doc = generateCustomInvoicePdf(invoice, shop);
  const pdfBlob = doc.output('blob');
  const base64Data = doc.output('datauristring').split(',')[1];

  return downloadOrSharePdfBlob({
    fileName,
    blob: pdfBlob,
    base64Data,
    title: `${prefix} N° ${invoice.number} - ${shop?.name || 'FasoCarnet'}`,
    text: `Veuillez trouver ci-joint votre ${prefix.toLowerCase()} N° ${invoice.number} émis par ${shop?.name || 'notre établissement'}.`,
    directShare: options.directShare
  });
}
