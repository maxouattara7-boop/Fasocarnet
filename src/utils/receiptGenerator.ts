import { Sale, ShopProfile } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

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

/**
 * Encodage Code 39 standard pour rendu de code-barres thermique
 */
const CODE39_MAP: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100'
};

export function generateCode39Bars(text: string): { isBar: boolean; width: number }[] {
  const clean = `*${text.toUpperCase().replace(/[^0-9A-Z\-\. ]/g, '')}*`;
  const result: { isBar: boolean; width: number }[] = [];
  
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['-'];
    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      result.push({ isBar, width: isWide ? 3 : 1 });
    }
    // Espace inter-caractères
    if (i < clean.length - 1) {
      result.push({ isBar: false, width: 1 });
    }
  }
  return result;
}

/**
 * Génère le SVG vectoriel du code-barres pour impression HTML
 */
export function generateBarcodeSvg(text: string, height: number = 46): string {
  const bars = generateCode39Bars(text);
  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);
  let currentX = 0;
  let rects = '';
  for (const b of bars) {
    if (b.isBar) {
      rects += `<rect x="${currentX}" y="0" width="${b.width}" height="${height}" fill="#000" />`;
    }
    currentX += b.width;
  }
  return `<svg viewBox="0 0 ${totalUnits} ${height}" style="width: 100%; max-width: 250px; height: ${height}px; display: block; margin: 0 auto;" preserveAspectRatio="none">${rects}</svg>`;
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
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 250);
  });
};

