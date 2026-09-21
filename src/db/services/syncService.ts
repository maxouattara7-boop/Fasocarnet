import { db } from '../db';
import { Customer, DebtPayment, DebtRecord, Product, Sale, ShopProfile, LicenseKey, AdminBroadcastMessage, DeviceTelemetry } from '../../types';
import { adminService } from './adminService';
import { collectCurrentTelemetry } from '../../utils/telemetry';
import { verifyHash, hashPin, isHashed, generateShopAuthToken, verifyShopAuthToken } from '../../utils/crypto';

export interface CloudShopData {
  profile: ShopProfile;
  products: Product[];
  customers: Customer[];
  debts: DebtRecord[];
  debtPayments: DebtPayment[];
  sales: Sale[];
  licenses: LicenseKey[];
  telemetry?: DeviceTelemetry;
  lastUpdatedAt: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  shop?: ShopProfile;
  token?: string;
  isAdmin?: boolean;
}

const CLOUD_STORAGE_KEY = 'fasocarnet_cloud_database_v1';
const BROADCAST_STORAGE_KEY = 'fasocarnet_active_broadcast_v1';
const AUTH_TOKEN_STORAGE_KEY = 'fasocarnet_shop_auth_token_v1';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      return window.location.origin;
    }
    const saved = localStorage.getItem('fasocarnet_server_url');
    if (saved) return saved;
  }
  return 'http://localhost:3000';
};

/**
 * Moteur de synchronisation Cloud & Gestion du compte unique par appareil
 */
