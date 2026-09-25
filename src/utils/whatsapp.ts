import { cleanPhoneNumber, formatCurrency } from './formatters';
import { Customer, DailySummary, Sale, ShopProfile } from '../types';

/**
 * Génère le lien WhatsApp direct pour relancer un client sur une dette
 */
export function generateWhatsAppDebtReminderUrl(
  customer: Customer,
  debt: { remainingAmount: number; dueDate?: string },
  shop?: Partial<ShopProfile>
): string {
  const shopName = shop?.name || 'Votre Boutique';
  const paymentMethods: string[] = [];

  if (shop?.orangeMoneyNumber) paymentMethods.push(`🟧 Orange Money : *${shop.orangeMoneyNumber}*`);
  if (shop?.moovMoneyNumber) paymentMethods.push(`🟦 Moov Money : *${shop.moovMoneyNumber}*`);
  if (shop?.waveNumber) paymentMethods.push(`🔷 Wave : *${shop.waveNumber}*`);
  if (paymentMethods.length === 0 && shop?.phone) {
    paymentMethods.push(`📱 Contact : *${shop.phone}*`);
  }

  const paymentText = paymentMethods.length > 0 
    ? `\n\nVous pouvez effectuer votre règlement par :\n${paymentMethods.join('\n')}` 
    : '';

  const message = `Bonjour *${customer.name}*,\n\n` +
    `L'établissement *${shopName}* vous salue chaleureusement.\n` +
    `Sauf erreur de notre part, votre carnet indique un solde restant de *${formatCurrency(debt.remainingAmount)}* sur vos récents achats.` +
    paymentText +
    `\n\nMerci pour votre confiance et à très bientôt ! 🙏`;

  const phoneParam = cleanPhoneNumber(customer.phone);
  return `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien WhatsApp pour envoyer un reçu de vente à un client
 */
export function generateWhatsAppReceiptUrl(
  sale: Sale,
  shop?: Partial<ShopProfile>,
  customerPhone?: string
): string {
  const shopName = shop?.name || 'FasoCarnet';
  const dateStr = new Date(sale.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let modePaiementLabel = 'Espèces (Cash)';
  if (sale.paymentMethod === 'ORANGE_MONEY') modePaiementLabel = 'Orange Money';
  if (sale.paymentMethod === 'MOOV_MONEY') modePaiementLabel = 'Moov Money';
  if (sale.paymentMethod === 'WAVE') modePaiementLabel = 'Wave';
  if (sale.paymentMethod === 'CREDIT') modePaiementLabel = 'À Crédit';
  if (sale.isPartialCredit) {
    const downMethod = sale.downPaymentMethod || sale.paymentMethod;
    const methodLabel = downMethod === 'ORANGE_MONEY' ? 'Orange Money' : downMethod === 'MOOV_MONEY' ? 'Moov Money' : downMethod === 'WAVE' ? 'Wave' : 'Espèces';
    modePaiementLabel = `Acompte partiel (${methodLabel})`;
  }

  let itemsText = '';
  if (sale.items && sale.items.length > 0) {
    itemsText = '\n*Détail des articles :*\n' +
      sale.items.map(i => `• ${i.description} : ${i.quantity} x ${formatCurrency(i.unitPrice)} = *${formatCurrency(i.quantity * i.unitPrice)}*`).join('\n') + '\n';
  }

  let partialDetailsText = '';
  if (sale.isPartialCredit) {
    partialDetailsText = `💵 *Acompte versé :* ${formatCurrency(sale.paidAmount || 0)}\n` +
      `⚠️ *Reliquat restant en dette :* ${formatCurrency(sale.creditAmount || 0)}\n` +
      (sale.customerName ? `👤 *Client bénéficiaire :* ${sale.customerName}\n` : '');
  }

  const message = `🧾 *REÇU DE VENTE - ${shopName.toUpperCase()}*\n` +
    `📅 Date : ${dateStr}\n` +
    `--------------------------\n` +
    itemsText +
    `💰 *TOTAL : ${formatCurrency(sale.totalAmount)}*\n` +
    `💳 Mode : ${modePaiementLabel}\n` +
    (sale.transactionRef ? `🔖 *Réf. Transaction :* ${sale.transactionRef}\n` : '') +
    partialDetailsText +
    (!sale.isPartialCredit && sale.receivedAmount && sale.changeAmount ? `💵 Reçu : ${formatCurrency(sale.receivedAmount)} | Monnaie : ${formatCurrency(sale.changeAmount)}\n` : '') +
    `--------------------------\n` +
    `Merci de votre achat chez *${shopName}* ! À bientôt. ✨`;

  const targetPhone = customerPhone ? cleanPhoneNumber(customerPhone) : '';
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien WhatsApp pour envoyer un reçu d'acompte / remboursement de dette
 */
export function generateWhatsAppDebtPaymentReceiptUrl(
  customerName: string,
  customerPhone: string,
  amountPaid: number,
  newRemainingDebt: number,
  shop?: Partial<ShopProfile>
): string {
  const shopName = shop?.name || 'Votre Boutique';
  const message = `🧾 *REÇU DE RÈGLEMENT - ${shopName.toUpperCase()}*\n\n` +
    `Bonjour *${customerName}*,\n` +
    `Nous vous confirmons la bonne réception de votre versement de *${formatCurrency(amountPaid)}*.\n\n` +
    `📊 *Nouveau solde restant dû : ${formatCurrency(newRemainingDebt)}*\n\n` +
    `Merci pour votre ponctualité et votre confiance ! 🙏`;

  return `https://wa.me/${cleanPhoneNumber(customerPhone)}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien WhatsApp pour envoyer le Bilan / Point du Soir au Propriétaire / Patron
 */
export function generateDailyReportWhatsAppUrl(
  summary: DailySummary,
  shop?: Partial<ShopProfile>
): string {
  const shopName = shop?.name || 'Ma Boutique';
  const ownerName = shop?.ownerName || 'Patron';
  
  // Formatage de la date du bilan
  const [year, month, day] = summary.date.split('-');
  const dateFormatted = `${day}/${month}/${year}`;

  const message = `📊 *POINT DE CAISSE DU SOIR - ${shopName.toUpperCase()}*\n` +
    `📅 Date : *${dateFormatted}*\n` +
    `👤 Responsable : *${ownerName}*\n` +
    `----------------------------------\n` +
    `💰 *TOTAL ENCAISSÉ : ${formatCurrency(summary.totalSales)}* (${summary.salesCount} vente(s))\n` +
    `├─ 💵 Espèces (Cash) : ${formatCurrency(summary.cashSales)}\n` +
    `├─ 🟧 Orange Money   : ${formatCurrency(summary.orangeMoneySales)}\n` +
    `├─ 🟦 Moov Money     : ${formatCurrency(summary.moovMoneySales)}\n` +
    `└─ 🔷 Wave           : ${formatCurrency(summary.waveSales)}\n` +
    `----------------------------------\n` +
    `📋 *CRÉDITS & RECOUVREMENTS :*\n` +
    `• ⚠️ Nouveaux crédits accordés : ${formatCurrency(summary.creditSales)}\n` +
    `• 💰 Dettes clients récupérées  : ${formatCurrency(summary.totalRecoveredDebts)}\n` +
    `----------------------------------\n` +
    `✅ *Point de journée certifié FasoCarnet.*`;

  const targetPhone = shop?.ownerPhone ? cleanPhoneNumber(shop.ownerPhone) : '';
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}
