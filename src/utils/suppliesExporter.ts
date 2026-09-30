import { StockSupply, ShopProfile } from '../types';
import { formatCurrency, formatDateTime } from './formatters';
import { downloadOrShareTextFile, FileActionResult } from './fileDownloader';

/**
 * Exporte le journal d'approvisionnement au format Excel / CSV avec encodage UTF-8 BOM
 */
export async function exportSuppliesToExcel(params: {
  supplies: StockSupply[];
  dateString?: string;
  shopProfile?: ShopProfile | null;
}): Promise<{ result: FileActionResult; csvContent: string; fileName: string }> {
  const { supplies, dateString, shopProfile } = params;

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];

  // 1. EN-TÊTE DU BORDEREAU D'APPROVISIONNEMENT
  rows.push([escapeCsv('BORDEREAU D\'APPROVISIONNEMENT & ENTRÉES DE STOCK - FASOCARNET')].join(';'));
  rows.push([escapeCsv('Commerce :'), escapeCsv(shopProfile?.name || 'FasoCarnet Commerce')].join(';'));
  rows.push([escapeCsv('Période / Date :'), escapeCsv(dateString || 'Tous les approvisionnements')].join(';'));
  rows.push([escapeCsv('Date d\'export :'), escapeCsv(formatDateTime(new Date().toISOString()))].join(';'));
  if (shopProfile?.phone) {
    rows.push([escapeCsv('Téléphone :'), escapeCsv(shopProfile.phone)].join(';'));
  }
  rows.push('');

  // 2. SYNTHÈSE GLOBALE
  const totalQty = supplies.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const totalCost = supplies.reduce((acc, s) => acc + (s.totalCost || 0), 0);

  rows.push([escapeCsv('=== SYNTHÈSE DE L\'ARRIVAGE ===')].join(';'));
  rows.push([escapeCsv('Nombre de lignes d\'arrivage :'), escapeCsv(supplies.length)].join(';'));
  rows.push([escapeCsv('Quantité totale d\'articles reçus :'), escapeCsv(totalQty)].join(';'));
  rows.push([escapeCsv('Coût total d\'investissement :'), escapeCsv(`${formatCurrency(totalCost)}`)].join(';'));
  rows.push('');

  // 3. TABLEAU DÉTAILLÉ LIGNE PAR LIGNE
  rows.push([escapeCsv('=== DÉTAIL DES ARTICLES APPROVISIONNÉS ===')].join(';'));
  rows.push([
    escapeCsv('Date & Heure'),
    escapeCsv('Désignation de l\'Article'),
    escapeCsv('Quantité Ajoutée'),
    escapeCsv('Prix d\'Achat Unitaire (FCFA)'),
    escapeCsv('Prix de Vente Unitaire (FCFA)'),
    escapeCsv('Coût Total Ligne (FCFA)'),
    escapeCsv('Fournisseur'),
    escapeCsv('Notes / N° Facture')
  ].join(';'));

  supplies.forEach((s) => {
    rows.push([
      escapeCsv(formatDateTime(s.createdAt)),
      escapeCsv(s.productName),
      escapeCsv(s.quantity),
      escapeCsv(s.costPrice),
      escapeCsv(s.sellingPrice || '-'),
      escapeCsv(s.totalCost),
      escapeCsv(s.supplierName || 'Non spécifié'),
      escapeCsv(s.notes || '-')
    ].join(';'));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const dateSlug = (dateString || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Approvisionnement_FasoCarnet_${dateSlug}.csv`;

  const result = await downloadOrShareTextFile({
    fileName,
    content: csvContent,
    mimeType: 'text/csv;charset=utf-8;',
    title: `Bordereau d'Approvisionnement - ${shopProfile?.name || 'FasoCarnet'}`
  });

  return { result, csvContent, fileName };
}

/**
 * Imprime un Bordereau de Réception / Approvisionnement
 */
export function printSuppliesReport(params: {
  supplies: StockSupply[];
  dateString?: string;
  shopProfile?: ShopProfile | null;
}): void {
  const { supplies, dateString, shopProfile } = params;
  if (typeof window === 'undefined') return;

  const totalQty = supplies.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const totalCost = supplies.reduce((acc, s) => acc + (s.totalCost || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rowsHtml = supplies.map(s => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${formatDateTime(s.createdAt)}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 11px;">${s.productName}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857; font-size: 11px;">+${s.quantity}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">${formatCurrency(s.costPrice)}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 11px;">${formatCurrency(s.totalCost)}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">${s.supplierName || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Bordereau d'Approvisionnement - ${shopProfile?.name || 'FasoCarnet'}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #0f172a; }
          .header { border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 900; color: #047857; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .kpi-box { display: flex; gap: 12px; margin-bottom: 16px; }
          .kpi { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; }
          .kpi-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .kpi-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">BORDEREAU D'APPROVISIONNEMENT</h1>
            <div class="subtitle">Établissement : <strong>${shopProfile?.name || 'FasoCarnet Commerce'}</strong> • Tél : ${shopProfile?.phone || '-'}</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div>Date : <strong>${dateString || new Date().toLocaleDateString('fr-FR')}</strong></div>
            <div style="color: #64748b; font-size: 10px;">FasoCarnet Stock v1.5</div>
          </div>
        </div>

        <div class="kpi-box">
          <div class="kpi">
            <div class="kpi-title">Articles Distincts</div>
            <div class="kpi-val">${supplies.length}</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Quantité Totale Reçue</div>
            <div class="kpi-val">+${totalQty} unités</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Coût Total Investi</div>
            <div class="kpi-val" style="color: #047857;">${formatCurrency(totalCost)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date / Heure</th>
              <th>Article</th>
              <th style="text-align: center;">Quantité</th>
              <th style="text-align: right;">Prix Achat Unit.</th>
              <th style="text-align: right;">Total Ligne</th>
              <th>Fournisseur</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Visa du Réceptionnaire / Responsable Stock : _______________________</div>
          <div>Signature Fournisseur : _______________________</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