/**
 * Génère une image haute définition (Canvas 2D) d'un véritable ticket de caisse thermique
 * Conforme au modèle standard avec séparateurs étoiles et code-barres scannable en bas
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

  // Date et Heure bien formatées
  const dateObj = new Date(sale.createdAt);
  const isValidDate = !isNaN(dateObj.getTime());
  const dateStr = isValidDate
    ? dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : formatDateTime(sale.createdAt);
  const timeStr = isValidDate
    ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const logoSize = 52;
  let headerContentHeight = 15;
  if (logoImg) headerContentHeight += logoSize + 12;
  headerContentHeight += 32; // Shop name
  if (hasDescription) headerContentHeight += 18;
  headerContentHeight += 20; // Téléphone & Adresse
  if (hasTaxInfo) headerContentHeight += 20; // IFU / RCCM

  const isCredit = Boolean(sale.isCredit || sale.isPartialCredit);
  const hasDiscount = Boolean(sale.discountAmount && sale.discountAmount > 0);

  // Hauteur calculée dynamiquement pour accueillir toutes les sections et le code-barres
  const dynamicHeight = Math.max(
    880,
    headerContentHeight + 460 + (itemsCount * 42) + (sale.customerName ? 26 : 0) + (isCredit ? 60 : 0) + (hasDiscount ? 30 : 0)
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

  // 2. Bande de papier thermique blanche avec dentelures (massicot thermique)
  const cardX = 36;
  const cardY = 16;
  const cardW = width - 72;
  const toothCount = 38;
  const toothW = cardW / toothCount;
  const toothH = 7;
  const paperBottomY = height - 18;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';

  // Tracé cranté haut et bas (papier thermique découpé)
  ctx.beginPath();
  // Haut cranté
  ctx.moveTo(cardX, cardY + toothH);
  for (let i = 0; i <= toothCount; i++) {
    const x = cardX + i * toothW;
    const y = i % 2 === 0 ? cardY : cardY + toothH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cardX + cardW, paperBottomY - toothH);
  // Bas cranté
  for (let i = toothCount; i >= 0; i--) {
    const x = cardX + i * toothW;
    const y = i % 2 === 0 ? paperBottomY - toothH : paperBottomY;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Fine bordure thermique
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, cardY + toothH);
  for (let i = 0; i <= toothCount; i++) {
    const x = cardX + i * toothW;
    const y = i % 2 === 0 ? cardY : cardY + toothH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cardX + cardW, paperBottomY - toothH);
  for (let i = toothCount; i >= 0; i--) {
    const x = cardX + i * toothW;
    const y = i % 2 === 0 ? paperBottomY - toothH : paperBottomY;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cardX, cardY + toothH);
  ctx.stroke();

  const centerX = width / 2;
  const leftX = cardX + 28;
  const rightX = cardX + cardW - 28;
  let currY = cardY + 28;

  // Ligne de séparation en étoiles classique
  const drawStarDivider = () => {
    currY += 16;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px "Courier New", Courier, monospace';
    ctx.fillText('* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *', centerX, currY);
    currY += 12;
  };

  // 3. Logo boutique (si configuré)
  if (logoImg) {
    try {
      const logoX = centerX - (logoSize / 2);
      ctx.drawImage(logoImg, logoX, currY, logoSize, logoSize);
      currY += logoSize + 12;
    } catch {
      currY += 2;
    }
  }

  // 4. En-tête : SHOP NAME, Adresse, Téléphone
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px "Courier New", Courier, monospace, sans-serif';
  const shopName = shop?.name || 'FASOCARNET';
  const truncatedShop = shopName.length > 26 ? shopName.slice(0, 25) + '…' : shopName;
  ctx.fillText(truncatedShop.toUpperCase(), centerX, currY);

  if (hasDescription && shop?.description) {
    currY += 18;
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 12px "Courier New", Courier, monospace, sans-serif';
    const truncatedDesc = shop.description.length > 46 ? shop.description.slice(0, 45) + '…' : shop.description;
    ctx.fillText(truncatedDesc, centerX, currY);
  }

  const addressLine = [shop?.address, shop?.city].filter(Boolean).join(', ');
  if (addressLine) {
    currY += 19;
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12.5px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(`Adresse : ${addressLine}`, centerX, currY);
  }

  if (shop?.phone) {
    currY += 18;
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12.5px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(`Tél. : ${shop.phone}`, centerX, currY);
  }

  if (hasTaxInfo) {
    currY += 17;
    const taxParts: string[] = [];
    if (shop?.ifu) taxParts.push(`IFU: ${shop.ifu}`);
    if (shop?.rccm) taxParts.push(`RCCM: ${shop.rccm}`);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(taxParts.join('  •  '), centerX, currY);
  }

  // Séparateur 1
  drawStarDivider();

  // 5. Titre : CASH RECEIPT / TICKET DE CAISSE
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px "Courier New", Courier, monospace, sans-serif';
  const receiptTitle = sale.isCredit
    ? 'TICKET DE CRÉDIT & DETTE'
    : sale.isPartialCredit
    ? 'TICKET DE VENTE (AVEC ACOMPTE)'
    : 'TICKET DE CAISSE';
  ctx.fillText(receiptTitle, centerX, currY);

  // Séparateur 2
  drawStarDivider();

  // 6. En-tête des colonnes : Désignation (Description) et Prix (Price)
  currY += 4;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 13px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('Désignation', leftX, currY);

  ctx.textAlign = 'right';
  ctx.fillText('Prix', rightX, currY);
  currY += 12;

  // 7. Liste des articles
  for (const it of items) {
    currY += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Courier New", Courier, monospace, sans-serif';
    const desc = it.description.length > 25 ? it.description.slice(0, 24) + '…' : it.description;
    ctx.fillText(desc, leftX, currY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 13px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(formatCurrency(it.total), rightX, currY);

    // Si quantité > 1, ligne de détail sous le nom
    if (it.quantity > 1) {
      currY += 15;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Courier New", Courier, monospace, sans-serif';
      ctx.fillText(`  Qté: ${it.quantity} × ${formatCurrency(it.unitPrice)}`, leftX, currY);
    }
  }

  // Séparateur 3
  drawStarDivider();

  // 8. Totaux & Modes de paiement (Total, Cash / Mobile Money / Crédit)
  if (hasDiscount) {
    currY += 4;
    const subtotal = sale.subtotalAmount || (sale.totalAmount + (sale.discountAmount || 0));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Sous-Total Brut', leftX, currY);

    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(subtotal), rightX, currY);

    currY += 17;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Remise accordée', leftX, currY);

    ctx.textAlign = 'right';
    ctx.fillText(`-${formatCurrency(sale.discountAmount || 0)}`, rightX, currY);
    currY += 4;
  }

  currY += 6;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 17px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('Total', leftX, currY);

  ctx.textAlign = 'right';
  ctx.font = '900 18px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(formatCurrency(sale.totalAmount), rightX, currY);

  // Ligne de détail du mode de règlement
  currY += 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12.5px "Courier New", Courier, monospace, sans-serif';

  let paymentLabel = 'Espèces';
  if (sale.paymentMethod === 'ORANGE_MONEY') paymentLabel = 'Orange Money';
  else if (sale.paymentMethod === 'MOOV_MONEY') paymentLabel = 'Moov Money';
  else if (sale.paymentMethod === 'WAVE') paymentLabel = 'Wave';
  else if (sale.paymentMethod === 'CREDIT') paymentLabel = '100% Crédit (Dette)';

  if (sale.isPartialCredit) {
    ctx.fillText('Acompte versé', leftX, currY);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(sale.paidAmount || 0), rightX, currY);

    currY += 17;
    ctx.textAlign = 'left';
    ctx.fillText('Reste dû (Crédit)', leftX, currY);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(sale.creditAmount || 0), rightX, currY);
  } else {
    ctx.fillText(paymentLabel, leftX, currY);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(sale.totalAmount), rightX, currY);
  }

  // Séparateur 4
  drawStarDivider();

  // 9. Informations de transaction (Date, Heure, N° Ticket, Client)
  currY += 4;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('Date & Heure', leftX, currY);

  ctx.textAlign = 'right';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(`${dateStr}  ${timeStr}`, rightX, currY);

  currY += 18;
  ctx.textAlign = 'left';
  ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('N° Ticket', leftX, currY);

  const ticketCode = sale.id.slice(-8).toUpperCase();
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(`#${ticketCode}`, rightX, currY);

  if (sale.customerName) {
    currY += 18;
    ctx.textAlign = 'left';
    ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Client', leftX, currY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    const cleanCustomer = sale.customerName.length > 22 ? sale.customerName.slice(0, 21) + '…' : sale.customerName;
    ctx.fillText(cleanCustomer, rightX, currY);
  }

  if (sale.transactionRef) {
    currY += 18;
    ctx.textAlign = 'left';
    ctx.font = '12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText('Réf. Transaction', leftX, currY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
    ctx.fillText(sale.transactionRef, rightX, currY);
  }

  // Séparateur 5
  drawStarDivider();

  // 10. Message de remerciement (THANK YOU!)
  currY += 4;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 15px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('MERCI DE VOTRE VISITE !', centerX, currY);

  currY += 16;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText('À très bientôt !', centerX, currY);

  // 11. Code-barres scannable en bas du ticket
  currY += 20;
  const barcodeText = ticketCode;
  const bars = generateCode39Bars(barcodeText);
  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);
  const unitWidth = 2.4;
  const totalBarWidth = totalUnits * unitWidth;
  let startX = centerX - (totalBarWidth / 2);
  const barHeight = 44;

  ctx.fillStyle = '#0f172a';
  for (const b of bars) {
    const w = b.width * unitWidth;
    if (b.isBar) {
      ctx.fillRect(startX, currY, w, barHeight);
    }
    startX += w;
  }

  currY += barHeight + 12;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Courier New", Courier, monospace, sans-serif';
  ctx.fillText(`*${barcodeText}*`, centerX, currY);

  currY += 14;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Courier New", Courier, monospace, sans-serif';
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
