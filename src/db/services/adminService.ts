import { db } from '../db';
import { 
  ShopProfile, 
  LicenseKey, 
  ExtendedAdminAnalytics, 
  AdminBroadcastMessage, 
  DeviceTelemetry, 
  AdminDepositNumbers,
  CommercialAffiliateReport,
  AffiliateSettlement,
  CommercialTeam,
  CommercialTeamReport,
  CommercialAgent,
  TeamLeaderAccount,
  TeamLeaderDashboardData
} from '../../types';
import { subscriptionService, SUBSCRIPTION_PLANS, DEFAULT_DEPOSIT_NUMBERS } from './subscriptionService';
import { syncService } from './syncService';
import { detectBurkinaOperator, detectPlatform } from '../../utils/telemetry';
import { verifyHash, hashPassword, isHashed, generateSignedLicenseKey } from '../../utils/crypto';

export interface AdminStats {
  totalShops: number;
  activeShops: number;
  trialShops: number;
  expiredShops: number;
  totalLicensesGenerated: number;
  totalLicensesUsed: number;
  estimatedMonthlyRevenue: number;
}

export interface ShopAdminDetails extends ShopProfile {
  salesCount: number;
  totalSalesVolume: number;
  customersCount: number;
  totalDebtsAmount: number;
  daysRemaining: number;
  statusLabel: string;
  statusType: 'trial' | 'active' | 'grace' | 'expired';
  formattedExpiresAt: string;
}

export const ADMIN_PHONE_NUMBER = '65616134';
export const DEFAULT_ADMIN_PIN = '656126';

