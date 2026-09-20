import { db } from '../db';
import { ShopProfile, LicenseKey } from '../../types';
import { syncService } from './syncService';

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
  statusLabel: string;
  daysRemaining: number;
  expiresAt: string;
  formattedExpiresAt: string;
  planName: string;
  isTrial: boolean;
  isExpired: boolean;
  isGrace: boolean;
  canUseApp: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  number: string;
  merchantName: string;
  color: string;
  badgeBg: string;
}

export const OFFICIAL_PAYMENT_CHANNELS: PaymentMethodConfig[] = [
  {
    id: 'orange',
    name: 'Orange Money',
    number: '72990310',
    merchantName: 'FasoCarnet Service',
    color: '#ff6600',
    badgeBg: 'bg-orange-500/10 text-orange-600 border-orange-200'
  },
  {
    id: 'moov',
    name: 'Moov Money',
    number: '72990310',
    merchantName: 'FasoCarnet Service',
    color: '#005baa',
    badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-200'
  },
  {
    id: 'wave',
    name: 'Wave',
    number: '72990310',
    merchantName: 'FasoCarnet Service',
    color: '#1dc4fe',
    badgeBg: 'bg-sky-500/10 text-sky-600 border-sky-200'
  }
];

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
    } else if (key.includes('1AN') || key.includes('YEAR') || key.includes('365')) {
      addedDays = 365;
      plan = 'annual';
    } else if (key.includes('6M') || key.includes('180')) {
      addedDays = 180;
      plan = 'semi-annual';
    } else if (key.startsWith('FASO-') || key.startsWith('PROMO-') || key.length >= 8) {
      addedDays = 30;
      plan = 'monthly';
    } else {
      return { 
        success: false, 
        message: 'Code invalide. Format attendu : FASO-XXXX-XXXX ou code officiel.' 
      };
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
  }
};