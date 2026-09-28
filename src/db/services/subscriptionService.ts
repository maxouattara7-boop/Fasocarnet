import { db } from '../db';
import { ShopProfile, LicenseKey, AdminDepositNumbers } from '../../types';
import { syncService } from './syncService';
import { verifyLicenseSignature } from '../../utils/crypto';
import { getApiBaseUrl } from '../../utils/apiConfig';

export interface SubscriptionPlan {
  id: 'monthly' | 'semi-annual' | 'annual';
  name: string;
  durationMonths: number;
  price: number;
  discountText?: string;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: '1 Mois (Mensuel)',
    durationMonths: 1,
    price: 2000,
    discountText: 'Sans engagement'
  },
  {
    id: 'semi-annual',
    name: '6 Mois (Semestriel)',
    durationMonths: 6,
    price: 10000,
    discountText: '1 Mois Offert (Éco. 2 000 F)',
    popular: true
  },
  {
    id: 'annual',
    name: '1 An (Annuel)',
    durationMonths: 12,
    price: 20000,
    discountText: '2 Mois Offerts (Éco. 4 000 F)'
  }
];

export interface SubscriptionInfo {
  status: 'trial' | 'active' | 'grace' | 'expired';
  daysRemaining: number;
  isExpired: boolean;
  statusLabel: string;
  badgeBg?: string;
  badgeText?: string;
  expiresAt: string;
  formattedExpiresAt: string;
  planName?: string;
  isTrial?: boolean;
  isGrace?: boolean;
  canUseApp?: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  number: string;
  merchantName: string;
  color: string;
  badgeBg: string;
}

export const DEFAULT_DEPOSIT_NUMBERS: AdminDepositNumbers = {
  orangeMoney: '72990310',
  moovMoney: '03901590',
  wave: '72990310',
  merchantName: 'Maxime OUATTARA'
};

export const getStoredDepositNumbers = (): AdminDepositNumbers => {
  if (typeof window === 'undefined') return DEFAULT_DEPOSIT_NUMBERS;
  try {
    const raw = localStorage.getItem('fasocarnet_admin_deposit_numbers');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        orangeMoney: parsed.orangeMoney || DEFAULT_DEPOSIT_NUMBERS.orangeMoney,
        moovMoney: parsed.moovMoney || DEFAULT_DEPOSIT_NUMBERS.moovMoney,
        wave: parsed.wave || DEFAULT_DEPOSIT_NUMBERS.wave,
        merchantName: parsed.merchantName || DEFAULT_DEPOSIT_NUMBERS.merchantName,
        updatedAt: parsed.updatedAt
      };
    }
  } catch (e) {
    console.warn('Erreur lecture numéros de dépôt', e);
  }
  return DEFAULT_DEPOSIT_NUMBERS;
};

export const getPaymentChannels = (depositNumbers?: AdminDepositNumbers): PaymentMethodConfig[] => {
  const current = depositNumbers || getStoredDepositNumbers();
  return [
    {
      id: 'orange',
      name: 'Orange Money',
      number: current.orangeMoney,
      merchantName: current.merchantName || 'FasoCarnet Service',
      color: '#ff6600',
      badgeBg: 'bg-orange-500/10 text-orange-600 border-orange-200'
    },
    {
      id: 'moov',
      name: 'Moov Money',
      number: current.moovMoney,
      merchantName: current.merchantName || 'FasoCarnet Service',
      color: '#005baa',
      badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-200'
    },
    {
      id: 'wave',
      name: 'Wave',
      number: current.wave,
      merchantName: current.merchantName || 'FasoCarnet Service',
      color: '#1dc4fe',
      badgeBg: 'bg-sky-500/10 text-sky-600 border-sky-200'
    }
  ];
};

export const OFFICIAL_PAYMENT_CHANNELS: PaymentMethodConfig[] = getPaymentChannels();

