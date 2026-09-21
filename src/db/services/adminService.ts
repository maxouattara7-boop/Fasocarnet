import { db } from '../db';
import { ShopProfile, LicenseKey, ExtendedAdminAnalytics, AdminBroadcastMessage, DeviceTelemetry, AdminDepositNumbers } from '../../types';
import { subscriptionService, SUBSCRIPTION_PLANS, DEFAULT_DEPOSIT_NUMBERS } from './subscriptionService';
import { syncService } from './syncService';
import { detectBurkinaOperator, detectPlatform } from '../../utils/telemetry';
import { verifyHash, hashPassword, isHashed } from '../../utils/crypto';

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
   * Prolonge manuellement la licence d'une boutique (Action Admin)
   */
  async extendShopLicense(shopId: string, durationMonths: number): Promise<ShopProfile> {
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
      updatedAt: new Date().toISOString()
    };

    // Mettre à jour en local et sur le Cloud
    await db.shopProfiles.put(updated);
    if (cloudDb[shopId]) {
      cloudDb[shopId].profile = updated;
      cloudDb[shopId].lastUpdatedAt = new Date().toISOString();
      await syncService.pushRemoteDatabase(cloudDb);
    }

    return updated;
  },

  /**
   * Supprime définitivement une boutique (Action Admin)
   */
  async deleteShop(shopId: string): Promise<void> {
    await db.shopProfiles.delete(shopId);
    const cloudDb = await syncService.fetchRemoteDatabase();
    if (cloudDb[shopId]) {
      delete cloudDb[shopId];
      await syncService.pushRemoteDatabase(cloudDb);
    }
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
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      let prefix = 'FASO-1M-';
      if (plan === 'semi-annual') prefix = 'FASO-6M-';
      else if (plan === 'annual') prefix = 'FASO-1AN-';

      const key: LicenseKey = {
        id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        code: `${prefix}${randomCode}`,
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
  }
};