import { Sale, ShopProfile } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

/**
 * Génère une image PNG haute définition (Canvas 2D) du ticket de caisse stylisé
 */
export interface ParsedReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Extrait la liste des articles d'une vente (depuis sale.items ou sale.notes)
 */
export function extractReceiptItems(sale: Sale): ParsedReceiptItem[] {
  if (sale.items && sale.items.length > 0) {
    return sale.items.map((it) => ({
      description: it.description,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice,
      total: (it.quantity || 1) * it.unitPrice
    }));
  }

  if (sale.notes) {
    const parts = sale.notes.split(/[,+]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((part) => {
        const matchPrice = part.match(/\((\d+)\)/);
        const price = matchPrice ? parseInt(matchPrice[1], 10) : Math.round(sale.totalAmount / parts.length);
        const name = part.replace(/\(\d+\)/, '').trim();
        return {
          description: name || part,
          quantity: 1,
          unitPrice: price,
          total: price
        };
      });
    } else if (parts.length === 1) {
      return [{
        description: parts[0],
        quantity: 1,
        unitPrice: sale.totalAmount,
        total: sale.totalAmount
      }];
    }
  }

  return [{
    description: 'Vente Directe Caisse',
    quantity: 1,
    unitPrice: sale.totalAmount,
    total: sale.totalAmount
  }];
}

const loadLogoImage = (dataUrl?: string): Promise<HTMLImageElement | null> => {
  if (!dataUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    };
    img.src = dataUrl;
    // Sécurité timeout en environnement sans rendu natif (JSDOM / réseau lent)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 250);
  });
};

/**
 * Génère une image PNG haute définition (Canvas 2D) du ticket de caisse stylisé
 * En-tête vert épuré, compact et logo harmonieusement intégré
 */
/**
 * Génère une image haute définition (Canvas 2D) d'un véritable ticket de caisse sur rouleau thermique
 * Format rouleau papier blanc réaliste avec découpe crantée, contraste thermique optimal, Date & Heure bien visibles
 */