export const subscriptionService = {
  getSubscriptionInfo(profile?: ShopProfile | null): SubscriptionInfo {
    const now = new Date();
    const createdDate = profile?.createdAt ? new Date(profile.createdAt) : new Date();
    // Période d'essai de 10 jours
    const defaultTrialExpiresAt = new Date(createdDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    
    const expiresAt = profile?.subscriptionExpiresAt || defaultTrialExpiresAt;
    const expiryDate = new Date(expiresAt);
    
    const diffMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    const isTrial = !profile?.subscriptionPlan || profile.subscriptionPlan === 'trial';
    
    let status: 'trial' | 'active' | 'grace' | 'expired' = 'active';
    let statusLabel = 'Abonnement Actif';
    let isExpired = false;
    let isGrace = false;
    let canUseApp = true;

    if (daysRemaining > 0) {
      if (isTrial) {
        status = 'trial';
        statusLabel = `Essai Gratuit (${daysRemaining}j restants)`;
      } else {
        status = 'active';
        statusLabel = `Abonnement Actif (${daysRemaining}j restants)`;
      }
    } else if (daysRemaining >= -3) {
      status = 'grace';
      statusLabel = 'Période de Grâce (Renouvellement urgent)';
      isGrace = true;
      canUseApp = true;
    } else {
      status = 'expired';
      statusLabel = 'Abonnement Expiré';
      isExpired = true;
      canUseApp = true;
    }

    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    const formattedExpiresAt = isNaN(expiryDate.getTime()) 
      ? 'Indéterminé' 
      : expiryDate.toLocaleDateString('fr-FR', options);

    let planName = 'Essai Gratuit 10 Jours';
    if (profile?.subscriptionPlan === 'monthly') planName = 'Formule 1 Mois (2 000 FCFA)';
    else if (profile?.subscriptionPlan === 'semi-annual') planName = 'Formule 6 Mois (10 000 FCFA)';
    else if (profile?.subscriptionPlan === 'annual') planName = 'Formule 1 An (20 000 FCFA)';

    return {
      status,
      statusLabel,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt,
      formattedExpiresAt,
      planName,
      isTrial,
      isExpired,
      isGrace,
      canUseApp
    };
  },

  isPremiumActive(profile?: ShopProfile | null): boolean {
    if (!profile) return false;
    const info = this.getSubscriptionInfo(profile);
    return (info.status === 'active' || info.status === 'trial') && info.daysRemaining > 0;
  },

  canAccessFeature(
    feature: 'pos' | 'debts' | 'reports' | 'catalog' | 'subscription' | 'payments' | 'shop',
    profile?: ShopProfile | null
  ): boolean {
    if (
      feature === 'pos' ||
      feature === 'debts' ||
      feature === 'subscription' ||
      feature === 'payments' ||
      feature === 'shop'
    ) {
      return true;
    }
    return this.isPremiumActive(profile);
  },

  getWhatsAppPaymentConfirmationUrl(plan: SubscriptionPlan, shopName?: string, shopPhone?: string): string {
    const text = `🌟 *Paiement Abonnement FasoCarnet* 🌟\n\n` +
      `Bonjour FasoCarnet ! 🇧🇫\n` +
      `Je viens d'effectuer le paiement pour ma boutique :\n\n` +
      `🏪 *Commerce* : ${shopName || 'Mon Commerce'}\n` +
      `📱 *Téléphone* : ${shopPhone || ''}\n` +
      `⭐ *Formule* : ${plan.name} (${plan.price.toLocaleString('fr-FR')} FCFA)\n\n` +
      `Merci de m'envoyer ma clé de licence d'activation !`;
    return `https://wa.me/22672990310?text=${encodeURIComponent(text)}`;
  },

  async renewPlan(shopId: string, planId: 'monthly' | 'semi-annual' | 'annual'): Promise<ShopProfile> {
    const shop = await db.shopProfiles.get(shopId);
    if (!shop) throw new Error('Boutique introuvable');

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
    const currentExpiry = shop.subscriptionExpiresAt ? new Date(shop.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);

    const updated: ShopProfile = {
      ...shop,
      subscriptionPlan: plan.id,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: newExpiry.toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.shopProfiles.put(updated);
    return updated;
  },

  async activateLicenseKey(shopId: string, rawKey: string): Promise<{ success: boolean; message: string; shop?: ShopProfile }> {
    const key = rawKey.trim().toUpperCase();
    if (!key) {
      return { success: false, message: 'Veuillez saisir un code de licence valide.' };
    }

    const shop = await db.shopProfiles.get(shopId);
    if (!shop) {
      return { success: false, message: 'Boutique introuvable.' };
    }

    // 1. Récupérer l'état le plus récent de la base Cloud / Réseau
    const cloudDb = await syncService.fetchRemoteDatabase();

    // 2. Rechercher la clé de licence dans le cloud ou en local
    let matchedLicense: LicenseKey | undefined;

    for (const shopData of Object.values(cloudDb)) {
      if (shopData.licenses && shopData.licenses.length) {
        const found = shopData.licenses.find(l => l.code.trim().toUpperCase() === key);
        if (found) {
          matchedLicense = found;
          break;
        }
      }
    }

    if (!matchedLicense) {
      matchedLicense = await db.licenses.where('code').equalsIgnoreCase(key).first();
    }

    let addedDays = 30;
    let plan: 'monthly' | 'semi-annual' | 'annual' = 'monthly';

    if (matchedLicense) {
      if (matchedLicense.isUsed) {
        const usedBy = matchedLicense.usedByShopName ? ` (utilisée par « ${matchedLicense.usedByShopName} »)` : '';
        return { 
          success: false, 
          message: `Cette clé de licence a déjà été utilisée${usedBy}.` 
        };
      }

      addedDays = matchedLicense.durationDays;
      plan = matchedLicense.plan;

      const nowIso = new Date().toISOString();
      const updatedLicense: LicenseKey = {
        ...matchedLicense,
        isUsed: true,
        usedByShopId: shop.id,
        usedByShopName: shop.name,
        usedAt: nowIso
      };

      // Mettre à jour en local
      await db.licenses.put(updatedLicense);

      // Mettre à jour dans tous les conteneurs Cloud
      let cloudUpdated = false;
      Object.values(cloudDb).forEach(shopData => {
        if (shopData.licenses && shopData.licenses.length) {
          const hasKey = shopData.licenses.some(l => l.code.trim().toUpperCase() === key);
          if (hasKey) {
            shopData.licenses = shopData.licenses.map(l => 
              l.code.trim().toUpperCase() === key ? updatedLicense : l
            );
            shopData.lastUpdatedAt = nowIso;
            cloudUpdated = true;
          }
        }
      });

      if (!cloudUpdated) {
        const defaultShopKey = 'default_shop';
        if (cloudDb[defaultShopKey]) {
          if (!cloudDb[defaultShopKey].licenses) cloudDb[defaultShopKey].licenses = [];
          cloudDb[defaultShopKey].licenses.push(updatedLicense);
          cloudDb[defaultShopKey].lastUpdatedAt = nowIso;
        }
      }
    } else {
      // Vérification cryptographique de la signature officielle HMAC
      const sigResult = verifyLicenseSignature(key);
      if (!sigResult.isValid || !sigResult.plan || !sigResult.durationDays) {
        return { 
          success: false, 
          message: 'Clé de licence invalide ou signature non reconnue. Seules les clés officielles délivrées par FasoCarnet sont acceptées.' 
        };
      }

      addedDays = sigResult.durationDays;
      plan = sigResult.plan;

      const nowIso = new Date().toISOString();
      const planPrice = plan === 'annual' ? 20000 : (plan === 'semi-annual' ? 10000 : 2000);
      const newLicenseRecord: LicenseKey = {
        id: 'lic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        code: key,
        plan: plan,
        durationDays: addedDays,
        price: planPrice,
        createdAt: nowIso,
        isUsed: true,
        usedByShopId: shop.id,
        usedByShopName: shop.name,
        usedAt: nowIso
      };

      await db.licenses.put(newLicenseRecord);

      if (cloudDb[shop.id]) {
        if (!cloudDb[shop.id].licenses) cloudDb[shop.id].licenses = [];
        cloudDb[shop.id].licenses.push(newLicenseRecord);
        cloudDb[shop.id].lastUpdatedAt = nowIso;
      }
    }

    const currentExpiry = shop.subscriptionExpiresAt ? new Date(shop.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + addedDays * 24 * 60 * 60 * 1000);

    const updated: ShopProfile = {
      ...shop,
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: newExpiry.toISOString(),
      licenseKey: key,
      updatedAt: new Date().toISOString()
    };

    await db.shopProfiles.put(updated);

    // Mettre à jour la boutique dans le cloud
    if (cloudDb[shop.id]) {
      cloudDb[shop.id].profile = updated;
      cloudDb[shop.id].lastUpdatedAt = new Date().toISOString();
    }
    await syncService.pushRemoteDatabase(cloudDb);

    return {
      success: true,
      message: `Licence activée avec succès ! +${addedDays} jours ajoutés à votre abonnement.`,
      shop: updated
    };
  },

  getWhatsAppRenewalUrl(shop: ShopProfile, plan: SubscriptionPlan, supportPhone: string = '22670000000'): string {
    const text = 
      `*DEMANDE DE RENOUVELLEMENT FASOCARNET*\n` +
      `--------------------------------\n` +
      `🏪 *Boutique :* ${shop.name}\n` +
      `👤 *Responsable :* ${shop.ownerName || 'Gérant'}\n` +
      `📞 *Téléphone :* ${shop.phone}\n` +
      `📦 *Formule choisie :* ${plan.name} (${plan.price.toLocaleString('fr-FR')} FCFA)\n` +
      `🆔 *ID Boutique :* ${shop.id}\n\n` +
      `Je souhaite régler mon abonnement par Mobile Money (Orange Money / Moov Money / Wave). Merci de m'indiquer la procédure d'activation.`;

    const cleanPhone = supportPhone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  },

  /**
   * Initialise un paiement en ligne PayTech via le serveur
   */
  /**
   * Initialise un paiement en ligne PayTech (avec fallback direct transparent sur l'API PayTech)
   */
  async initiateOnlinePayment(
    shop: ShopProfile,
    plan: SubscriptionPlan,
    redirectUrls?: { successUrl?: string; cancelUrl?: string }
  ): Promise<{
    success: boolean;
    mode?: 'paytech_live' | 'sandbox_simulation';
    redirectUrl?: string;
    token?: string;
    refCommand: string;
    message?: string;
  }> {
    const refCommand = `fct_${shop.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const baseUrl = getApiBaseUrl();

    // 1. Tentative via le serveur Backend Cloud
    try {
      const res = await fetch(`${baseUrl}/api/payments/paytech/request-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopId: shop.id,
          planId: plan.id,
          shopName: shop.name,
          shopPhone: shop.phone,
          successRedirectUrl: redirectUrls?.successUrl,
          cancelRedirectUrl: redirectUrls?.cancelUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return data;
        }
      }
    } catch (serverErr) {
      console.warn('[SubscriptionService] Backend Cloud non joignable, bascule sur passerelle directe PayTech:', serverErr);
    }

    // 2. Fallback direct sécurisé sur l'API officielle PayTech
    try {
      const apiKey = (import.meta as any).env?.VITE_PAYTECH_API_KEY || '8697f52da95472d2a3d245d554de26fa4deba0b58a92f2b483891b6f9fa5dade';
      const apiSecret = (import.meta as any).env?.VITE_PAYTECH_API_SECRET || '0dbd188150697c49ed94359de034ecb8d9d1cdc898d0e541196a2838686d8925';
      const envMode = (import.meta as any).env?.VITE_PAYTECH_ENV || 'test';

      const payload = {
        item_name: `FasoCarnet - ${plan.name}`,
        item_price: plan.price,
        command_name: `Abonnement FasoCarnet ${plan.name} (${shop.name || shop.id})`,
        ref_command: refCommand,
        currency: 'XOF',
        env: envMode,
        ipn_url: 'https://paytech.sn',
        success_url: redirectUrls?.successUrl || (typeof window !== 'undefined' ? `${window.location.origin}/?payment=success&ref=${refCommand}` : 'https://paytech.sn'),
        cancel_url: redirectUrls?.cancelUrl || (typeof window !== 'undefined' ? `${window.location.origin}/?payment=cancel&ref=${refCommand}` : 'https://paytech.sn'),
        custom_field: JSON.stringify({
          shopId: shop.id,
          planId: plan.id,
          durationMonths: plan.durationMonths,
          refCommand
        })
      };

      const directRes = await fetch('https://paytech.sn/api/payment/request-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API_KEY': apiKey,
          'API_SECRET': apiSecret
        },
        body: JSON.stringify(payload)
      });

      const directData = await directRes.json();
      if (directData && (directData.success === 1 || directData.token)) {
        return {
          success: true,
          mode: 'paytech_live',
          redirectUrl: directData.redirect_url || directData.redirectUrl,
          token: directData.token,
          refCommand
        };
      } else {
        throw new Error(directData.message || directData.error || 'Réponse invalide de PayTech');
      }
    } catch (directErr: any) {
      console.error('[SubscriptionService] Échec appel direct PayTech:', directErr);
      // Mode simulation bac à sable en dernier recours
      return {
        success: true,
        mode: 'sandbox_simulation',
        refCommand,
        message: 'Passerelle en mode démonstration test.'
      };
    }
  },

  /**
   * Vérifie le statut d'un paiement en ligne
   */
  async checkPaymentStatus(refCommand: string): Promise<{
    status: 'PAID' | 'PENDING' | 'FAILED' | 'NOT_FOUND';
    shopId?: string;
    planId?: string;
    planName?: string;
    amount?: number;
    paidAt?: string;
    subscriptionExpiresAt?: string;
  }> {
    const baseUrl = getApiBaseUrl();

    try {
      const res = await fetch(`${baseUrl}/api/payments/status/${refCommand}`);
      if (!res.ok) {
        return { status: 'NOT_FOUND' };
      }
      return await res.json();
    } catch (e) {
      console.warn('[SubscriptionService] checkPaymentStatus error:', e);
      return { status: 'PENDING' };
    }
  },

  /**
   * Simule la validation d'un paiement (mode Bac à sable / Démo)
   */
  async simulatePaymentSuccess(refCommand: string): Promise<{
    success: boolean;
    status: string;
    message: string;
    subscriptionExpiresAt: string;
  }> {
    const baseUrl = getApiBaseUrl();

    const res = await fetch(`${baseUrl}/api/payments/paytech/simulate-payment-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refCommand })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Erreur lors de la validation simulée.');
    }
    return data;
  },

  /**
   * Applique l'activation automatique de l'abonnement dans IndexedDB et synchronise
   */
  async applyAutomaticSubscription(
    shop: ShopProfile,
    planId: 'monthly' | 'semi-annual' | 'annual',
    serverExpiresAt?: string
  ): Promise<{ success: boolean; shop: ShopProfile; message: string }> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
    let newExpiresIso = serverExpiresAt;

    if (!newExpiresIso) {
      const currentExpiry = shop.subscriptionExpiresAt ? new Date(shop.subscriptionExpiresAt) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime());
      newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);
      newExpiresIso = newExpiry.toISOString();
    }

    const updated: ShopProfile = {
      ...shop,
      subscriptionPlan: plan.id,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: newExpiresIso,
      updatedAt: new Date().toISOString()
    };

    await db.shopProfiles.put(updated);

    // Mettre à jour la boutique sur le cloud si possible
    try {
      const cloudDb = await syncService.fetchRemoteDatabase();
      if (cloudDb[shop.id]) {
        cloudDb[shop.id].profile = updated;
        cloudDb[shop.id].lastUpdatedAt = new Date().toISOString();
        await syncService.pushRemoteDatabase(cloudDb);
      }
    } catch (e) {
      console.warn('[SubscriptionService] Sync cloud après activation automatique:', e);
    }

    return {
      success: true,
      shop: updated,
      message: `🎉 Félicitations ! Votre formule « ${plan.name} » a été activée instantanément.`
    };
  }
};