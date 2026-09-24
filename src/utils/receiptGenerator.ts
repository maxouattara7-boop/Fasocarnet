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
export async function generateReceiptCanvas(
  sale: Sale,
  shop?: Partial<ShopProfile>
): Promise<HTMLCanvasElement> {
  const items = extractReceiptItems(sale);
  const itemsCount = Math.max(1, items.length);
  const logoImg = await loadLogoImage(shop?.logo);
  const hasTaxInfo = Boolean(shop?.ifu || shop?.rccm);
  const hasDescription = Boolean(shop?.description && shop.description.trim());

  // Hauteur d'en-tête vert calculée harmonieusement pour tout centrer
  const logoSize = 64;
  let headerHeight = 20; // Top padding
  if (logoImg) {
    headerHeight += logoSize + 14;
  }
  headerHeight += 28; // Shop name
  if (hasDescription) {
    headerHeight += 20; // Slogan / Description
  }
  headerHeight += 20; // Contact info
  if (hasTaxInfo) {
    headerHeight += 20; // IFU / RCCM
  }
  headerHeight += 16; // Bottom padding

  const width = 640;
  // Calcul dynamique de la hauteur pour garantir des proportions parfaites
  const dynamicHeight = Math.max(
    820,
    headerHeight + 430 + (itemsCount * 36) + (sale.customerName ? 30 : 0) + (shop?.orangeMoneyNumber || shop?.moovMoneyNumber || shop?.waveNumber ? 30 : 0)
  );
  const height = dynamicHeight;
  const scale = 2; // Rétina 2x pour une netteté cristalline

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible de créer le contexte 2D');

  ctx.scale(scale, scale);

  // 1. Fond général avec dégradé subtil
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Carte principale blanche du ticket (papier thermique moderne)
  const cardX = 25;
  const cardY = 25;
  const cardW = width - 50;
  const cardH = height - 50;
  const radius = 22;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.07)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.shadowColor = 'transparent'; // Reset ombre

  // 3. Filigrane de sécurité discret 'FASOCARNET' en arrière-plan sur le corps du reçu
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY + headerHeight, cardW, cardH - headerHeight, [0, 0, radius, radius]);
  ctx.clip();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.035)'; // Filigrane très discret, lisible en fond sans gêner la lecture
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';

  const stepX = 220;
  const stepY = 130;
  for (let y = cardY + headerHeight - 60; y < height + 100; y += stepY) {
    for (let x = -80; x < width + 120; x += stepX) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-25 * (Math.PI / 180));
      ctx.fillText('FASOCARNET', 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();

  // 4. En-tête vert émeraude compact & raffiné
  const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerHeight);
  headerGrad.addColorStop(0, '#047857');
  headerGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = headerGrad;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, headerHeight, [radius, radius, 0, 0]);
  ctx.fill();

  const centerX = width / 2;
  let currY = cardY + 20;

  if (logoImg) {
    try {
      const logoX = centerX - (logoSize / 2);
      const logoY = currY;

      // Badge blanc arrondi avec ombre douce
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      // Dessin du logo centré dans le badge
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, 14);
      ctx.clip();
      ctx.drawImage(logoImg, logoX + 3, logoY + 3, logoSize - 6, logoSize - 6);
      ctx.restore();

      currY += logoSize + 22;
    } catch {
      currY += 10;
    }
  } else {
    currY += 10;
  }

  // Textes centrés harmonieusement ensemble
  ctx.textAlign = 'center';

  // Nom de la boutique
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  const shopName = shop?.name || 'FASOCARNET';
  const truncatedShop = shopName.length > 28 ? shopName.slice(0, 27) + '…' : shopName;
  ctx.fillText(truncatedShop.toUpperCase(), centerX, currY);

  // Slogan / Description de l'activité
  if (hasDescription && shop?.description) {
    currY += 20;
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'italic 12px sans-serif';
    const truncatedDesc = shop.description.length > 45 ? shop.description.slice(0, 44) + '…' : shop.description;
    ctx.fillText(truncatedDesc, centerX, currY);
  }

  // Téléphone & Ville
  currY += 20;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px sans-serif';
  const contactText = shop?.phone ? `Tél : ${shop.phone}${shop?.city ? ` • ${shop.city}` : ''}` : 'Reçu de Caisse Numérique';
  ctx.fillText(contactText, centerX, currY);

  // Mentions fiscales IFU / RCCM
  if (hasTaxInfo) {
    currY += 20;
    const taxParts: string[] = [];
    if (shop?.ifu) taxParts.push(`IFU: ${shop.ifu}`);
    if (shop?.rccm) taxParts.push(`RCCM: ${shop.rccm}`);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(taxParts.join('  •  '), centerX, currY);
  }

  // 4. Métadonnées (Date, Réf sur la même ligne pour compacité et élégance)
  const metaY = cardY + headerHeight + 24;
  const dateStr = formatDateTime(sale.createdAt);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Date : ${dateStr}`, cardX + 24, metaY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`Réf : #${sale.id.slice(-8).toUpperCase()}`, cardX + cardW - 24, metaY);

  let nextY = metaY + 12;

  if (sale.customerName) {
    nextY += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Client : ${sale.customerName}`, cardX + 24, nextY);
  }

  // 5. Ligne de séparation perforée (tirets modernes)
  const sepY = nextY + 16;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(cardX + 20, sepY);
  ctx.lineTo(cardX + cardW - 20, sepY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset

  // 6. En-tête du tableau des articles
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ARTICLE', cardX + 24, sepY + 20);

  ctx.textAlign = 'center';
  ctx.fillText('QTÉ', cardX + cardW - 190, sepY + 20);

  ctx.textAlign = 'right';
  ctx.fillText('P.U.', cardX + cardW - 110, sepY + 20);
  ctx.fillText('TOTAL', cardX + cardW - 24, sepY + 20);

  let currentY = sepY + 42;

  for (const it of items) {
    // Nom de l'article à gauche
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    const desc = it.description.length > 22 ? it.description.slice(0, 21) + '…' : it.description;
    ctx.fillText(desc, cardX + 24, currentY);

    // Quantité au centre
    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${it.quantity}`, cardX + cardW - 190, currentY);

    // Prix unitaire
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(formatCurrency(it.unitPrice).replace(' FCFA', ''), cardX + cardW - 110, currentY);

    // Prix total à droite
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#047857';
    ctx.fillText(formatCurrency(it.total), cardX + cardW - 24, currentY);

    currentY += 26;

    // Ligne fine pointillée entre articles
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cardX + 24, currentY - 8);
    ctx.lineTo(cardX + cardW - 24, currentY - 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 7. Bloc Total en Grand
  const totalBoxY = currentY + 12;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cardX + 20, totalBoxY, cardW - 40, 85, 14);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('TOTAL À PAYER :', cardX + 38, totalBoxY + 34);

  let modeText = 'Espèces (Cash)';
  if (sale.paymentMethod === 'ORANGE_MONEY') modeText = 'Orange Money';
  if (sale.paymentMethod === 'MOOV_MONEY') modeText = 'Moov Money';
  if (sale.paymentMethod === 'WAVE') modeText = 'Wave';
  if (sale.paymentMethod === 'CREDIT') modeText = 'À Crédit';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Règlement : ${modeText}`, cardX + 38, totalBoxY + 60);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 25px sans-serif';
  ctx.fillText(formatCurrency(sale.totalAmount), cardX + cardW - 38, totalBoxY + 52);

  // 8. Le Grand Tampon Officiel Stylisé
  const stampX = width / 2;
  const stampY = totalBoxY + 145;

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate(-7 * (Math.PI / 180));

  if (sale.isCredit) {
    // Tampon Rouge : ACCORDÉ À CRÉDIT
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-140, -28, 280, 56, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ACCORDÉ À CRÉDIT', 0, 6);
  } else {
    // Tampon Vert : PAYÉ ENTIÈREMENT
    ctx.strokeStyle = '#059669';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-140, -28, 280, 56, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('✓ PAYÉ ENTIÈREMENT', 0, 6);
  }
  ctx.restore();

  // 9. Pied de page
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.fillText('Merci pour votre confiance et à très bientôt !', width / 2, height - 60);

  const mmInfo: string[] = [];
  if (shop?.orangeMoneyNumber) mmInfo.push(`OM: ${shop.orangeMoneyNumber}`);
  if (shop?.moovMoneyNumber) mmInfo.push(`Moov: ${shop.moovMoneyNumber}`);
  if (shop?.waveNumber) mmInfo.push(`Wave: ${shop.waveNumber}`);

  if (mmInfo.length > 0) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Paiements acceptés : ${mmInfo.join('  •  ')}`, width / 2, height - 42);
  }

  return canvas;
}

/**
 * Exporte le reçu sous forme de Data URL (base64 PNG)
 */
export async function generateReceiptDataUrl(sale: Sale, shop?: Partial<ShopProfile>): Promise<string> {
  const canvas = await generateReceiptCanvas(sale, shop);
  return canvas.toDataURL('image/png');
}

/**
 * Exporte le reçu sous forme de File Blob (pour partage natif mobile WhatsApp)
 */
export async function generateReceiptFile(sale: Sale, shop?: Partial<ShopProfile>): Promise<File> {
  const canvas = await generateReceiptCanvas(sale, shop);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Erreur lors de la conversion en image'));
        return;
      }
      const file = new File([blob], `recu-fasocarnet-${sale.id.slice(-6)}.png`, {
        type: 'image/png'
      });
      resolve(file);
    }, 'image/png');
  });
}