export const syncService = {
  /**
   * Récupère la base Cloud depuis le serveur local / réseau avec fallback sur le cache local
   */
  async fetchRemoteDatabase(): Promise<Record<string, CloudShopData>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${getApiBaseUrl()}/api/cloud/db`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          // Fusionner avec le cache local
          const localCache = this.getCloudDatabase();
          const merged = { ...localCache, ...data };
          this.saveCloudDatabase(merged);
          return merged;
        }
      }
    } catch {
      // Hors-ligne ou environnement de test : fallback sur le cache local
    }
    return this.getCloudDatabase();
  },

  /**
   * Envoie la base Cloud vers le serveur central
   */
  async pushRemoteDatabase(data: Record<string, CloudShopData>): Promise<void> {
    this.saveCloudDatabase(data);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${getApiBaseUrl()}/api/cloud/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch {
      // Hors-ligne, synchronisé dès le retour du réseau
    }
  },

  /**
   * Récupère le jeton d'authentification de la boutique active
   */
  getAuthToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Sauvegarde le jeton d'authentification
   */
  setAuthToken(token: string): void {
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch (err) {
      console.error('Erreur stockage token auth:', err);
    }
  },

  /**
   * Supprime le jeton d'authentification
   */
  clearAuthToken(): void {
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {}
  },

  /**
   * Vérifie la validité d'un jeton d'authentification boutique
   */
  verifyAuthToken(token: string, shopId: string, phone: string): boolean {
    return verifyShopAuthToken(token, shopId, phone);
  },

  /**
   * Récupère la partition d'une boutique spécifique avec isolation multi-tenant
   */
  async fetchShopPartition(shopId: string, token?: string): Promise<CloudShopData | null> {
    try {
      const authToken = token || this.getAuthToken();
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${getApiBaseUrl()}/api/cloud/shops/${shopId}`, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.profile) return data;
      }
    } catch {
      // Fallback local
    }
    const fullDb = this.getCloudDatabase();
    return fullDb[shopId] || null;
  },

  /**
   * Sauvegarde la partition d'une boutique isolée
   */
  async pushShopPartition(shopId: string, data: CloudShopData, token?: string): Promise<void> {
    const fullDb = this.getCloudDatabase();
    fullDb[shopId] = data;
    this.saveCloudDatabase(fullDb);

    try {
      const authToken = token || this.getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${getApiBaseUrl()}/api/cloud/shops/${shopId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch {
      // Offline fallback
    }
  },

  /**
   * Récupère la base Cloud complète (Cache local instantané)
   */
  getCloudDatabase(): Record<string, CloudShopData> {
    try {
      const data = localStorage.getItem(CLOUD_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  /**
   * Sauvegarde la base Cloud complète dans le cache local
   */
  saveCloudDatabase(data: Record<string, CloudShopData>) {
    try {
      localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Erreur sauvegarde cloud cache:', err);
    }
  },

  /**
   * Normalise un numéro de téléphone (8 derniers chiffres)
   */
  normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-8);
  },

  /**
   * Authentifie et restaure toutes les données du commerce sur cet appareil
   */
  async loginAndRestore(phoneInput: string, pinInput: string): Promise<LoginResult> {
    const cleanInput = this.normalizePhone(phoneInput);
    const pin = pinInput.trim();

    if (!cleanInput || cleanInput.length < 8) {
      return { success: false, message: 'Veuillez saisir un numéro de téléphone valide à 8 chiffres.' };
    }

    if (!pin) {
      return { success: false, message: 'Veuillez saisir votre code PIN.' };
    }

    // 1. Vérification si connexion directe Super-Admin
    if (adminService.isAdminCredentials(phoneInput, pinInput)) {
      return { success: true, isAdmin: true };
    }

    // Récupérer la dernière version du Cloud
    const cloudDb = await this.fetchRemoteDatabase();
    
    // 2. Recherche dans la base Cloud
    let matchedShopData: CloudShopData | null = null;

    for (const shopId of Object.keys(cloudDb)) {
      const shopData = cloudDb[shopId];
      if (shopData && shopData.profile) {
        const p1 = this.normalizePhone(shopData.profile.phone);
        const p2 = shopData.profile.ownerPhone ? this.normalizePhone(shopData.profile.ownerPhone) : '';
        if (p1 === cleanInput || p2 === cleanInput) {
          matchedShopData = shopData;
          break;
        }
      }
    }

    // 3. Si non trouvé dans le Cloud, vérifier la base locale au cas où
    if (!matchedShopData) {
      const localShops = await db.shopProfiles.toArray();
      const localMatch = localShops.find(s => this.normalizePhone(s.phone) === cleanInput || (s.ownerPhone && this.normalizePhone(s.ownerPhone) === cleanInput));
      if (localMatch) {
        if (localMatch.pinCode && !verifyHash(pin, localMatch.pinCode)) {
          return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
        }
        // Migration transparente si l'ancien PIN n'était pas haché
        if (localMatch.pinCode && !isHashed(localMatch.pinCode)) {
          localMatch.pinCode = hashPin(pin);
          await db.shopProfiles.put(localMatch);
        }
        // Sauvegarder dans le Cloud pour les futurs appareils
        await this.pushLocalChanges(localMatch.id);
        return { success: true, shop: localMatch };
      }
      return { success: false, message: 'Aucun compte trouvé avec ce numéro. Vérifiez votre saisie ou créez votre espace.' };
    }

    // 4. Vérification du code PIN commerçant
    if (matchedShopData.profile.pinCode && !verifyHash(pin, matchedShopData.profile.pinCode)) {
      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    }

    // Migration transparente vers PIN haché si nécessaire
    if (matchedShopData.profile.pinCode && !isHashed(matchedShopData.profile.pinCode)) {
      matchedShopData.profile.pinCode = hashPin(pin);
    }

    // Génération et persistance du token d'authentification boutique
    const authToken = generateShopAuthToken(matchedShopData.profile.id, matchedShopData.profile.phone);
    this.setAuthToken(authToken);

    // Restauration complète et isolation de l'appareil
    await this.restoreToLocalDatabase(matchedShopData);

    return { success: true, shop: matchedShopData.profile, token: authToken };
  },

  /**
   * Crée un nouveau commerce sur le Cloud et initialise l'appareil
   */
  async registerShop(data: Omit<ShopProfile, 'id' | 'createdAt' | 'updatedAt' | 'isConfigured'>): Promise<ShopProfile> {
    const telemetry = collectCurrentTelemetry(data.phone, data.city);
    const hashedPin = data.pinCode?.trim()
      ? (isHashed(data.pinCode) ? data.pinCode.trim() : hashPin(data.pinCode.trim()))
      : undefined;

    const newShop: ShopProfile = {
      id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      ownerName: data.ownerName?.trim(),
      ownerPhone: data.ownerPhone?.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      city: data.city?.trim() || undefined,
      currency: 'FCFA',
      isConfigured: true,
      orangeMoneyNumber: data.orangeMoneyNumber?.trim(),
      moovMoneyNumber: data.moovMoneyNumber?.trim(),
      waveNumber: data.waveNumber?.trim(),
      pinCode: hashedPin,
      subscriptionPlan: 'trial',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      telemetry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Vider les anciennes données locales de l'appareil
    await this.clearLocalData();

    // Enregistrer en local
    await db.shopProfiles.put(newShop);

    // Générer et enregistrer le jeton d'authentification
    const authToken = generateShopAuthToken(newShop.id, newShop.phone);
    this.setAuthToken(authToken);

    // Initialiser et synchroniser sur le Cloud
    const shopPartition: CloudShopData = {
      profile: newShop,
      products: [],
      customers: [],
      debts: [],
      debtPayments: [],
      sales: [],
      licenses: [],
      telemetry,
      lastUpdatedAt: new Date().toISOString()
    };
    await this.pushShopPartition(newShop.id, shopPartition, authToken);

    return newShop;
  },

  /**
   * Envoie toutes les données locales vers le Cloud
   */
  async pushLocalChanges(shopId: string) {
    const shop = await db.shopProfiles.get(shopId);
    if (!shop) return;

    const [products, customers, debts, debtPayments, sales, licenses] = await Promise.all([
      db.products.toArray(),
      db.customers.toArray(),
      db.debts.toArray(),
      db.debtPayments.toArray(),
      db.sales.toArray(),
      db.licenses.toArray()
    ]);

    const telemetry = collectCurrentTelemetry(shop.phone, shop.city);
    shop.telemetry = telemetry;
    await db.shopProfiles.put(shop);

    const partition: CloudShopData = {
      profile: shop,
      products,
      customers,
      debts,
      debtPayments,
      sales,
      licenses,
      telemetry,
      lastUpdatedAt: new Date().toISOString()
    };
    await this.pushShopPartition(shopId, partition);
  },

  /**
   * Récupère le message d'annonce broadcast actif pour les commerçants
   */
  async getBroadcastMessage(): Promise<AdminBroadcastMessage | null> {
    try {
      const cloudDb = await this.fetchRemoteDatabase();
      const broadcastData = (cloudDb as any)['_admin_broadcast']?.broadcast;
      if (broadcastData && broadcastData.isActive) {
        localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(broadcastData));
        return broadcastData;
      }
      const saved = localStorage.getItem(BROADCAST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isActive) return parsed;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  /**
   * Sauvegarde un message d'annonce broadcast (Action Admin)
   */
  async setBroadcastMessage(message: AdminBroadcastMessage | null): Promise<void> {
    const cloudDb = await this.fetchRemoteDatabase();
    if (message) {
      (cloudDb as any)['_admin_broadcast'] = {
        broadcast: message,
        lastUpdatedAt: new Date().toISOString()
      };
      localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(message));
    } else {
      delete (cloudDb as any)['_admin_broadcast'];
      localStorage.removeItem(BROADCAST_STORAGE_KEY);
    }
    await this.pushRemoteDatabase(cloudDb);
  },

  /**
   * Récupère les données distantes du Cloud et les fusionne en local avec isolation multi-tenant
   */
  async pullRemoteChanges(shopId: string) {
    const remoteData = await this.fetchShopPartition(shopId);
    if (!remoteData) return;

    await db.transaction('rw', [db.shopProfiles, db.products, db.customers, db.debts, db.debtPayments, db.sales, db.licenses], async () => {
      if (remoteData.profile) await db.shopProfiles.put(remoteData.profile);
      if (remoteData.products?.length) await db.products.bulkPut(remoteData.products);
      if (remoteData.customers?.length) await db.customers.bulkPut(remoteData.customers);
      if (remoteData.debts?.length) await db.debts.bulkPut(remoteData.debts);
      if (remoteData.debtPayments?.length) await db.debtPayments.bulkPut(remoteData.debtPayments);
      if (remoteData.sales?.length) await db.sales.bulkPut(remoteData.sales);
      if (remoteData.licenses?.length) await db.licenses.bulkPut(remoteData.licenses);
    });
  },

  /**
   * Restaure toutes les données d'un commerce dans la base locale
   */
  async restoreToLocalDatabase(shopData: CloudShopData) {
    await this.clearLocalData();

    await db.transaction('rw', [db.shopProfiles, db.products, db.customers, db.debts, db.debtPayments, db.sales, db.licenses], async () => {
      await db.shopProfiles.put(shopData.profile);
      if (shopData.products?.length) await db.products.bulkPut(shopData.products);
      if (shopData.customers?.length) await db.customers.bulkPut(shopData.customers);
      if (shopData.debts?.length) await db.debts.bulkPut(shopData.debts);
      if (shopData.debtPayments?.length) await db.debtPayments.bulkPut(shopData.debtPayments);
      if (shopData.sales?.length) await db.sales.bulkPut(shopData.sales);
      if (shopData.licenses?.length) await db.licenses.bulkPut(shopData.licenses);
    });
  },

  /**
   * Synchronise bidirectionnellement (Push + Pull)
   */
  async syncNow(shopId: string): Promise<string> {
    await this.pushLocalChanges(shopId);
    await this.pullRemoteChanges(shopId);
    return new Date().toISOString();
  },

  /**
   * Réinitialise les données locales sur l'appareil (Déconnexion propre)
   */
  async clearLocalData() {
    this.clearAuthToken();
    await Promise.all([
      db.shopProfiles.clear(),
      db.products.clear(),
      db.customers.clear(),
      db.debts.clear(),
      db.debtPayments.clear(),
      db.sales.clear(),
      db.licenses.clear()
    ]);
  }
};