export async function generateReceiptCanvas(
  sale: Sale,
  shop?: Partial<ShopProfile>
): Promise<HTMLCanvasElement> {
  const items = extractReceiptItems(sale);
  const itemsCount = Math.max(1, items.length);
  const logoImg = await loadLogoImage(shop?.logo);
  const hasTaxInfo = Boolean(shop?.ifu || shop?.rccm);
  const hasDescription = Boolean(shop?.description && shop.description.trim());

  // Date et Heure bien formatées et dissociées
  const dateObj = new Date(sale.createdAt);
  const isValidDate = !isNaN(dateObj.getTime());
  const dateStr = isValidDate
    ? dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : formatDateTime(sale.createdAt);
  const timeStr = isValidDate
    ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  // Hauteur calculée dynamiquement selon le contenu
  const logoSize = 56;
  let headerContentHeight = 15;
  if (logoImg) headerContentHeight += logoSize + 12;
  headerContentHeight += 30; // Shop name
  if (hasDescription) headerContentHeight += 18;
  headerContentHeight += 20; // Téléphone & Ville
  if (hasTaxInfo) headerContentHeight += 20; // IFU & RCCM

  const isCredit = Boolean(sale.isCredit || sale.isPartialCredit);
  const hasDiscount = Boolean(sale.discountAmount && sale.discountAmount > 0);
  const hasChange = Boolean(!isCredit && sale.receivedAmount && sale.receivedAmount > sale.totalAmount);

  const dynamicHeight = Math.max(
    isCredit ? 920 : (hasDiscount || hasChange ? 860 : 820),
    headerContentHeight + 380 + (itemsCount * 40) + (sale.customerName ? 26 : 0) + (isCredit ? 90 : 0) + (hasDiscount ? 30 : 0) + (hasChange ? 26 : 0) + (shop?.orangeMoneyNumber || shop?.moovMoneyNumber || shop?.waveNumber ? 26 : 0)
  );

  const width = 640;
  const height = dynamicHeight;
  const scale = 2; // Rétina 2x pour une netteté cristalline

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible de créer le contexte 2D');

  ctx.scale(scale, scale);

  // 1. Fond d'ambiance externe doux
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, width, height);

  // 2. Bande de papier thermique blanche avec découpe crantée en bas
  const cardX = 36;
  const cardY = 16;
  const cardW = width - 72;
  const toothCount = 36;
  const toothW = cardW / toothCount;
  const toothH = 8;
  const paperBottomY = height - 20;

  // Ombre portée réaliste du rouleau de caisse
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';

  // Tracé du ticket avec dentelure en bas (effet massicot / papier thermique déchiré)
  ctx.beginPath();
  ctx.moveTo(cardX, cardY);
  ctx.lineTo(cardX + cardW, cardY);
  ctx.lineTo(cardX + cardW, paperBottomY - toothH);
  for (let i = toothCount; i >= 0; i--) {
    const x = cardX + i * toothW;
    const y = i % 2 === 0 ? paperBottomY - toothH : paperBottomY;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Fine bordure latérale et supérieure pour délimiter le papier
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, cardY);
  ctx.lineTo(cardX + cardW, cardY);
  ctx.lineTo(cardX + cardW, paperBottomY - toothH);
  for (let i = toothCount; i >= 0; i--) {
    const x = cardX + i * toothW;
    const y = i % 2 === 0 ? paperBottomY - toothH : paperBottomY;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cardX, cardY);
  ctx.stroke();

  const centerX = width / 2;
  let currY = cardY + 22;

  // 3. Logo de l'entreprise (si présent)
  if (logoImg) {
    try {
      const logoX = centerX - (logoSize / 2);
      ctx.drawImage(logoImg, logoX, currY, logoSize, logoSize);
      currY += logoSize + 14;
    } catch {
      currY += 4;
    }
  }

  // 4. En-tête thermique du commerce
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 23px "Courier New", Courier, monospace, sans-serif';
  const shopName = shop?.name || 'FASOCARNET';
  const truncatedShop = shopName.length > 28 ? shopName.slice(0, 27) + '…' : shopName;
  ctx.fillText(truncatedShop.toUpperCase(), centerX, currY);

  if (hasDescription && shop?.description) {
    currY += 18;
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 12px "Courier New", Courier, monospace, sans-serif';
    const truncatedDesc = shop.description.length > 48 ? shop.description.slice(0, 47) + '…' : shop.description;
    ctx.fillText(truncatedDesc, centerX, currY);
  }

  currY += 19;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  const contactText = shop?.phone ? `Tél : ${shop.phone}${shop?.city ? ` • ${shop.city}` : ''}` : 'Reçu de Caisse';
  ctx.fillText(contactText, centerX, currY);

  if (hasTaxInfo) {
    currY += 18;
    const taxParts: string[] = [];
    if (shop?.ifu) taxParts.push(`IFU: ${shop.ifu}`);
    if (shop?.rccm) taxParts.push(`RCCM: ${shop.rccm}`);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(taxParts.join('  |  '), centerX, currY);
  }

  // 5. Ligne de séparation en tirets thermiques
  currY += 16;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Titre du ticket
  currY += 20;
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 14px "Courier New", Courier, monospace, sans-serif';
  const ticketTitle = sale.isCredit
    ? '*** FACTURE CRÉDIT & DETTE ***'
    : sale.isPartialCredit
    ? '*** VENTE ACOMPTE & DETTE ***'
    : '*** TICKET DE CAISSE ***';
  ctx.fillText(ticketTitle, centerX, currY);

  currY += 14;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 6. Section Date & Heure bien visibles et métadonnées
  currY += 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(`Date  : ${dateStr}`, cardX + 18, currY);

  ctx.textAlign = 'right';
  ctx.fillText(`Heure : ${timeStr || '--:--'}`, cardX + cardW - 18, currY);

  currY += 18;
  ctx.textAlign = 'left';
  ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(`Ticket: #${sale.id.slice(-8).toUpperCase()}`, cardX + 18, currY);

  if (sale.customerName) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    const cleanClient = sale.customerName.length > 20 ? sale.customerName.slice(0, 19) + '…' : sale.customerName;
    ctx.fillText(`Client: ${cleanClient}`, cardX + cardW - 18, currY);
  }

  // 7. Tableau des articles
  currY += 14;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();
  ctx.setLineDash([]);

  currY += 16;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '900 11px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('ARTICLE (QTÉ x P.U.)', cardX + 18, currY);

  ctx.textAlign = 'right';
  ctx.fillText('TOTAL', cardX + cardW - 18, currY);

  currY += 10;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();
  ctx.setLineDash([]);

  currY += 18;

  for (const it of items) {
    // Ligne 1 de l'article : Nom à gauche, Total à droite
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Courier New", Courier, monospace, sans-serif';
    const desc = it.description.length > 26 ? it.description.slice(0, 25) + '…' : it.description;
    ctx.fillText(desc, cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.font = '900 13px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(formatCurrency(it.total), cardX + cardW - 18, currY);

    // Ligne 2 : Détail Qté x Prix Unitaire
    currY += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(`  Qté: ${it.quantity} x ${formatCurrency(it.unitPrice)}`, cardX + 18, currY);

    currY += 12;
    // Dotted separator between items
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cardX + 24, currY - 4);
    ctx.lineTo(cardX + cardW - 24, currY - 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 8. Séparateur double thermique avant le total
  currY += 4;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();

  currY += 4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();

  // 9. Sous-total et Remise si applicables
  if (hasDiscount) {
    currY += 20;
    const subtotal = sale.subtotalAmount || (sale.totalAmount + (sale.discountAmount || 0));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Sous-Total Brut :', cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(subtotal), cardX + cardW - 18, currY);

    currY += 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    const discLabel = sale.discountType === 'PERCENT' && sale.discountValue ? `(${sale.discountValue}%)` : '';
    ctx.fillText(`Remise Accordée ${discLabel} :`, cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.fillText(`-${formatCurrency(sale.discountAmount || 0)}`, cardX + cardW - 18, currY);

    currY += 10;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cardX + 16, currY);
    ctx.lineTo(cardX + cardW - 16, currY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 10. TOTAL NET À PAYER (Très grand et très visible)
  currY += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(hasDiscount ? 'NET À PAYER :' : 'TOTAL :', cardX + 18, currY);

  ctx.textAlign = 'right';
  ctx.font = '900 24px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(formatCurrency(sale.totalAmount), cardX + cardW - 18, currY);

  currY += 14;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cardX + 16, currY);
  ctx.lineTo(cardX + cardW - 16, currY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 11. Mode de règlement & Monnaie
  currY += 20;
  let modeStr = 'Espèces (Cash)';
  if (sale.paymentMethod === 'ORANGE_MONEY') modeStr = 'Orange Money';
  else if (sale.paymentMethod === 'MOOV_MONEY') modeStr = 'Moov Money';
  else if (sale.paymentMethod === 'WAVE') modeStr = 'Wave';
  else if (sale.paymentMethod === 'CREDIT') modeStr = 'À Crédit (Dette)';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('Règlement :', cardX + 18, currY);

  ctx.textAlign = 'right';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(modeStr, cardX + cardW - 18, currY);

  if (sale.transactionRef) {
    currY += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Réf. Mobile :', cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 11px "Courier New", Courier, monospace, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(sale.transactionRef, cardX + cardW - 18, currY);
  }

  if (hasChange && sale.receivedAmount) {
    currY += 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Montant Reçu :', cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(formatCurrency(sale.receivedAmount), cardX + cardW - 18, currY);

    currY += 16;
    ctx.textAlign = 'left';
    ctx.fillText('Monnaie Rendue :', cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.font = '900 13px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(formatCurrency(sale.changeAmount || 0), cardX + cardW - 18, currY);
  }

  if (sale.isPartialCredit) {
    currY += 18;
    ctx.textAlign = 'left';
    ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Acompte versé :', cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(formatCurrency(sale.paidAmount || 0), cardX + cardW - 18, currY);

    currY += 16;
    ctx.textAlign = 'left';
    ctx.fillText('Reste dû (Dette) :', cardX + 18, currY);

    ctx.textAlign = 'right';
    ctx.font = '900 13px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(formatCurrency(sale.creditAmount || 0), cardX + cardW - 18, currY);
  }

  // 12. Mention pour les ventes à crédit
  if (isCredit) {
    currY += 18;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic bold 11px "Courier New", Courier, monospace, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Engagement: Le client reconnaît devoir ${formatCurrency(sale.creditAmount || sale.totalAmount)}.`, cardX + 18, currY);
  }

  // 13. Tampon thermique de statut
  currY += 34;
  ctx.save();
  ctx.translate(centerX, currY);
  ctx.rotate(-4 * (Math.PI / 180));

  if (sale.isCredit) {
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-120, -20, 240, 40, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    ctx.font = '900 15px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('*** ACCORDÉ À CRÉDIT ***', 0, 5);
  } else if (sale.isPartialCredit) {
    ctx.strokeStyle = '#d97706';
    ctx.fillStyle = 'rgba(217, 119, 6, 0.06)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-135, -20, 270, 40, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d97706';
    ctx.textAlign = 'center';
    ctx.font = '900 13px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('*** ACOMPTE PAYÉ • RESTE DÛ ***', 0, 5);
  } else {
    ctx.strokeStyle = '#059669';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-110, -20, 220, 40, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.textAlign = 'center';
    ctx.font = '900 15px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('✓ PAYÉ ENTIÈREMENT', 0, 5);
  }
  ctx.restore();

  // 14. Pied de ticket
  currY += 38;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('*** MERCI DE VOTRE VISITE ! ***', centerX, currY);

  currY += 16;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('Les articles vendus ne sont ni repris ni échangés', centerX, currY);

  currY += 15;
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('FASOCARNET • Caisse Tactile', centerX, currY);

  return canvas;
}

/**
 * Exporte le reçu sous forme de Data URL (base64 PNG ou JPEG)
 */
export async function generateReceiptDataUrl(
  sale: Sale, 
  shop?: Partial<ShopProfile>, 
  format: 'png' | 'jpeg' = 'png'
): Promise<string> {
  const canvas = await generateReceiptCanvas(sale, shop);
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mime, 0.95);
}

/**
 * Exporte le reçu sous forme de File Blob (pour téléchargement ou partage)
 */
export async function generateReceiptFile(
  sale: Sale, 
  shop?: Partial<ShopProfile>, 
  format: 'png' | 'jpeg' = 'png'
): Promise<File> {
  const canvas = await generateReceiptCanvas(sale, shop);
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Erreur lors de la conversion en image'));
        return;
      }
      const file = new File([blob], `recu-fasocarnet-${sale.id.slice(-6)}.${ext}`, {
        type: mime
      });
      resolve(file);
    }, mime, 0.95);
  });
}
