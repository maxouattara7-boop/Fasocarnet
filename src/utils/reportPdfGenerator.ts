import { jsPDF } from 'jspdf';
import { DailySummary, Expense, Sale, ShopProfile } from '../types';
import { formatCurrency } from './formatters';
import { downloadOrSharePdfBlob } from './fileDownloader';
import { computeExpenseBreakdown, computePerformanceRatios, computeTopProducts } from './reportAnalytics';

interface ExportReportPdfParams {
  period: 'day' | 'month';
  periodLabel: string;
  periodKey: string;
  summary: DailySummary;
  sales: Sale[];
  expenses: Expense[];
  shopProfile: ShopProfile | null;
}

/**
 * Génère et télécharge/partage un Bilan Financier & Trésorerie complet au format PDF A4.
 */
export async function exportReportToPdf({
  period,
  periodLabel,
  periodKey,
  summary,
  sales,
  expenses,
  shopProfile,
}: ExportReportPdfParams): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Bandeau d'en-tête professionnel
  doc.setFillColor(6, 78, 59); // emerald-900
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((shopProfile?.name || 'FasoCarnet Commerce').toUpperCase(), margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const metaParts: string[] = [];
  if (shopProfile?.city || shopProfile?.address) {
    metaParts.push([shopProfile.address, shopProfile.city].filter(Boolean).join(', '));
  }
  if (shopProfile?.phone) metaParts.push(`Tél: ${shopProfile.phone}`);
  if (shopProfile?.ifu) metaParts.push(`IFU: ${shopProfile.ifu}`);
  if (shopProfile?.rccm) metaParts.push(`RCCM: ${shopProfile.rccm}`);
  if (metaParts.length > 0) {
    doc.text(metaParts.join('  •  '), margin, 21);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    `BILAN ${period === 'day' ? 'JOURNALIER' : 'MENSUEL'} — ${periodLabel.toUpperCase()}`,
    margin,
    29
  );

  y = 44;

  // Section 1 : Synthèse Financière (4 KPIs)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. SYNTHÈSE FINANCIÈRE & RENTABILITÉ', margin, y);
  y += 5;

  const kpis = [
    { label: "Chiffre d'Affaires Encaissé", value: formatCurrency(summary.totalSales || 0) },
    { label: 'Bénéfice Net Réel', value: formatCurrency(summary.netProfit || 0) },
    { label: 'Trésorerie Nette Réelle', value: formatCurrency(summary.netCashFlow || 0) },
    { label: "Dépenses d'Exploitation", value: formatCurrency(summary.totalExpenses || 0) },
  ];

  const boxW = (contentWidth - 6) / 2;
  kpis.forEach((kpi, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = margin + col * (boxW + 6);
    const by = y + row * 18;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, by, boxW, 15, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, bx + 4, by + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, bx + 4, by + 11.8);
  });

  y += 40;

  // Section 2 : Ratios de Performance
  const ratios = computePerformanceRatios(summary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. INDICATEURS CLÉS DE PERFORMANCE', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const ratioLines = [
    `• Nombre de ventes validées : ${summary.salesCount || 0}   |   Panier moyen : ${formatCurrency(ratios.averageBasket)}`,
    `• Marge brute : ${formatCurrency(summary.grossProfit || 0)} (${ratios.grossMarginRate}%)   |   Taux de marge nette : ${ratios.netMarginRate}%`,
    `• Coût d'achat marchandises : ${formatCurrency(summary.totalCostOfGoodsSold || 0)}   |   Ratio Dépenses/CA : ${ratios.expenseRatio}%`,
  ];
  ratioLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });

  y += 4;

  // Section 3 : Ventilation par Moyen de Paiement & Créances
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. ENCAISSEMENTS PAR CANAL & CRÉANCES', margin, y);
  y += 6;

  const channels = [
    ['Espèces (Cash)', formatCurrency(summary.cashSales || 0)],
    ['Orange Money', formatCurrency(summary.orangeMoneySales || 0)],
    ['Moov Money', formatCurrency(summary.moovMoneySales || 0)],
    ['Wave', formatCurrency(summary.waveSales || 0)],
    ['Crédits accordés sur la période', formatCurrency(summary.creditSales || 0)],
    ['Dettes clients récupérées', formatCurrency(summary.totalRecoveredDebts || 0)],
    ['Encours total restant à recouvrer', formatCurrency(summary.totalOutstandingDebt || 0)],
  ];

  doc.setFontSize(9);
  channels.forEach(([label, val], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, contentWidth, 6.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(label, margin + 2, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(val, pageWidth - margin - 2, y, { align: 'right' });
    y += 6.5;
  });

  y += 5;

  // Section 4 : Top Articles Vendus
  const topProducts = computeTopProducts(sales, 5);
  if (topProducts.length > 0 && y < 245) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. TOP ARTICLES VENDUS', margin, y);
    y += 6;

    doc.setFontSize(9);
    topProducts.forEach((prod, i) => {
      if (y > 270) return;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`${i + 1}. ${prod.name} (x${prod.quantity})`, margin + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(prod.revenue), pageWidth - margin - 2, y, { align: 'right' });
      y += 6;
    });
    y += 4;
  }

  // Section 5 : Principales Dépenses
  const topExpenses = computeExpenseBreakdown(expenses, 5);
  if (topExpenses.length > 0 && y < 255) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('5. PRINCIPALES DÉPENSES', margin, y);
    y += 6;

    doc.setFontSize(9);
    topExpenses.forEach((exp) => {
      if (y > 272) return;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${exp.label} (${exp.count}x — ${exp.percentage}%)`, margin + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(190, 18, 60);
      doc.text(`-${formatCurrency(exp.amount)}`, pageWidth - margin - 2, y, { align: 'right' });
      y += 6;
    });
  }

  // Pied de page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Document généré le ${new Date().toLocaleDateString('fr-FR')} par FasoCarnet`,
    margin,
    287
  );

  const blob = doc.output('blob');
  const fileName = `Bilan_FasoCarnet_${period}_${periodKey}.pdf`;
  await downloadOrSharePdfBlob({ fileName, blob, title: `Bilan ${periodLabel}` });
}
