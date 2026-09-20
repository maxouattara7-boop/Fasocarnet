import { Sale, ShopProfile } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

/**
 * Génère une image PNG haute définition (Canvas 2D) du ticket de caisse stylisé
 */
export async function generateReceiptCanvas(
  sale: Sale,
  shop?: Partial<ShopProfile>
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 640;
  const height = 920;
  const scale = 2; // Rétina 2x pour une netteté parfaite

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

  // 2. Carte principale blanche du ticket (style papier thermique moderne)
  const cardX = 30;
  const cardY = 30;
  const cardW = width - 60;
  const cardH = height - 60;
  const radius = 24;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.shadowColor = 'transparent'; // Reset ombre

  // 3. En-tête vert émeraude de la boutique
  const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 140);
  headerGrad.addColorStop(0, '#047857');
  headerGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = headerGrad;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 140, [radius, radius, 0, 0]);
  ctx.fill();

  // Nom de la Boutique
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  const shopName = shop?.name || 'FASOCARNET';
  ctx.fillText(shopName.toUpperCase(), width / 2, cardY + 55);

  // Sous-titre & Contact
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '14px sans-serif';
  const contactText = shop?.phone ? `Tél : ${shop.phone}` : 'Reçu de Caisse Numérique';
  ctx.fillText(contactText, width / 2, cardY + 85);
  ctx.fillText('★ FASOCARNET • GESTION DIGITALE ★', width / 2, cardY + 112);

  // 4. Métadonnées (Date, Réf, Client)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  const dateStr = formatDateTime(sale.createdAt);
  ctx.fillText(`Date : ${dateStr}`, cardX + 30, cardY + 180);
  ctx.fillText(`Réf : #${sale.id.slice(-8).toUpperCase()}`, cardX + 30, cardY + 205);

  if (sale.customerName) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Client : ${sale.customerName}`, cardX + 30, cardY + 235);
  }

  // 5. Ligne de séparation perforée (tirets)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  const sepY = sale.customerName ? cardY + 260 : cardY + 230;
  ctx.moveTo(cardX + 25, sepY);
  ctx.lineTo(cardX + cardW - 25, sepY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset

  // 6. Articles ou Description
  let currentY = sepY + 40;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('DESCRIPTION', cardX + 30, currentY);
  ctx.textAlign = 'right';
  ctx.fillText('MONTANT', cardX + cardW - 30, currentY);

  currentY += 25;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'left';

  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      ctx.fillText(`• ${item.description} (x${item.quantity})`, cardX + 30, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(item.quantity * item.unitPrice), cardX + cardW - 30, currentY);
      ctx.textAlign = 'left';
      currentY += 24;
    }
  } else if (sale.notes) {
    ctx.fillText(`• ${sale.notes}`, cardX + 30, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(sale.totalAmount), cardX + cardW - 30, currentY);
    currentY += 24;
  } else {
    ctx.fillText('• Achat Comptoir', cardX + 30, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(sale.totalAmount), cardX + cardW - 30, currentY);
    currentY += 24;
  }

  // 7. Bloc Total en Grand
  const totalBoxY = currentY + 30;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cardX + 25, totalBoxY, cardW - 50, 95, 16);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('TOTAL À PAYER :', cardX + 45, totalBoxY + 38);

  let modeText = 'Espèces (Cash)';
  if (sale.paymentMethod === 'ORANGE_MONEY') modeText = 'Orange Money';
  if (sale.paymentMethod === 'MOOV_MONEY') modeText = 'Moov Money';
  if (sale.paymentMethod === 'WAVE') modeText = 'Wave';
  if (sale.paymentMethod === 'CREDIT') modeText = 'À Crédit';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Règlement : ${modeText}`, cardX + 45, totalBoxY + 68);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(formatCurrency(sale.totalAmount), cardX + cardW - 45, totalBoxY + 58);

  // 8. LE GRAND TAMPON OFFICIEL STYLISÉ
  const stampX = width / 2;
  const stampY = totalBoxY + 175;

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate(-8 * (Math.PI / 180)); // Rotation inclinée authentique

  if (sale.isCredit) {
    // Tampon Rouge : ACCORDÉ À CRÉDIT
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-150, -32, 300, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('ACCORDÉ À CRÉDIT', 0, 7);
  } else {
    // Tampon Vert : PAYÉ ENTIÈREMENT
    ctx.strokeStyle = '#059669';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-150, -32, 300, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('✓ PAYÉ ENTIÈREMENT', 0, 7);
  }
  ctx.restore();

  // 9. Pied de page & Coordonnées Mobile Money pour paiement
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText('Merci pour votre confiance et à très bientôt !', width / 2, height - 75);

  const mmInfo: string[] = [];
  if (shop?.orangeMoneyNumber) mmInfo.push(`OM: ${shop.orangeMoneyNumber}`);
  if (shop?.moovMoneyNumber) mmInfo.push(`Moov: ${shop.moovMoneyNumber}`);
  if (shop?.waveNumber) mmInfo.push(`Wave: ${shop.waveNumber}`);

  if (mmInfo.length > 0) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Paiements acceptés : ${mmInfo.join('  •  ')}`, width / 2, height - 52);
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
