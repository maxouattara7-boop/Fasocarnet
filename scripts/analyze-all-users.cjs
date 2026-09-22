const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ofbqqzmatttztbhtjban.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI';

const supabase = createClient(supabaseUrl, supabaseKey);

function getNetworkOperator(phone) {
  if (!phone) return 'Inconnu';
  const clean = phone.replace(/[^0-9]/g, '');
  const p8 = clean.slice(-8);
  const prefix2 = p8.slice(0, 2);

  const orangePrefixes = ['70', '74', '75', '76', '77', '54', '55', '56', '57', '04', '05', '06', '07'];
  const moovPrefixes = ['60', '61', '62', '63', '71', '72', '73', '51', '52', '53', '01', '02', '03'];
  const telecelPrefixes = ['68', '69', '78', '79', '64', '65', '66', '67', '58', '50'];

  if (orangePrefixes.includes(prefix2)) return `Orange Burkina (${prefix2})`;
  if (moovPrefixes.includes(prefix2)) return `Moov Africa Burkina (${prefix2})`;
  if (telecelPrefixes.includes(prefix2)) return `Telecel Faso (${prefix2})`;
  return `Autre / Non standard (${prefix2})`;
}

function parseDevice(userAgent) {
  if (!userAgent) return 'Inconnu';
  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android\s+([0-9\.]+);\s+([^;]+)\s+Build/);
    if (match) return `Android ${match[1]} (${match[2].trim()})`;
    return 'Android Mobile';
  }
  if (userAgent.includes('iPhone')) return 'iPhone iOS';
  if (userAgent.includes('Windows')) return 'Ordinateur Windows';
  if (userAgent.includes('Macintosh')) return 'Ordinateur Mac';
  if (userAgent.includes('Linux')) return 'Ordinateur Linux';
  return 'Navigateur Web';
}

async function analyzeAll() {
  const { data: shops, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur Supabase:', error);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`   ANALYSE DÉTAILLÉE DES ${shops.length} UTILISATEURS FASOCARNET   `);
  console.log(`======================================================\n`);

  const summary = {
    total: shops.length,
    byOperator: {},
    byPlatform: {},
    byCity: {},
    activeWithSales: 0,
    totalSalesCount: 0,
    totalTurnover: 0
  };

  shops.forEach((s, index) => {
    const backup = s.backup_data || {};
    const profile = backup.profile || {};
    const telemetry = s.telemetry || profile.telemetry || backup.telemetry || {};
    
    const name = s.name || profile.name || 'Sans Nom';
    const phone = s.phone || profile.phone || 'Non renseigné';
    const operator = getNetworkOperator(phone);
    const platform = telemetry.platform || (telemetry.userAgent?.includes('Android') ? 'android' : 'web');
    const device = parseDevice(telemetry.userAgent);
    const city = s.city || profile.city || telemetry.city || 'Non spécifié';
    const createdAt = s.created_at ? new Date(s.created_at).toLocaleString('fr-FR') : 'Inconnue';
    const lastActive = telemetry.lastActiveAt ? new Date(telemetry.lastActiveAt).toLocaleString('fr-FR') : (s.updated_at ? new Date(s.updated_at).toLocaleString('fr-FR') : 'Inconnue');

    const sales = backup.sales || [];
    const products = backup.products || [];
    const debts = backup.debts || [];
    const customers = backup.customers || [];
    const salesTotal = sales.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    if (sales.length > 0) {
      summary.activeWithSales++;
      summary.totalSalesCount += sales.length;
      summary.totalTurnover += salesTotal;
    }

    summary.byOperator[operator] = (summary.byOperator[operator] || 0) + 1;
    summary.byPlatform[platform] = (summary.byPlatform[platform] || 0) + 1;
    summary.byCity[city] = (summary.byCity[city] || 0) + 1;

    console.log(`------------------------------------------------------`);
    console.log(`UTILISATEUR #${index + 1} : ${name.toUpperCase()}`);
    console.log(`• Téléphone      : ${phone} [${operator}]`);
    console.log(`• Ville / Pays   : ${city}`);
    console.log(`• Appareil       : ${device} (Plateforme : ${platform})`);
    console.log(`• Date Création  : ${createdAt}`);
    console.log(`• Dernière Activité: ${lastActive}`);
    console.log(`• Données Caisse : ${sales.length} ventes (${salesTotal.toLocaleString('fr-FR')} FCFA) | ${products.length} articles | ${customers.length} clients`);
  });

  console.log(`\n======================================================`);
  console.log(`   SYNTHÈSE GLOBALE`);
  console.log(`======================================================`);
  console.log(`• Total Utilisateurs : ${summary.total}`);
  console.log(`• Répartition Opérateurs :`, summary.byOperator);
  console.log(`• Répartition Villes :`, summary.byCity);
  console.log(`• Répartition Plateformes :`, summary.byPlatform);
  console.log(`• Utilisateurs Actifs avec Ventes : ${summary.activeWithSales}`);
  console.log(`• Volume Total des Ventes Enregistrées : ${summary.totalTurnover.toLocaleString('fr-FR')} FCFA (${summary.totalSalesCount} transactions)`);
}

analyzeAll();
