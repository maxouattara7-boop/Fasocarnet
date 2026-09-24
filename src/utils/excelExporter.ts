import { DailySummary, Sale, DebtPayment, ShopProfile } from '../types';
import { formatDateTime } from './formatters';
import { downloadOrShareTextFile } from './fileDownloader';

/**
 * Exporte le bilan mensuel au format Excel / CSV universel avec encodage UTF-8 BOM
 * 100% hors-ligne, compatible Microsoft Excel, LibreOffice et visionneuses mobiles.
 */
export async function exportMonthlyReportToExcel(params: {
  monthString: string; // Ex: "2026-09"
  summary: DailySummary | null;
  sales: Sale[];
  debtPayments: DebtPayment[];
  shopProfile?: ShopProfile | null;
}): Promise<void> {
  const { monthString, summary, sales, debtPayments, shopProfile } = params;

  // Formatage du mois en texte français lisible (ex: Septembre 2026)
  let monthLabel = monthString;
  try {
    const [y, m] = monthString.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    monthLabel = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } catch {
    monthLabel = monthString;
  }

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];

  // =========================================================================
  // 1. EN-TÊTE DE L'ENTREPRISE & INFORMATIONS COMPTABLES
  // =========================================================================
  rows.push([escapeCsv('RAPPORT COMPTABLE MENSUEL FASOCARNET')].join(';'));
  rows.push([escapeCsv('Période :'), escapeCsv(monthLabel.toUpperCase())].join(';'));
  rows.push([escapeCsv('Date d\'exportation :'), escapeCsv(formatDateTime(new Date().toISOString()))].join(';'));
  rows.push([escapeCsv('Nom du Commerce :'), escapeCsv(shopProfile?.name || 'FasoCarnet Commerce')].join(';'));
  rows.push([escapeCsv('Téléphone Caisse :'), escapeCsv(shopProfile?.phone || '-')].join(';'));
  rows.push([escapeCsv('Ville / Localité :'), escapeCsv(shopProfile?.city || '-')].join(';'));
  if (shopProfile?.ifu) {
    rows.push([escapeCsv('Numéro IFU :'), escapeCsv(shopProfile.ifu)].join(';'));
  }
  if (shopProfile?.rccm) {
    rows.push([escapeCsv('Numéro RCCM :'), escapeCsv(shopProfile.rccm)].join(';'));
  }
  rows.push(''); // Ligne vide

  // =========================================================================
  // 2. SYNTHÈSE DES ENCAISSEMENTS & CRÉANCES DU MOIS
  // =========================================================================
  rows.push([escapeCsv('=== SYNTHÈSE FINANCIÈRE DU MOIS ===')].join(';'));
  rows.push([escapeCsv('Indicateur Comptable'), escapeCsv('Montant (FCFA)'), escapeCsv('Détail / Commentaire')].join(';'));
  
  rows.push([
    escapeCsv('Chiffre d\'Affaires Net Encaissé'),
    escapeCsv(summary?.totalSales || 0),
    escapeCsv('Total encaissé via Cash et Mobile Money')
  ].join(';'));

  rows.push([
    escapeCsv('Total Espèces (Cash)'),
    escapeCsv(summary?.cashSales || 0),
    escapeCsv('Paiements en liquide')
  ].join(';'));

  rows.push([
    escapeCsv('Total Orange Money'),
    escapeCsv(summary?.orangeMoneySales || 0),
    escapeCsv('Paiements OM')
  ].join(';'));

  rows.push([
    escapeCsv('Total Moov Money'),
    escapeCsv(summary?.moovMoneySales || 0),
    escapeCsv('Paiements Moov')
  ].join(';'));

  rows.push([
    escapeCsv('Total Wave'),
    escapeCsv(summary?.waveSales || 0),
    escapeCsv('Paiements Wave')
  ].join(';'));

  rows.push([
    escapeCsv('Ventes à Crédit (Dettes émises)'),
    escapeCsv(summary?.creditSales || 0),
    escapeCsv('Marchandises sorties sans encaissement immédiat')
  ].join(';'));

  rows.push([
    escapeCsv('Dettes Recouvrées (Acomptes reçus)'),
    escapeCsv(summary?.totalRecoveredDebts || 0),
    escapeCsv('Argent récupéré sur d\'anciennes dettes ce mois-ci')
  ].join(';'));

  rows.push([
    escapeCsv('Nombre Total de Ventes'),
    escapeCsv(summary?.salesCount || 0),
    escapeCsv('Volume de transactions enregistrées')
  ].join(';'));

  rows.push(''); // Ligne vide
  rows.push(''); // Ligne vide

  // =========================================================================
  // 3. TABLEAU DÉTAILLÉ DE TOUTES LES VENTES DU MOIS
  // =========================================================================
  rows.push([escapeCsv('=== JOURNAL DÉTAILLÉ DES VENTES ===')].join(';'));
  rows.push([
    escapeCsv('Date & Heure'),
    escapeCsv('Réf. Vente'),
    escapeCsv('Articles / Fournitures vendus'),
    escapeCsv('Mode de Paiement'),
    escapeCsv('Type de Vente'),
    escapeCsv('Montant Total (FCFA)'),
    escapeCsv('Nom Client'),
    escapeCsv('Téléphone Client')
  ].join(';'));

  for (const s of sales) {
    let articlesStr = '';
    if (s.items && s.items.length > 0) {
      articlesStr = s.items.map(it => `${it.description} (x${it.quantity || 1})`).join(', ');
    } else if (s.notes) {
      articlesStr = s.notes;
    } else {
      articlesStr = 'Vente directe caisse';
    }

    rows.push([
      escapeCsv(formatDateTime(s.createdAt)),
      escapeCsv(`#${s.id.slice(-8).toUpperCase()}`),
      escapeCsv(articlesStr),
      escapeCsv(s.paymentMethod),
      escapeCsv(s.isCredit ? 'CRÉDIT / DETTE' : 'COMPTANT'),
      escapeCsv(s.totalAmount),
      escapeCsv(s.customerName || '-'),
      escapeCsv(s.customerPhone || '-')
    ].join(';'));
  }

  rows.push(''); // Ligne vide
  rows.push(''); // Ligne vide

  // =========================================================================
  // 4. TABLEAU DES ENCAISSEMENTS ET RÈGLEMENTS DE DETTES
  // =========================================================================
  rows.push([escapeCsv('=== JOURNAL DES RÈGLEMENTS ET RECOUVREMENTS DE DETTES ===')].join(';'));
  rows.push([
    escapeCsv('Date & Heure'),
    escapeCsv('Réf. Règlement'),
    escapeCsv('ID Dette'),
    escapeCsv('Mode d\'Encaissement'),
    escapeCsv('Montant Versé (FCFA)'),
    escapeCsv('Remarques / Notes')
  ].join(';'));

  for (const p of debtPayments) {
    rows.push([
      escapeCsv(formatDateTime(p.createdAt)),
      escapeCsv(`#${p.id.slice(-8).toUpperCase()}`),
      escapeCsv(p.debtId),
      escapeCsv(p.paymentMethod),
      escapeCsv(p.amount),
      escapeCsv(p.notes || '-')
    ].join(';'));
  }

  // =========================================================================
  // 5. GÉNÉRATION DU FICHIER ET DÉCLENCHEMENT DU TÉLÉCHARGEMENT
  // =========================================================================
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const safeShopName = (shopProfile?.name || 'commerce').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `bilan_mensuel_${safeShopName}_${monthString}.csv`;

  await downloadOrShareTextFile({
    fileName,
    content: csvContent,
    mimeType: 'text/csv;charset=utf-8;',
    title: `Bilan Mensuel ${monthLabel} - ${shopProfile?.name || 'FasoCarnet'}`
  });
}