export const adminService = {
  /**
   * Vérifie si les identifiants saisis correspondent au compte Super-Admin
   */
  isAdminCredentials(phone: string, pin: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '').slice(-8);
    return cleanPhone === ADMIN_PHONE_NUMBER && this.verifyPassword(pin);
  },

  /**
   * Verifie le mot de passe Super-Admin (supporte le hash SHA-256 et l'ancien clair avec auto-migration)
   */
  verifyPassword(password: string): boolean {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fasocarnet_admin_password') || DEFAULT_ADMIN_PIN : DEFAULT_ADMIN_PIN;
    const isValid = verifyHash(password, saved);
    if (isValid && !isHashed(saved) && typeof window !== 'undefined') {
      try {
        localStorage.setItem('fasocarnet_admin_password', hashPassword(password));
      } catch {}
    }
    return isValid;
  },

  /**
   * Modifie le mot de passe Super-Admin avec hachage SHA-256 et sel cryptographique
   */
  setPassword(newPassword: string): void {
    if (!newPassword.trim()) throw new Error('Le mot de passe ne peut pas être vide.');
    const hashed = hashPassword(newPassword.trim());
    localStorage.setItem('fasocarnet_admin_password', hashed);
  },

  /**
   * Vérifie si un profil correspond à une vraie boutique commerçante (et non à un compte/conteneur Admin)
   */
  isMerchantShop(profile?: ShopProfile | null): boolean {
    if (!profile || !profile.id) return false;
    const id = profile.id.toLowerCase();
    const name = (profile.name || '').toLowerCase();
    if (id === 'default_shop' || id === '_admin_vault' || id.startsWith('_admin') || id === 'admin') {
      return false;
    }
    if (name === 'admin master' || name === 'administrateur' || name === 'fasocarnet admin') {
      return false;
    }
    return true;
  },

  /**
   * Recupere les statistiques globales pour le tableau de bord Admin
   */
  async getAdminStats(): Promise<AdminStats> {
    const cloudDb = await syncService.fetchRemoteDatabase();
    const cloudShops = Object.values(cloudDb)
      .map(d => d.profile)
      .filter(p => this.isMerchantShop(p));
    const localShops = (await db.shopProfiles.toArray())
      .filter(p => this.isMerchantShop(p));

    // Combiner et dédupliquer les boutiques
    const shopsMap = new Map<string, ShopProfile>();
    cloudShops.forEach(s => s && shopsMap.set(s.id, s));
    localShops.forEach(s => s && shopsMap.set(s.id, s));
    const shops = Array.from(shopsMap.values());

    const licenses = await this.getAllLicenses();

    let activeShops = 0;
    let trialShops = 0;
    let expiredShops = 0;
    let estimatedMonthlyRevenue = 0;

    for (const s of shops) {
      const info = subscriptionService.getSubscriptionInfo(s);
      if (info.status === 'active') {
        activeShops++;
        estimatedMonthlyRevenue += 2000;
      } else if (info.status === 'trial') {
        trialShops++;
      } else {
        expiredShops++;
      }
    }

    const usedLicenses = licenses.filter(l => l.isUsed).length;

    return {
      totalShops: shops.length,
      activeShops,
      trialShops,
      expiredShops,
      totalLicensesGenerated: licenses.length,
      totalLicensesUsed: usedLicenses,
      estimatedMonthlyRevenue
    };
  },

  /**
   * Recupere toutes les boutiques avec metriques d'activite et statut d'abonnement
   */
  async getAllShopsWithDetails(): Promise<ShopAdminDetails[]> {
    const cloudDb = await syncService.fetchRemoteDatabase();
    const localShops = (await db.shopProfiles.toArray()).filter(p => this.isMerchantShop(p));
    const localSales = await db.sales.toArray();
    const localCustomers = await db.customers.toArray();

    const allShopsMap = new Map<string, { profile: ShopProfile; salesCount: number; salesVolume: number; customersCount: number; debtsAmount: number }>();

    // 1. Ajouter depuis le Cloud
    Object.values(cloudDb).forEach(data => {
      if (data && data.profile && this.isMerchantShop(data.profile)) {
        const salesVolume = (data.sales || []).reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        const debtsAmount = (data.customers || []).reduce((acc, c) => acc + (c.totalDebt || 0), 0);
        allShopsMap.set(data.profile.id, {
          profile: data.profile,
          salesCount: (data.sales || []).length,
          salesVolume,
          customersCount: (data.customers || []).length,
          debtsAmount
        });
      }
    });

    // 2. Ajouter depuis le local si manquant
    localShops.forEach(shop => {
      if (!allShopsMap.has(shop.id)) {
        const shopSales = localSales.filter(s => (s as any).shopId === shop.id);
        const totalSalesVolume = shopSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const shopCustomers = localCustomers.filter(c => (c as any).shopId === shop.id);
        const totalDebtsAmount = shopCustomers.reduce((acc, c) => acc + c.totalDebt, 0);

        allShopsMap.set(shop.id, {
          profile: shop,
          salesCount: shopSales.length,
          salesVolume: totalSalesVolume,
          customersCount: shopCustomers.length,
          debtsAmount: totalDebtsAmount
        });
      }
    });

    return Array.from(allShopsMap.values()).map(({ profile, salesCount, salesVolume, customersCount, debtsAmount }) => {
      const info = subscriptionService.getSubscriptionInfo(profile);
      return {
        ...profile,
        salesCount,
        totalSalesVolume: salesVolume,
        customersCount,
        totalDebtsAmount: debtsAmount,
        daysRemaining: info.daysRemaining,
        statusLabel: info.statusLabel,
        statusType: info.status,
        formattedExpiresAt: info.formattedExpiresAt
      };
    });
  },

  /**
   * Active manuellement l'abonnement d'une boutique (Action Admin en cas de souci technique ou validation directe)
   */
  async activateShopManually(shopId: string, durationMonths: number = 1, _notes?: string): Promise<ShopProfile> {
    return this.extendShopLicense(shopId, durationMonths, _notes);
  },

  /**
   * Prolonge manuellement la licence d'une boutique (Action Admin)
   */
  async extendShopLicense(shopId: string, durationMonths: number, _notes?: string): Promise<ShopProfile> {
    const cloudDb = await syncService.fetchRemoteDatabase();
    let shop = await db.shopProfiles.get(shopId);

    if (!shop && cloudDb[shopId]) {
      shop = cloudDb[shopId].profile;
    }

    if (!shop) throw new Error('Boutique introuvable');

    const currentExpiry = shop.subscriptionExpiresAt ? new Date(shop.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

    let planId: 'monthly' | 'semi-annual' | 'annual' = 'monthly';
    if (durationMonths >= 12) planId = 'annual';
    else if (durationMonths >= 6) planId = 'semi-annual';

    const updated: ShopProfile = {
      ...shop,
      subscriptionPlan: planId,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: newExpiry.toISOString(),
      isSuspended: false,
      updatedAt: new Date().toISOString()
    };

    // Mettre à jour en local dans IndexedDB
    await db.shopProfiles.put(updated);

    // Mettre à jour sur le Cloud
    if (!cloudDb[shopId]) {
      cloudDb[shopId] = {
        profile: updated,
        sales: [],
        customers: [],
        products: [],
        debts: [],
        debtPayments: [],
        licenses: [],
        lastUpdatedAt: new Date().toISOString()
      };
    } else {
      cloudDb[shopId].profile = updated;
      cloudDb[shopId].lastUpdatedAt = new Date().toISOString();
    }
    await syncService.pushRemoteDatabase(cloudDb);

    return updated;
  },

  /**
   * Supprime définitivement une boutique (Action Admin)
   */
  async deleteShop(shopId: string): Promise<void> {
    await db.shopProfiles.delete(shopId);

    // Supprimer également les données locales liées si présentes
    const [sales, customers, products, debts] = await Promise.all([
      db.sales.toArray(),
      db.customers.toArray(),
      db.products.toArray(),
      db.debts.toArray()
    ]);

    const salesToDelete = sales.filter((s: any) => s.shopId === shopId).map(s => s.id);
    const customersToDelete = customers.filter((c: any) => c.shopId === shopId).map(c => c.id);
    const productsToDelete = products.filter((p: any) => p.shopId === shopId).map(p => p.id);
    const debtsToDelete = debts.filter((d: any) => d.shopId === shopId).map(d => d.id);

    if (salesToDelete.length) await db.sales.bulkDelete(salesToDelete);
    if (customersToDelete.length) await db.customers.bulkDelete(customersToDelete);
    if (productsToDelete.length) await db.products.bulkDelete(productsToDelete);
    if (debtsToDelete.length) await db.debts.bulkDelete(debtsToDelete);

    // Supprimer définitivement du serveur Cloud, de Supabase et du cache local
    await syncService.deleteRemoteShop(shopId);
  },

  /**
   * Recupere toutes les clés de licence
   */
  async getAllLicenses(): Promise<LicenseKey[]> {
    const localLicenses = await db.licenses.toArray();
    const cloudDb = await syncService.fetchRemoteDatabase();
    const cloudLicenses: LicenseKey[] = [];
    Object.values(cloudDb).forEach(d => {
      if (d.licenses?.length) cloudLicenses.push(...d.licenses);
    });

    const map = new Map<string, LicenseKey>();
    // 1. Ajouter d'abord les locales
    localLicenses.forEach(l => map.set(l.id, l));

    // 2. Fusionner avec le Cloud en préservant le statut utilisé le cas échéant
    cloudLicenses.forEach(l => {
      const existing = map.get(l.id);
      if (!existing) {
        map.set(l.id, l);
      } else {
        map.set(l.id, {
          ...existing,
          ...l,
          isUsed: existing.isUsed || l.isUsed,
          usedByShopId: l.usedByShopId || existing.usedByShopId,
          usedByShopName: l.usedByShopName || existing.usedByShopName,
          usedAt: l.usedAt || existing.usedAt
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Genere de nouvelles clés de licence prépayées (Action Admin)
   */
  async generateLicenseKeys(
    plan: 'monthly' | 'semi-annual' | 'annual',
    count: number = 1,
    notes?: string
  ): Promise<LicenseKey[]> {
    const config = SUBSCRIPTION_PLANS.find(p => p.id === plan);
    const durationDays = config ? config.durationMonths * 30 : 30;
    const price = config ? config.price : 2000;
    const generated: LicenseKey[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateSignedLicenseKey(plan);
      const key: LicenseKey = {
        id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        code,
        plan,
        durationDays,
        price,
        isUsed: false,
        notes: notes?.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      generated.push(key);
    }

    await db.licenses.bulkPut(generated);

    // Sync cloud database with new licenses in the admin vault
    const cloudDb = await syncService.fetchRemoteDatabase();
    const adminVaultKey = '_admin_vault';
    if (!cloudDb[adminVaultKey]) {
      cloudDb[adminVaultKey] = {
        profile: undefined as any,
        sales: [],
        customers: [],
        products: [],
        debts: [],
        debtPayments: [],
        licenses: [],
        lastUpdatedAt: new Date().toISOString()
      };
    }
    if (!cloudDb[adminVaultKey].licenses) cloudDb[adminVaultKey].licenses = [];
    cloudDb[adminVaultKey].licenses.push(...generated);
    cloudDb[adminVaultKey].lastUpdatedAt = new Date().toISOString();
    await syncService.pushRemoteDatabase(cloudDb);

    return generated;
  },

  /**
   * Supprime définitivement une clé de licence (Local + Cloud)
   */
  async deleteLicense(licenseId: string): Promise<void> {
    // 1. Supprimer de IndexedDB locale
    await db.licenses.delete(licenseId);

    // 2. Supprimer de la base partagée réseau / Cloud
    const cloudDb = await syncService.fetchRemoteDatabase();
    let isChanged = false;

    for (const sKey of Object.keys(cloudDb)) {
      if (cloudDb[sKey]?.licenses && cloudDb[sKey].licenses.length > 0) {
        const initialLen = cloudDb[sKey].licenses.length;
        cloudDb[sKey].licenses = cloudDb[sKey].licenses.filter(l => l.id !== licenseId && l.code !== licenseId);
        if (cloudDb[sKey].licenses.length !== initialLen) {
          cloudDb[sKey].lastUpdatedAt = new Date().toISOString();
          isChanged = true;
        }
      }
    }

    if (isChanged) {
      await syncService.pushRemoteDatabase(cloudDb);
    }
  },

  /**
   * Génère un lien WhatsApp pour envoyer une clé prépayée à un commerçant
   */
  getWhatsAppDispatchUrl(key: LicenseKey, clientPhone?: string): string {
    const planConfig = SUBSCRIPTION_PLANS.find(p => p.id === key.plan);
    const planLabel = planConfig ? planConfig.name : key.plan;
    const text = `🌟 *Votre Clé de Licence FasoCarnet* 🌟\n\n` +
      `Bonjour ! Voici votre clé d'activation pour le forfait *${planLabel}* :\n\n` +
      `🔑 *CODE DE LICENCE* :\n👉 \`${key.code}\` 👈\n\n` +
      `*Comment l'activer ?*\n` +
      `1. Ouvrez FasoCarnet sur votre téléphone\n` +
      `2. Allez dans *Paramètres ⚙️* > *Licence*\n` +
      `3. Collez ce code et validez.\n\n` +
      `Merci de votre confiance ! 🇧🇫`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
    return cleanPhone ? `https://wa.me/226${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  },

  /**
   * Génère un lien WhatsApp pour relancer un commerçant dont la licence expire
   */
  getWhatsAppReminderUrl(shop: ShopAdminDetails): string {
    const text = `🔔 *Rappel Abonnement FasoCarnet* 🇧🇫\n\n` +
      `Bonjour ${shop.ownerName ? shop.ownerName : 'gérant de ' + shop.name},\n\n` +
      `Votre licence FasoCarnet pour *${shop.name}* arrive à expiration (*${shop.formattedExpiresAt}*).\n\n` +
      `Pour continuer à gérer vos ventes et relances clients sans interruption, vous pouvez renouveler dès maintenant via Orange Money ou Moov Money (2 000 F / mois).\n\n` +
      `Besoin d'aide ? Répondez directement à ce message.`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = shop.phone.replace(/\D/g, '');
    return `https://wa.me/226${cleanPhone}?text=${encoded}`;
  },

  /**
   * Récupère l'ensemble des métriques d'analytics avancées (Installations, Provenance, Volume Réseau)
   */
  async getExtendedAnalytics(): Promise<ExtendedAdminAnalytics> {
    const cloudDb = await syncService.fetchRemoteDatabase();
    const shopsDetails = await this.getAllShopsWithDetails();

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let activeToday = 0;
    let activeWeek = 0;
    let totalSalesVolume = 0;
    let totalDebtsVolume = 0;
    let totalSalesCount = 0;
    let totalCustomersCount = 0;

    const platformStats = {
      android: 0,
      ios: 0,
      webMobile: 0,
      desktop: 0
    };

    const operatorStats = {
      orange: 0,
      moov: 0,
      telecel: 0,
      other: 0
    };

    const cityMap = new Map<string, number>();
    const uniqueDevices = new Set<string>();

    // 1. Analyser chaque boutique cliente
    for (const shop of shopsDetails) {
      totalSalesVolume += shop.totalSalesVolume || 0;
      totalDebtsVolume += shop.totalDebtsAmount || 0;
      totalSalesCount += shop.salesCount || 0;
      totalCustomersCount += shop.customersCount || 0;

      // Récupérer la télémétrie si disponible
      const cloudData = cloudDb[shop.id];
      const telemetry: DeviceTelemetry | undefined = shop.telemetry || cloudData?.telemetry;

      const deviceId = telemetry?.deviceId || `dev_${shop.id}`;
      uniqueDevices.add(deviceId);

      const lastActiveTime = telemetry?.lastActiveAt
        ? new Date(telemetry.lastActiveAt).getTime()
        : new Date(shop.updatedAt || shop.createdAt).getTime();

      if (lastActiveTime >= oneDayAgo) activeToday++;
      if (lastActiveTime >= sevenDaysAgo) activeWeek++;

      // Détection de la plateforme
      const platform = telemetry?.platform || detectPlatform();
      if (platform === 'android') platformStats.android++;
      else if (platform === 'ios') platformStats.ios++;
      else if (platform === 'web_mobile') platformStats.webMobile++;
      else platformStats.desktop++;

      // Détection de l'opérateur
      const operator = telemetry?.operator || detectBurkinaOperator(shop.phone);
      if (operator === 'ORANGE') operatorStats.orange++;
      else if (operator === 'MOOV') operatorStats.moov++;
      else if (operator === 'TELECEL') operatorStats.telecel++;
      else operatorStats.other++;

      // Ville
      const city = (shop.city || telemetry?.city || 'Non renseigné').trim();
      const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
      cityMap.set(normalizedCity, (cityMap.get(normalizedCity) || 0) + 1);
    }

    const cityStats = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalInstalls: Math.max(uniqueDevices.size, shopsDetails.length),
      activeInstallsToday: activeToday,
      activeInstallsThisWeek: activeWeek,
      totalNetworkSalesVolume: totalSalesVolume,
      totalNetworkDebtsVolume: totalDebtsVolume,
      totalNetworkSalesCount: totalSalesCount,
      totalNetworkCustomersCount: totalCustomersCount,
      platformStats,
      operatorStats,
      cityStats
    };
  },

  /**
   * Rétablit et débloque toutes les boutiques éventuellement suspendues (Local + Cloud)
   */
  async restoreAllSuspendedShops(): Promise<number> {
    let count = 0;

    // 1. Débloquer en local dans IndexedDB
    const localShops = await db.shopProfiles.toArray();
    for (const shop of localShops) {
      if (shop.isSuspended || shop.suspendedReason) {
        shop.isSuspended = false;
        delete shop.suspendedReason;
        shop.updatedAt = new Date().toISOString();
        await db.shopProfiles.put(shop);
        count++;
      }
    }

    // 2. Débloquer dans la base partagée réseau / Cloud
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      let cloudModified = false;
      for (const key of Object.keys(cloudDb)) {
        const data = cloudDb[key];
        if (data?.profile && (data.profile.isSuspended || data.profile.suspendedReason)) {
          data.profile.isSuspended = false;
          delete data.profile.suspendedReason;
          data.lastUpdatedAt = new Date().toISOString();
          cloudModified = true;
          count++;
        }
      }
      if (cloudModified) {
        await syncService.pushRemoteDatabase(cloudDb);
      }
    } catch (err) {
      console.warn('Erreur synchronisation cloud pour réactiver les boutiques:', err);
    }

    return count;
  },

  /**
   * Exporte toutes les données des boutiques et métriques en format CSV
   */
  async exportShopsCsv(): Promise<string> {
    const shops = await this.getAllShopsWithDetails();
    const headers = [
      'ID Boutique',
      'Nom de la Boutique',
      'Téléphone',
      'Propriétaire',
      'WhatsApp Propriétaire',
      'Ville',
      'Statut Abonnement',
      'Jours Restants',
      'Date Expiration',
      'Nombre de Ventes',
      'Chiffre d\'Affaires Total (FCFA)',
      'Nombre de Clients',
      'Dettes en cours (FCFA)',
      'Date Création'
    ];

    const rows = shops.map(s => [
      s.id,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.phone,
      `"${(s.ownerName || '').replace(/"/g, '""')}"`,
      s.ownerPhone || '',
      `"${(s.city || '').replace(/"/g, '""')}"`,
      s.statusLabel,
      s.daysRemaining,
      s.formattedExpiresAt,
      s.salesCount,
      s.totalSalesVolume,
      s.customersCount,
      s.totalDebtsAmount,
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-FR') : ''
    ]);

    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  },

  /**
   * Génère un fichier de contacts vCard (.vcf) compatible avec tous les smartphones (Android / iOS / WhatsApp)
   */
  generateVCard(shops: ShopAdminDetails[]): string {
    let vcf = '';
    shops.forEach(s => {
      const cleanPhone = s.phone.replace(/\D/g, '');
      const intPhone = cleanPhone.startsWith('226') ? `+${cleanPhone}` : `+226${cleanPhone}`;
      const shopName = s.name.replace(/[,;:]/g, ' ');
      const ownerName = s.ownerName ? ` (${s.ownerName})` : '';

      vcf += 'BEGIN:VCARD\r\n';
      vcf += 'VERSION:3.0\r\n';
      vcf += `FN:FasoCarnet - ${shopName}${ownerName}\r\n`;
      vcf += `ORG:FasoCarnet Commerçants;${shopName}\r\n`;
      vcf += `TEL;TYPE=CELL,VOICE:${intPhone}\r\n`;
      if (s.ownerPhone) {
        const cleanOwner = s.ownerPhone.replace(/\D/g, '');
        const intOwner = cleanOwner.startsWith('226') ? `+${cleanOwner}` : `+226${cleanOwner}`;
        vcf += `TEL;TYPE=WORK,VOICE:${intOwner}\r\n`;
      }
      if (s.city) {
        vcf += `ADR;TYPE=WORK:;;${s.city};Burkina Faso;;;\r\n`;
      }
      vcf += `NOTE:Statut: ${s.statusLabel} | Échéance: ${s.formattedExpiresAt}\r\n`;
      vcf += 'END:VCARD\r\n';
    });
    return vcf;
  },

  /**
   * Génère un lien direct WhatsApp pour un message personnalisé avec variables
   */
  getCustomWhatsAppUrl(phone: string, template: string, shop: ShopAdminDetails): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('226') ? cleanPhone : `226${cleanPhone}`;

    const msg = template
      .replace(/{nom_boutique}/g, shop.name || 'Commerçant')
      .replace(/{telephone}/g, shop.phone || '')
      .replace(/{proprietaire}/g, shop.ownerName || shop.name || '')
      .replace(/{statut}/g, shop.statusLabel || '')
      .replace(/{jours_restants}/g, String(shop.daysRemaining >= 0 ? shop.daysRemaining : 0))
      .replace(/{date_fin}/g, shop.formattedExpiresAt || '')
      .replace(/{ville}/g, shop.city || 'Burkina Faso');

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
  },

  /**
   * Récupère le message broadcast actif
   */
  async getBroadcastMessage(): Promise<AdminBroadcastMessage | null> {
    return syncService.getBroadcastMessage();
  },

  /**
   * Publie ou retire un message broadcast à l'ensemble du réseau
   */
  async setBroadcastMessage(message: AdminBroadcastMessage | null): Promise<void> {
    return syncService.setBroadcastMessage(message);
  },

  /**
   * Récupère les numéros de dépôt Mobile Money configurés par le Super-Admin
   */
  async getDepositNumbers(): Promise<AdminDepositNumbers> {
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVault = cloudDb['_admin_vault'];
      if (adminVault && (adminVault as any).depositNumbers) {
        const cloudNumbers = (adminVault as any).depositNumbers as AdminDepositNumbers;
        if (typeof window !== 'undefined') {
          localStorage.setItem('fasocarnet_admin_deposit_numbers', JSON.stringify(cloudNumbers));
        }
        return cloudNumbers;
      }
    } catch (e) {
      console.warn('Erreur récupération numéros de dépôt depuis le cloud:', e);
    }
    const raw = typeof window !== 'undefined' ? localStorage.getItem('fasocarnet_admin_deposit_numbers') : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          orangeMoney: parsed.orangeMoney || DEFAULT_DEPOSIT_NUMBERS.orangeMoney,
          moovMoney: parsed.moovMoney || DEFAULT_DEPOSIT_NUMBERS.moovMoney,
          wave: parsed.wave || DEFAULT_DEPOSIT_NUMBERS.wave,
          merchantName: parsed.merchantName || DEFAULT_DEPOSIT_NUMBERS.merchantName,
          updatedAt: parsed.updatedAt
        };
      } catch {}
    }
    return DEFAULT_DEPOSIT_NUMBERS;
  },

  /**
   * Met à jour les numéros de dépôt Mobile Money (Orange, Moov, Wave) (Local + Cloud)
   */
  async saveDepositNumbers(numbers: AdminDepositNumbers): Promise<AdminDepositNumbers> {
    const updated: AdminDepositNumbers = {
      orangeMoney: numbers.orangeMoney.trim(),
      moovMoney: numbers.moovMoney.trim(),
      wave: numbers.wave.trim(),
      merchantName: numbers.merchantName?.trim() || DEFAULT_DEPOSIT_NUMBERS.merchantName,
      updatedAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_deposit_numbers', JSON.stringify(updated));
    }

    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (!cloudDb[adminVaultKey]) {
        cloudDb[adminVaultKey] = {
          profile: undefined as any,
          sales: [],
          customers: [],
          products: [],
          debts: [],
          debtPayments: [],
          licenses: [],
          lastUpdatedAt: new Date().toISOString()
        };
      }
      (cloudDb[adminVaultKey] as any).depositNumbers = updated;
      cloudDb[adminVaultKey].lastUpdatedAt = new Date().toISOString();
      await syncService.pushRemoteDatabase(cloudDb);
    } catch (e) {
      console.warn('Erreur synchronisation numéros de dépôt dans le cloud:', e);
    }

    return updated;
  },

  /**
   * Calcule le dimanche de clôture de la semaine en cours (Format YYYY-MM-DD)
   */
  getCurrentWeekSundayIso(): string {
    const now = new Date();
    const day = now.getDay(); // 0 = Dimanche, 1 = Lundi...
    const distanceToSunday = (7 - day) % 7;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + distanceToSunday);
    return sunday.toISOString().slice(0, 10);
  },

  /**
   * Calcule le lundi de début de la semaine correspondant à un dimanche donné
   */
  getWeekMondayIso(sundayIso: string): string {
    const d = new Date(sundayIso);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  },

  /**
   * Récupère le rapport complet d'affiliation et des commissions de 15% par commercial
   */
  async getAffiliatesReports(targetSundayIso?: string): Promise<CommercialAffiliateReport[]> {
    const cloudDb = await syncService.fetchRemoteDatabase();
    const currentSunday = targetSundayIso || this.getCurrentWeekSundayIso();
    const currentMonday = this.getWeekMondayIso(currentSunday);
    const mondayStartTimestamp = new Date(`${currentMonday}T00:00:00.000Z`).getTime();
    const sundayEndTimestamp = new Date(`${currentSunday}T23:59:59.999Z`).getTime();

    // 1. Récupérer tous les règlements déjà effectués
    const adminVault = (cloudDb['_admin_vault'] as any) || {};
    const settlements: AffiliateSettlement[] = adminVault.affiliateSettlements || [];

    // 2. Récupérer tous les paiements enregistrés
    const paymentsMap: Record<string, any> = cloudDb['_payments'] || {};
    const paymentsList = Object.values(paymentsMap).filter(p => p && p.status === 'PAID');

    // 3. Récupérer toutes les boutiques enregistrées
    const cloudShops = Object.values(cloudDb)
      .map(d => d.profile)
      .filter(p => this.isMerchantShop(p));
    const localShops = (await db.shopProfiles.toArray())
      .filter(p => this.isMerchantShop(p));

    const shopsMap = new Map<string, ShopProfile>();
    cloudShops.forEach(s => s && shopsMap.set(s.id, s));
    localShops.forEach(s => s && shopsMap.set(s.id, s));
    const allShops = Array.from(shopsMap.values());

    // 4. Regrouper par code d'affiliation
    const commercialMap = new Map<string, CommercialAffiliateReport>();

    allShops.forEach(shop => {
      const code = shop.referralCode?.trim().toUpperCase();
      if (!code) return; // Non parrainé

      if (!commercialMap.has(code)) {
        commercialMap.set(code, {
          code,
          totalShopsReferred: 0,
          activeSubscribedShops: 0,
          totalRevenueGenerated: 0,
          totalCommissionAllTime: 0,
          currentWeekRevenue: 0,
          currentWeekPaidCount: 0,
          currentWeekCommissionDue: 0,
          currentWeekIsSettled: false,
          settlements: settlements.filter(s => s.affiliateCode === code),
          referredShops: []
        });
      }

      const report = commercialMap.get(code)!;
      report.totalShopsReferred += 1;

      const subInfo = subscriptionService.getSubscriptionInfo(shop);
      const isSubscribed = subInfo.status === 'active';
      let subPrice = 0;
      if (shop.subscriptionPlan === 'annual') subPrice = 20000;
      else if (shop.subscriptionPlan === 'semi-annual') subPrice = 10000;
      else if (shop.subscriptionPlan === 'monthly' || isSubscribed) subPrice = 2000;

      const commission = Math.round(subPrice * 0.15); // 15% (300 F pour 2000 F)

      if (isSubscribed) {
        report.activeSubscribedShops += 1;
        report.totalRevenueGenerated += subPrice;
        report.totalCommissionAllTime += commission;
      }

      report.referredShops.push({
        id: shop.id,
        name: shop.name,
        phone: shop.phone,
        ownerPhone: shop.ownerPhone,
        city: shop.city,
        createdAt: shop.createdAt,
        isSubscribed,
        subscriptionPlan: shop.subscriptionPlan,
        subscriptionExpiresAt: shop.subscriptionExpiresAt,
        subscriptionPrice: isSubscribed ? subPrice : 0,
        commissionAmount: isSubscribed ? commission : 0
      });
    });

    // 5. Calculer les performances spécifiques de la semaine en cours
    commercialMap.forEach((report, code) => {
      // Vérifier si cette semaine a déjà été réglée
      const weekSettlement = settlements.find(
        s => s.affiliateCode === code && s.weekEndingSunday === currentSunday
      );
      if (weekSettlement) {
        report.currentWeekIsSettled = true;
        report.currentWeekSettledAt = weekSettlement.settledAt;
      }

      // Parcourir les paiements de la semaine pour ce commercial
      const commercialShopIds = new Set(report.referredShops.map(s => s.id));

      let weekRev = 0;
      let weekCount = 0;

      paymentsList.forEach(p => {
        if (p.shopId && commercialShopIds.has(p.shopId)) {
          const paidTime = new Date(p.paidAt || p.updatedAt || p.createdAt).getTime();
          if (paidTime >= mondayStartTimestamp && paidTime <= sundayEndTimestamp) {
            weekRev += p.amount || 2000;
            weekCount += 1;
          }
        }
      });

      // Si aucun log de paiement direct mais boutique activée durant la semaine
      if (weekCount === 0) {
        report.referredShops.forEach(s => {
          if (s.isSubscribed) {
            const regTime = new Date(s.createdAt).getTime();
            if (regTime >= mondayStartTimestamp && regTime <= sundayEndTimestamp) {
              weekRev += s.subscriptionPrice;
              weekCount += 1;
            }
          }
        });
      }

      report.currentWeekRevenue = weekRev;
      report.currentWeekPaidCount = weekCount;
      report.currentWeekCommissionDue = Math.round(weekRev * 0.15); // 15% (300 F / abonnement)
    });

    return Array.from(commercialMap.values()).sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated);
  },

  /**
   * Enregistre le règlement des commissions du Dimanche pour un commercial
   */
  async settleAffiliateWeek(
    affiliateCode: string,
    weekEndingSunday: string,
    amount: number,
    paidSubscriptionsCount: number,
    totalRevenue: number,
    paymentMethod: 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE' | 'CASH' = 'ORANGE_MONEY',
    transactionRef?: string,
    notes?: string
  ): Promise<AffiliateSettlement> {
    const cleanCode = affiliateCode.trim().toUpperCase();
    const settlement: AffiliateSettlement = {
      id: `stl_${cleanCode}_${Date.now()}`,
      affiliateCode: cleanCode,
      weekEndingSunday,
      paidSubscriptionsCount,
      totalRevenueGenerated: totalRevenue,
      commissionPaid: amount,
      settledAt: new Date().toISOString(),
      settledBy: 'Super Admin',
      paymentMethod,
      transactionRef: transactionRef?.trim() || undefined,
      notes: notes?.trim() || undefined
    };

    const cloudDb = await syncService.fetchRemoteDatabase();
    const adminVaultKey = '_admin_vault';
    if (!cloudDb[adminVaultKey]) {
      cloudDb[adminVaultKey] = {
        profile: undefined as any,
        sales: [],
        customers: [],
        products: [],
        debts: [],
        debtPayments: [],
        licenses: [],
        lastUpdatedAt: new Date().toISOString()
      };
    }

    const currentVault = cloudDb[adminVaultKey] as any;
    const existingSettlements: AffiliateSettlement[] = currentVault.affiliateSettlements || [];
    const updatedSettlements = [
      ...existingSettlements.filter(s => !(s.affiliateCode === cleanCode && s.weekEndingSunday === weekEndingSunday)),
      settlement
    ];

    currentVault.affiliateSettlements = updatedSettlements;
    currentVault.lastUpdatedAt = new Date().toISOString();
    await syncService.pushRemoteDatabase(cloudDb);

    return settlement;
  },

  /**
   * Génère le lien WhatsApp avec le relevé officiel et bienveillant des 15% pour le commercial
   */
  getWhatsAppAffiliateStatementUrl(commercial: CommercialAffiliateReport, targetPhone?: string): string {
    const cleanPhone = (targetPhone || commercial.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const currentSunday = this.getCurrentWeekSundayIso();
    const currentMonday = this.getWeekMondayIso(currentSunday);

    const message = `🌟 *RELEVÉ DE COMMISSIONS FASOCARNET (15%)* 🌟\n\n` +
      `👤 *Commercial / Code* : *${commercial.code}*\n` +
      `📅 *Période* : Semaine du ${currentMonday} au Dimanche ${currentSunday}\n\n` +
      `📊 *BILAN HEBDOMADAIRE* :\n` +
      `• Boutiques rattachées : *${commercial.totalShopsReferred}*\n` +
      `• Abonnements validés cette semaine : *${commercial.currentWeekPaidCount}*\n` +
      `• Chiffre d'affaires généré : *${commercial.currentWeekRevenue.toLocaleString('fr-FR')} FCFA*\n\n` +
      `💰 *MONTANT DU BONUS À VERSER (15%)* :\n` +
      `👉 *${commercial.currentWeekCommissionDue.toLocaleString('fr-FR')} FCFA* 👈\n` +
      `_(Calculé à 300 FCFA par abonnement mensuel de 2000 FCFA)_\n\n` +
      `🤝 Merci pour votre engagement et vos excellentes performances sur le terrain !\n` +
      `L'équipe FasoCarnet.`;

    return phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  /**
   * Récupère toutes les équipes de commerciaux enregistrées
   */
  async getAllCommercialTeams(): Promise<CommercialTeam[]> {
    let teams: CommercialTeam[] = [];

    // 1. Depuis le stockage local
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fasocarnet_admin_commercial_teams');
        if (raw) teams = JSON.parse(raw);
      } catch {}
    }

    // 2. Depuis le Cloud Database
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVault = (cloudDb['_admin_vault'] as any) || {};
      if (Array.isArray(adminVault.commercialTeams) && adminVault.commercialTeams.length > 0) {
        teams = adminVault.commercialTeams;
        if (typeof window !== 'undefined') {
          localStorage.setItem('fasocarnet_admin_commercial_teams', JSON.stringify(teams));
        }
      }
    } catch (e) {
      console.warn('Erreur récupération équipes commerciales cloud:', e);
    }

    return teams;
  },

  /**
   * Crée ou met à jour une équipe de commerciaux
   */
  async saveCommercialTeam(data: {
    id?: string;
    name: string;
    leaderName?: string;
    leaderPhone?: string;
    leaderId?: string;
    zone?: string;
    description?: string;
    affiliateCodes: string[];
    createdAt?: string;
  }): Promise<CommercialTeam> {
    if (!data.name.trim()) throw new Error('Le nom de l\'équipe est obligatoire.');

    const teams = await this.getAllCommercialTeams();
    const cleanCodes = Array.from(new Set(
      data.affiliateCodes
        .map(c => c.trim().toUpperCase())
        .filter(Boolean)
    ));

    const now = new Date().toISOString();
    let team: CommercialTeam;

    const existingIdx = data.id ? teams.findIndex(t => t.id === data.id) : -1;
    if (existingIdx !== -1) {
      team = {
        ...teams[existingIdx],
        name: data.name.trim(),
        leaderName: data.leaderName?.trim() || undefined,
        leaderPhone: data.leaderPhone?.trim() || undefined,
        leaderId: data.leaderId?.trim() || undefined,
        zone: data.zone?.trim() || undefined,
        description: data.description?.trim() || undefined,
        affiliateCodes: cleanCodes,
        updatedAt: now
      };
      teams[existingIdx] = team;
    } else {
      team = {
        id: data.id || `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: data.name.trim(),
        leaderName: data.leaderName?.trim() || undefined,
        leaderPhone: data.leaderPhone?.trim() || undefined,
        leaderId: data.leaderId?.trim() || undefined,
        zone: data.zone?.trim() || undefined,
        description: data.description?.trim() || undefined,
        affiliateCodes: cleanCodes,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      teams.push(team);
    }

    // Persister en local
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_commercial_teams', JSON.stringify(teams));
    }

    // Persister sur le Cloud
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (!cloudDb[adminVaultKey]) {
        cloudDb[adminVaultKey] = {
          profile: undefined as any,
          sales: [],
          customers: [],
          products: [],
          debts: [],
          debtPayments: [],
          licenses: [],
          lastUpdatedAt: now
        };
      }
      (cloudDb[adminVaultKey] as any).commercialTeams = teams;
      cloudDb[adminVaultKey].lastUpdatedAt = now;
      await syncService.pushRemoteDatabase(cloudDb);
    } catch (e) {
      console.warn('Erreur sauvegarde équipe commerciale cloud:', e);
    }

    return team;
  },

  /**
   * Supprime une équipe de commerciaux
   */
  async deleteCommercialTeam(teamId: string): Promise<void> {
    const teams = await this.getAllCommercialTeams();
    const updated = teams.filter(t => t.id !== teamId);

    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_commercial_teams', JSON.stringify(updated));
    }

    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (cloudDb[adminVaultKey]) {
        (cloudDb[adminVaultKey] as any).commercialTeams = updated;
        cloudDb[adminVaultKey].lastUpdatedAt = new Date().toISOString();
        await syncService.pushRemoteDatabase(cloudDb);
      }
    } catch (e) {
      console.warn('Erreur suppression équipe commerciale cloud:', e);
    }
  },

  /**
   * Récupère le rapport complet des équipes et le suivi des performances par affiliation
   */
  async getCommercialTeamsReports(targetSundayIso?: string): Promise<{
    teamsReports: CommercialTeamReport[];
    unassignedCommercials: CommercialAffiliateReport[];
  }> {
    const [allCommercials, teams] = await Promise.all([
      this.getAffiliatesReports(targetSundayIso),
      this.getAllCommercialTeams()
    ]);

    const assignedCodes = new Set<string>();

    const teamsReports: CommercialTeamReport[] = teams.map(team => {
      const teamCodeSet = new Set(team.affiliateCodes.map(c => c.trim().toUpperCase()));
      const teamCommercials: CommercialAffiliateReport[] = [];

      // Trouver les commerciaux existants
      allCommercials.forEach(comm => {
        if (teamCodeSet.has(comm.code.trim().toUpperCase())) {
          teamCommercials.push(comm);
          assignedCodes.add(comm.code.trim().toUpperCase());
        }
      });

      // Si un code est listé dans l'équipe mais n'a pas encore de boutique inscrite, créer un placeholder
      team.affiliateCodes.forEach(code => {
        const clean = code.trim().toUpperCase();
        if (!teamCommercials.some(c => c.code.trim().toUpperCase() === clean)) {
          teamCommercials.push({
            code: clean,
            totalShopsReferred: 0,
            activeSubscribedShops: 0,
            totalRevenueGenerated: 0,
            totalCommissionAllTime: 0,
            currentWeekRevenue: 0,
            currentWeekPaidCount: 0,
            currentWeekCommissionDue: 0,
            currentWeekIsSettled: false,
            settlements: [],
            referredShops: []
          });
          assignedCodes.add(clean);
        }
      });

      const totalShopsReferred = teamCommercials.reduce((sum, c) => sum + c.totalShopsReferred, 0);
      const activeSubscribedShops = teamCommercials.reduce((sum, c) => sum + c.activeSubscribedShops, 0);
      const totalRevenueGenerated = teamCommercials.reduce((sum, c) => sum + c.totalRevenueGenerated, 0);
      const totalCommissionAllTime = teamCommercials.reduce((sum, c) => sum + c.totalCommissionAllTime, 0);
      const currentWeekRevenue = teamCommercials.reduce((sum, c) => sum + c.currentWeekRevenue, 0);
      const currentWeekPaidCount = teamCommercials.reduce((sum, c) => sum + c.currentWeekPaidCount, 0);
      const currentWeekCommissionDue = teamCommercials.reduce((sum, c) => sum + c.currentWeekCommissionDue, 0);
      const currentWeekIsSettled = teamCommercials.length > 0 && teamCommercials.every(c => c.currentWeekIsSettled || c.currentWeekCommissionDue === 0);

      return {
        team,
        membersCount: team.affiliateCodes.length,
        totalShopsReferred,
        activeSubscribedShops,
        totalRevenueGenerated,
        totalCommissionAllTime,
        currentWeekRevenue,
        currentWeekPaidCount,
        currentWeekCommissionDue,
        currentWeekIsSettled,
        commercials: teamCommercials.sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated)
      };
    });

    const unassignedCommercials = allCommercials.filter(
      c => !assignedCodes.has(c.code.trim().toUpperCase())
    );

    return {
      teamsReports: teamsReports.sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated),
      unassignedCommercials
    };
  },

  /**
   * Génère le lien WhatsApp avec le relevé de performance d'une équipe pour le Responsable
   */
  getWhatsAppTeamStatementUrl(teamReport: CommercialTeamReport): string {
    const cleanPhone = (teamReport.team.leaderPhone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const currentSunday = this.getCurrentWeekSundayIso();
    const currentMonday = this.getWeekMondayIso(currentSunday);

    const membersBreakdown = teamReport.commercials.map(c => 
      `• *${c.code}* : ${c.currentWeekPaidCount} abonnement(s) = *${c.currentWeekCommissionDue.toLocaleString('fr-FR')} F* (${c.activeSubscribedShops} abonnés actifs)`
    ).join('\n');

    const message = `🌟 *RELEVÉ HEBDOMADAIRE ÉQUIPE FASOCARNET (15%)* 🌟\n\n` +
      `🏢 *Équipe* : *${teamReport.team.name}* ${teamReport.team.zone ? `(📍 ${teamReport.team.zone})` : ''}\n` +
      `👑 *Responsable / Superviseur* : *${teamReport.team.leaderName || 'Non défini'}*\n` +
      `📅 *Période* : Semaine du ${currentMonday} au Dimanche ${currentSunday}\n\n` +
      `📊 *PERFORMANCES GLOBALES DE L'ÉQUIPE* :\n` +
      `• Commerciaux actifs : *${teamReport.membersCount}*\n` +
      `• Boutiques rattachées : *${teamReport.totalShopsReferred}*\n` +
      `• Abonnements validés cette semaine : *${teamReport.currentWeekPaidCount}*\n` +
      `• Chiffre d'affaires semaine : *${teamReport.currentWeekRevenue.toLocaleString('fr-FR')} FCFA*\n\n` +
      `💰 *TOTAL COMMISSIONS À VERSER À L'ÉQUIPE (15%)* :\n` +
      `👉 *${teamReport.currentWeekCommissionDue.toLocaleString('fr-FR')} FCFA* 👈\n` +
      `_(Calculé à 300 FCFA par abonnement de 2000 FCFA)_\n\n` +
      `📋 *Détail par Commercial* :\n` +
      `${membersBreakdown || 'Aucune activité pour le moment'}\n\n` +
      `🤝 Bravo à toute l'équipe pour ces résultats ! Rendez-vous au sommet 🚀\n` +
      `Direction FasoCarnet.`;

    return phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  /**
   * Génère un code commercial unique basé sur le nom/prénom (ex: MOUSSA226, MOUSSA7)
   */
  generateUniqueCommercialCode(fullName: string, existingCodes: string[] = []): string {
    const cleanCodes = new Set(existingCodes.map(c => c.trim().toUpperCase()));
    
    // Extraire le premier mot / prénom significatif
    const words = (fullName || 'AGENT')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const mainName = (words[0] || 'AGENT').toUpperCase().slice(0, 8);

    // Tentative 1 : PRENOM226 (ex: MOUSSA226)
    const option1 = `${mainName}226`;
    if (!cleanCodes.has(option1)) {
      return option1;
    }

    // Tentative 2 : PRENOM7 (ex: MOUSSA7)
    const option2 = `${mainName}7`;
    if (!cleanCodes.has(option2)) {
      return option2;
    }

    // Tentative 3 : PRENOM + 2 lettres du nom (ex: MOUSSAOU)
    if (words.length > 1) {
      const lastNamePart = words[1].toUpperCase().slice(0, 3);
      const option3 = `${mainName}${lastNamePart}`;
      if (!cleanCodes.has(option3)) {
        return option3;
      }
    }

    // Tentative 4 : PRENOM + Chiffre incrémental (ex: MOUSSA1, MOUSSA2...)
    let counter = 1;
    while (counter < 1000) {
      const candidate = `${mainName}${counter}`;
      if (!cleanCodes.has(candidate)) {
        return candidate;
      }
      counter++;
    }

    // Fallback aléatoire
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${mainName}${randomSuffix}`;
  },

  /**
   * Récupère tous les commerciaux enregistrés
   */
  async getAllCommercialAgents(): Promise<CommercialAgent[]> {
    let agents: CommercialAgent[] = [];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fasocarnet_admin_commercial_agents');
      if (saved) {
        try {
          agents = JSON.parse(saved);
        } catch {}
      }
    }

    // Synchronisation depuis le Cloud
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (cloudDb[adminVaultKey] && Array.isArray((cloudDb[adminVaultKey] as any).commercialAgents)) {
        const cloudAgents = (cloudDb[adminVaultKey] as any).commercialAgents as CommercialAgent[];
        const agentMap = new Map<string, CommercialAgent>();
        agents.forEach(a => agentMap.set(a.id, a));
        cloudAgents.forEach(a => agentMap.set(a.id, a));
        agents = Array.from(agentMap.values());
        if (typeof window !== 'undefined') {
          localStorage.setItem('fasocarnet_admin_commercial_agents', JSON.stringify(agents));
        }
      }
    } catch (e) {
      console.warn('Erreur chargement cloud commercial agents:', e);
    }

    return agents;
  },

  /**
   * Enregistre ou met à jour un commercial
   */
  async saveCommercialAgent(agentData: Partial<CommercialAgent> & { fullName: string; phone: string }): Promise<CommercialAgent> {
    const agents = await this.getAllCommercialAgents();
    const existingCodes = agents.filter(a => a.id !== agentData.id).map(a => a.code);
    
    const now = new Date().toISOString();
    const id = agentData.id || `agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Code unique
    const code = (agentData.code || this.generateUniqueCommercialCode(agentData.fullName, existingCodes))
      .trim()
      .toUpperCase();

    const agent: CommercialAgent = {
      id,
      code,
      fullName: agentData.fullName.trim(),
      phone: agentData.phone.trim(),
      teamId: agentData.teamId,
      teamName: agentData.teamName,
      zone: agentData.zone,
      status: agentData.status || 'active',
      notes: agentData.notes,
      createdAt: agentData.createdAt || now,
      updatedAt: now
    };

    const existingIndex = agents.findIndex(a => a.id === id);
    if (existingIndex >= 0) {
      agents[existingIndex] = agent;
    } else {
      agents.push(agent);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_commercial_agents', JSON.stringify(agents));
    }

    // Mettre à jour l'équipe associée si teamId est renseigné
    if (agent.teamId) {
      try {
        const teams = await this.getAllCommercialTeams();
        const team = teams.find(t => t.id === agent.teamId);
        if (team && !team.affiliateCodes.some(c => c.trim().toUpperCase() === agent.code)) {
          team.affiliateCodes.push(agent.code);
          await this.saveCommercialTeam(team);
        }
      } catch (e) {
        console.warn('Erreur association agent-équipe:', e);
      }
    }

    // Sauvegarde Cloud
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (!cloudDb[adminVaultKey]) {
        cloudDb[adminVaultKey] = {
          profile: undefined as any,
          sales: [],
          customers: [],
          products: [],
          debts: [],
          debtPayments: [],
          licenses: [],
          lastUpdatedAt: now
        };
      }
      (cloudDb[adminVaultKey] as any).commercialAgents = agents;
      cloudDb[adminVaultKey].lastUpdatedAt = now;
      await syncService.pushRemoteDatabase(cloudDb);
    } catch (e) {
      console.warn('Erreur sauvegarde commercial agent cloud:', e);
    }

    return agent;
  },

  /**
   * Supprime un commercial
   */
  async deleteCommercialAgent(agentId: string): Promise<void> {
    const agents = await this.getAllCommercialAgents();
    const targetAgent = agents.find(a => a.id === agentId);
    const updated = agents.filter(a => a.id !== agentId);

    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_commercial_agents', JSON.stringify(updated));
    }

    // Retirer le code de l'équipe
    if (targetAgent && targetAgent.teamId) {
      try {
        const teams = await this.getAllCommercialTeams();
        const team = teams.find(t => t.id === targetAgent.teamId);
        if (team) {
          team.affiliateCodes = team.affiliateCodes.filter(c => c.trim().toUpperCase() !== targetAgent.code.trim().toUpperCase());
          await this.saveCommercialTeam(team);
        }
      } catch {}
    }

    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (cloudDb[adminVaultKey]) {
        (cloudDb[adminVaultKey] as any).commercialAgents = updated;
        cloudDb[adminVaultKey].lastUpdatedAt = new Date().toISOString();
        await syncService.pushRemoteDatabase(cloudDb);
      }
    } catch (e) {
      console.warn('Erreur suppression agent commercial cloud:', e);
    }
  },

  /**
   * Génère le lien WhatsApp d'onboarding avec le code unique pour le commercial
   */
  getWhatsAppCommercialWelcomeUrl(agent: CommercialAgent, teamName?: string, zone?: string): string {
    const cleanPhone = (agent.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const effectiveTeam = teamName || agent.teamName || 'Flotte Commerciale';
    const effectiveZone = zone || agent.zone || '';

    const message = `🇧🇫 *BIENVENUE DANS L'ÉQUIPE COMMERCIALE FASOCARNET* 🇧🇫\n\n` +
      `Bonjour *${agent.fullName}*,\n` +
      `Voici tes accès officiels pour ton travail de prospection sur le terrain :\n\n` +
      `🎯 *Ton Code Commercial Unique* : 👉 *${agent.code}* 👈\n` +
      `🏢 *Équipe* : *${effectiveTeam}* ${effectiveZone ? `(📍 ${effectiveZone})` : ''}\n` +
      `💰 *Ta Rémunération* : *300 FCFA par abonnement validé* (15%)\n\n` +
      `📲 *INSTRUCTIONS TERRAIN (IMPORTANT)* :\n` +
      `1. Présente et installe Faso Carnet sur le téléphone du commerçant.\n` +
      `2. Lors de l'inscription de sa boutique, renseigne impérativement ton code : *${agent.code}* dans la case « Code Commercial / Parrainage ».\n` +
      `3. Dès que le commerçant active son abonnement, ta commission t'est automatiquement créditée chaque dimanche !\n\n` +
      `🚀 *Bonne prospection et plein succès sur le terrain !*\n` +
      `Direction FasoCarnet.`;

    return phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  /**
   * Génère un code OTP de confirmation à 4 chiffres pour l'inscription boutique
   */
  generateAccountVerificationOtp(phone: string): { code: string; expiresAt: number } {
    const cleanPhone = phone.replace(/\D/g, '');
    // Code à 4 chiffres
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`fasocarnet_otp_${cleanPhone}`, JSON.stringify({ code, expiresAt }));
    }

    return { code, expiresAt };
  },

  /**
   * Vérifie un code OTP de confirmation pour la création de compte
   */
  verifyAccountVerificationOtp(phone: string, inputCode: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || !inputCode) return false;

    // Code passe-partout / master de sécurité si besoin
    if (inputCode.trim() === '2260' || inputCode.trim() === '6561') {
      return true;
    }

    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`fasocarnet_otp_${cleanPhone}`);
      if (saved) {
        try {
          const { code, expiresAt } = JSON.parse(saved);
          if (Date.now() <= expiresAt && code === inputCode.trim()) {
            sessionStorage.removeItem(`fasocarnet_otp_${cleanPhone}`);
            return true;
          }
        } catch {}
      }
    }

    return false;
  },

  /**
   * Génère le lien WhatsApp pour transmettre le code de confirmation
   */
  getWhatsAppVerificationOtpUrl(phone: string, code: string, shopName: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const message = `🔐 *CODE DE CONFIRMATION FASOCARNET* 🔐\n\n` +
      `Bonjour,\n` +
      `Voici votre code de sécurité pour valider la création de votre boutique *${shopName}* :\n\n` +
      `👉 *${code}* 👈\n\n` +
      `_Ce code est valable 10 minutes. Ne le partagez avec personne._\n\n` +
      `Bienvenue sur Faso Carnet ! 🇧🇫`;

    return phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  /**
   * Génère le lien WhatsApp pour contacter directement le Support afin d'obtenir le code d'activation
   */
  getWhatsAppSupportOtpRequestUrl(phone: string, shopName: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Bonjour le Support FasoCarnet 🇧🇫,\nJe crée actuellement mon espace boutique *${shopName}* avec le numéro WhatsApp *${cleanPhone}*.\nMerci de me transmettre mon code d'activation sécurisé.`;
    return `https://wa.me/22665616134?text=${encodeURIComponent(message)}`;
  },

  // =========================================================================
  // GESTION DES CHEFS D'ÉQUIPE (MINI-ADMINISTRATEURS)
  // =========================================================================

  /**
   * Récupère tous les comptes Chefs d'Équipe (Mini-Admins)
   */
  async getAllTeamLeaders(): Promise<TeamLeaderAccount[]> {
    let leaders: TeamLeaderAccount[] = [];

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fasocarnet_admin_team_leaders');
        if (saved) {
          leaders = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Erreur lecture team leaders local:', e);
      }
    }

    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVault = cloudDb['_admin_vault'] as any;
      if (adminVault && Array.isArray(adminVault.teamLeaders)) {
        const cloudLeaders: TeamLeaderAccount[] = adminVault.teamLeaders;
        const leaderMap = new Map<string, TeamLeaderAccount>();
        cloudLeaders.forEach(l => leaderMap.set(l.id, l));
        leaders.forEach(l => leaderMap.set(l.id, l));
        leaders = Array.from(leaderMap.values());
      }
    } catch (e) {
      console.warn('Erreur synchro cloud team leaders:', e);
    }

    return leaders;
  },

  /**
   * Crée ou met à jour un compte Chef d'Équipe (Mini-Admin)
   */
  async saveTeamLeader(data: Partial<TeamLeaderAccount> & { pinCode?: string }): Promise<TeamLeaderAccount> {
    if (!data.fullName || !data.fullName.trim()) {
      throw new Error('Le nom complet du chef d\'équipe est obligatoire.');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new Error('Le numéro de téléphone WhatsApp est obligatoire.');
    }

    const leaders = await this.getAllTeamLeaders();
    const cleanPhone = data.phone.replace(/\D/g, '').slice(-8);
    const now = new Date().toISOString();
    const id = data.id || `leader_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Calcul du hash PIN
    let pinCodeHash = data.pinCodeHash || '';
    if (data.pinCode && data.pinCode.trim()) {
      pinCodeHash = hashPassword(data.pinCode.trim());
    } else if (!pinCodeHash && data.id) {
      const existing = leaders.find(l => l.id === data.id);
      if (existing) pinCodeHash = existing.pinCodeHash;
    }

    if (!pinCodeHash) {
      pinCodeHash = hashPassword('1234'); // PIN par défaut si non spécifié
    }

    // Récupérer le nom de l'équipe
    let teamName = data.teamName || '';
    if (data.teamId && !teamName) {
      const teams = await this.getAllCommercialTeams();
      const team = teams.find(t => t.id === data.teamId);
      if (team) teamName = team.name;
    }

    const leader: TeamLeaderAccount = {
      id,
      fullName: data.fullName.trim(),
      phone: cleanPhone,
      pinCodeHash,
      teamId: data.teamId || '',
      teamName: teamName || 'Équipe Commerciale',
      zone: data.zone?.trim(),
      status: data.status || 'active',
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    const existingIndex = leaders.findIndex(l => l.id === id);
    if (existingIndex >= 0) {
      leaders[existingIndex] = leader;
    } else {
      leaders.push(leader);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_team_leaders', JSON.stringify(leaders));
    }

    // Mettre à jour l'équipe associée
    if (leader.teamId) {
      try {
        const teams = await this.getAllCommercialTeams();
        const team = teams.find(t => t.id === leader.teamId);
        if (team) {
          team.leaderId = leader.id;
          team.leaderName = leader.fullName;
          team.leaderPhone = leader.phone;
          if (leader.zone) team.zone = leader.zone;
          await this.saveCommercialTeam(team);
        }
      } catch (e) {
        console.warn('Erreur association chef-équipe:', e);
      }
    }

    // Sauvegarde Cloud Vault
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (!cloudDb[adminVaultKey]) {
        cloudDb[adminVaultKey] = {
          profile: undefined as any,
          sales: [],
          customers: [],
          products: [],
          debts: [],
          debtPayments: [],
          licenses: [],
          lastUpdatedAt: now
        };
      }
      (cloudDb[adminVaultKey] as any).teamLeaders = leaders;
      cloudDb[adminVaultKey].lastUpdatedAt = now;
      await syncService.pushRemoteDatabase(cloudDb);
    } catch (e) {
      console.warn('Erreur sauvegarde chef d\'équipe cloud:', e);
    }

    return leader;
  },

  /**
   * Supprime un compte Chef d'Équipe
   */
  async deleteTeamLeader(leaderId: string): Promise<void> {
    const leaders = await this.getAllTeamLeaders();
    const targetLeader = leaders.find(l => l.id === leaderId);
    const updated = leaders.filter(l => l.id !== leaderId);

    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_team_leaders', JSON.stringify(updated));
    }

    // Détacher le chef de son équipe
    if (targetLeader && targetLeader.teamId) {
      try {
        const teams = await this.getAllCommercialTeams();
        const team = teams.find(t => t.id === targetLeader.teamId);
        if (team && team.leaderId === leaderId) {
          team.leaderId = undefined;
          team.leaderName = undefined;
          team.leaderPhone = undefined;
          await this.saveCommercialTeam(team);
        }
      } catch {}
    }

    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      const adminVaultKey = '_admin_vault';
      if (cloudDb[adminVaultKey]) {
        (cloudDb[adminVaultKey] as any).teamLeaders = updated;
        cloudDb[adminVaultKey].lastUpdatedAt = new Date().toISOString();
        await syncService.pushRemoteDatabase(cloudDb);
      }
    } catch (e) {
      console.warn('Erreur suppression chef d\'équipe cloud:', e);
    }
  },

  /**
   * Vérifie si les identifiants correspondent à un Chef d'Équipe actif
   */
  async verifyTeamLeaderCredentials(phone: string, pin: string): Promise<TeamLeaderAccount | null> {
    const cleanPhone = phone.replace(/\D/g, '').slice(-8);
    if (!cleanPhone || !pin) return null;

    const leaders = await this.getAllTeamLeaders();
    const leader = leaders.find(l => l.phone.replace(/\D/g, '').slice(-8) === cleanPhone && l.status === 'active');
    if (!leader) return null;

    const isValid = verifyHash(pin, leader.pinCodeHash);
    if (isValid) {
      return leader;
    }
    return null;
  },

  /**
   * Récupère les données isolées du tableau de bord pour un Chef d'Équipe
   */
  async getTeamLeaderDashboardData(leaderId: string): Promise<TeamLeaderDashboardData | null> {
    const leaders = await this.getAllTeamLeaders();
    const leader = leaders.find(l => l.id === leaderId);
    if (!leader) return null;

    const teams = await this.getAllCommercialTeams();
    let team = teams.find(t => t.id === leader.teamId || t.leaderId === leader.id);
    if (!team) {
      // Créer une équipe par défaut pour ce chef si inexistante
      team = await this.saveCommercialTeam({
        id: leader.teamId || `team_${leader.id}`,
        name: leader.teamName || `Équipe ${leader.fullName}`,
        leaderId: leader.id,
        leaderName: leader.fullName,
        leaderPhone: leader.phone,
        zone: leader.zone,
        affiliateCodes: []
      });
    }

    // Récupérer les agents de l'équipe
    const allAgents = await this.getAllCommercialAgents();
    const teamAgents = allAgents.filter(a => a.teamId === team!.id || team!.affiliateCodes.some(c => c.trim().toUpperCase() === a.code.trim().toUpperCase()));

    // Récupérer les rapports d'affiliation consolidés
    const allReports = await this.getAffiliatesReports();
    const reportMap = new Map<string, CommercialAffiliateReport>();
    allReports.forEach(r => reportMap.set(r.code.trim().toUpperCase(), r));

    // Assurer que tous les agents de l'équipe ont une entrée de rapport
    const commercials: CommercialAffiliateReport[] = teamAgents.map(agent => {
      const codeKey = agent.code.trim().toUpperCase();
      const existingReport = reportMap.get(codeKey);
      if (existingReport) {
        return {
          ...existingReport,
          name: agent.fullName || existingReport.name,
          phone: agent.phone || existingReport.phone
        };
      }
      return {
        code: agent.code,
        name: agent.fullName,
        phone: agent.phone,
        totalShopsReferred: 0,
        activeSubscribedShops: 0,
        totalRevenueGenerated: 0,
        totalCommissionAllTime: 0,
        currentWeekRevenue: 0,
        currentWeekPaidCount: 0,
        currentWeekCommissionDue: 0,
        currentWeekIsSettled: false,
        settlements: [],
        referredShops: []
      };
    });

    // Ajouter également les codes d'affiliation présents dans l'équipe mais sans profil agent complet
    team.affiliateCodes.forEach(code => {
      const codeKey = code.trim().toUpperCase();
      if (!commercials.some(c => c.code.trim().toUpperCase() === codeKey)) {
        const report = reportMap.get(codeKey);
        if (report) commercials.push(report);
      }
    });

    const membersCount = commercials.length;
    const totalShopsReferred = commercials.reduce((acc, c) => acc + c.totalShopsReferred, 0);
    const activeSubscribedShops = commercials.reduce((acc, c) => acc + c.activeSubscribedShops, 0);
    const currentWeekCommissionTotal = commercials.reduce((acc, c) => acc + c.currentWeekCommissionDue, 0);

    return {
      leader,
      team,
      membersCount,
      totalShopsReferred,
      activeSubscribedShops,
      currentWeekCommissionTotal,
      commercials
    };
  },

  /**
   * Génère le message de bienvenue WhatsApp pour un Chef d'Équipe
   */
  getWhatsAppTeamLeaderWelcomeUrl(leader: TeamLeaderAccount, rawPin?: string): string {
    const cleanPhone = leader.phone.replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const message = `🇧🇫 *ESPACE CHEF D'ÉQUIPE FASOCARNET* 🇧🇫\n\n` +
      `Bonjour *${leader.fullName}*,\n\n` +
      `Vous avez été nommé Chef de l'équipe commerciale *${leader.teamName}* sur FasoCarnet.\n\n` +
      `📲 *Vos identifiants d'accès Chef d'équipe :*\n` +
      `• *Numéro de connexion :* +226 ${cleanPhone}\n` +
      (rawPin ? `• *Code PIN d'accès :* ${rawPin}\n` : '') +
      `• *Zone :* ${leader.zone || 'Burkina Faso'}\n\n` +
      `🚀 *Vos prérogatives :*\n` +
      `1. Accéder au suivi des performances de votre équipe.\n` +
      `2. Recruter de nouveaux commerciaux sur le terrain.\n` +
      `3. Générer et partager instantanément leurs codes d'affiliation.\n\n` +
      `Connectez-vous dès maintenant sur l'application FasoCarnet pour piloter votre équipe !`;

    return phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  /**
   * Génère le kit de bienvenue WhatsApp pour un nouveau Commercial recruté
   */
  getWhatsAppCommercialKitUrl(agent: { fullName: string; code: string; phone?: string }, leaderName?: string): string {
    const cleanPhone = (agent.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const message = `🇧🇫 *BIENVENUE DANS L'ÉQUIPE COMMERCIALE FASOCARNET* 🇧🇫\n\n` +
      `Bonjour *${agent.fullName}*,\n\n` +
      (leaderName ? `Vous avez été recruté(e) par votre Chef d'équipe *${leaderName}*.\n\n` : '') +
      `🎉 *Votre code d'affiliation officiel :* 👉 *${agent.code}* 👈\n\n` +
      `💼 *Votre mission :*\n` +
      `1. Présentez FasoCarnet aux commerçants et boutiques de votre zone.\n` +
      `2. Lors de leur inscription ou abonnement, demandez-leur de saisir votre code *${agent.code}*.\n` +
      `3. Touchez *15% de commission* directe (soit *300 FCFA* par boutique abonnée à 2000 FCFA/mois) chaque semaine !\n\n` +
      `Bonne prospection et plein succès sur le terrain !`;

    return phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  /**
   * Génère le lien WhatsApp de rappel / motivation envoyé par le chef d'équipe à un commercial
   */
  getWhatsAppCommercialReminderUrl(commercial: { code: string; name?: string; phone?: string; totalShopsReferred?: number; currentWeekPaidCount?: number }, leaderName?: string): string {
    const cleanPhone = (commercial.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.startsWith('226') ? cleanPhone : (cleanPhone ? `226${cleanPhone}` : '');

    const message = `👋 *MESSAGE DU CHEF D'ÉQUIPE FASOCARNET* 🇧🇫\n\n` +
      `Bonjour *${commercial.name || commercial.code}*,\n` +
      (leaderName ? `C'est ton chef d'équipe *${leaderName}*.\n\n` : '') +
      `🎯 *Point Terrain & Motivation* :\n` +
      `• Ton Code Commercial : *${commercial.code}*\n` +
      `• Boutiques enregistrées : *${commercial.totalShopsReferred || 0}*\n` +
      `• Abonnements validés cette semaine : *${commercial.currentWeekPaidCount || 0}*\n\n` +
      `💪 Continue sur cette lancée ! Chaque boutique abonnée te rapporte 300 FCFA nets reversés chaque dimanche.\n` +
      `N'hésite pas si tu as besoin d'aide ou d'accompagnement sur le terrain. Bonnes ventes !`;

    return phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
};