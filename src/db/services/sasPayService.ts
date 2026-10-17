/**
 * Service d'intégration de la passerelle de paiement SasPay (Burkina Faso & UEMOA)
 * Compatible Orange Money BF, Moov Money BF, Wave et Cartes Bancaires.
 * Documentation officielle : https://docs.saspay.me/
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ShopProfile } from '../../types';
import { SubscriptionPlan } from './subscriptionService';

export const DEFAULT_SASPAY_API_KEY = 'sk_live_vdGAFS2yW-eHEJc-mM8tuvdByunepYKBr-7vIjvmo1s';
export const SASPAY_API_BASE_URL = 'https://api.saspay.me/api/v1';

/**
 * Liens de paiement hébergés officiels créés sur SasPay (Burkina Faso - XOF)
 * Garantit un accès 100% fonctionnel et sans AUCUN blocage CORS, même sur les hébergements statiques.
 */
export const SASPAY_PERMANENT_PAYMENT_LINKS: Record<string, string> = {
  monthly: 'https://link.saspay.me/ztx0-32fdti',
  quarterly: 'https://link.saspay.me/vig_agwlv0a',
  'semi-annual': 'https://link.saspay.me/hnlhrvnxku0',
  annual: 'https://link.saspay.me/daha7rcbsic'
};

export interface SasPayCheckoutResult {
  success: boolean;
  sessionId: string;
  checkoutUrl: string;
  slug?: string;
  amount: number;
  currency: string;
  status: string;
  errorMessage?: string;
}

export interface SasPayStatusResult {
  sessionId: string;
  status: 'PENDING' | 'SUCCESS' | 'PAID' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
  isPaid: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export const sasPayService = {
  /**
   * Récupère la clé API SasPay (depuis le stockage local, les variables d'environnement ou la clé par défaut)
   */
  getApiKey(): string {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const customKey = localStorage.getItem('fasocarnet_saspay_api_key');
      if (customKey && customKey.trim().startsWith('sk_')) {
        return customKey.trim();
      }
    }
    const envKey = (import.meta as any).env?.VITE_SASPAY_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim().startsWith('sk_')) {
      return envKey.trim();
    }
    return DEFAULT_SASPAY_API_KEY;
  },

  /**
   * Enregistre une clé API personnalisée (ex: mise à jour par l'administrateur)
   */
  setApiKey(key: string): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem('fasocarnet_saspay_api_key', key.trim());
      } else {
        localStorage.removeItem('fasocarnet_saspay_api_key');
      }
    }
  },

  /**
   * Crée ou résout une session de checkout SasPay hébergée pour le renouvellement d'abonnement.
   * Architecture résiliente à 3 niveaux :
   * 1. Mobile Natif Android/iOS via CapacitorHttp (hors bac à sable WebView, sans restriction CORS).
   * 2. Proxy local / serverless (/api/saspay/checkout-sessions/).
   * 3. Liens de paiement hébergés SasPay dédiés par formule (100% infaillibles sur le Web, zéro blocage CORS).
   */
  async createCheckoutSession(
    shop: ShopProfile,
    plan: SubscriptionPlan,
    returnUrl?: string
  ): Promise<SasPayCheckoutResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Clé API SasPay non configurée.');
    }

    // Préparer un email valide pour SasPay (requis par l'API)
    const cleanPhone = (shop.phone || '00000000').replace(/\D/g, '');
    const customerEmail = `client_${cleanPhone || shop.id.slice(-6)}@fasocarnet.com`;
    const customerName = shop.ownerName || shop.name || 'Commerçant FasoCarnet';

    const effectiveReturnUrl = returnUrl || (
      typeof window !== 'undefined'
        ? `${window.location.origin}/?payment=success&shopId=${shop.id}&planId=${plan.id}`
        : `https://fasocarnet.onrender.com/?payment=success&shopId=${shop.id}&planId=${plan.id}`
    );

    const payload = {
      amount: plan.price.toFixed(2),
      currency: 'XOF',
      description: `Abonnement FasoCarnet ${plan.name} - ${shop.name || shop.id}`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: shop.phone || undefined,
      return_url: effectiveReturnUrl,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        planId: plan.id,
        durationMonths: plan.durationMonths,
        timestamp: Date.now()
      }
    };

    // 1. Sur Mobile Natif Android/iOS : Utilisation de CapacitorHttp (appel natif SANS aucune restriction CORS)
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeRes = await CapacitorHttp.post({
          url: `${SASPAY_API_BASE_URL}/checkout-sessions/`,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: payload
        });

        const data = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
        if (nativeRes.status >= 200 && nativeRes.status < 300 && data && data.success && data.data) {
          const s = data.data;
          return {
            success: true,
            sessionId: s.id,
            checkoutUrl: s.checkout_url,
            slug: s.slug,
            amount: plan.price,
            currency: s.currency || 'XOF',
            status: s.status || 'PENDING'
          };
        }
      } catch (nativeErr: any) {
        console.warn('[SasPayService] Échec appel natif CapacitorHttp, bascule vers lien direct :', nativeErr);
      }
    }

    // 2. Sur le Web : Essai du proxy local (/api/saspay/checkout-sessions/)
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/saspay/checkout-sessions/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          let data = null;
          try {
            data = typeof res.json === 'function' ? await res.json() : JSON.parse(await res.text());
          } catch {}

          if (data && data.success && data.data) {
            const s = data.data;
            return {
              success: true,
              sessionId: s.id,
              checkoutUrl: s.checkout_url,
              slug: s.slug,
              amount: plan.price,
              currency: s.currency || 'XOF',
              status: s.status || 'PENDING'
            };
          }
        }
      } catch (proxyErr: any) {
        console.warn('[SasPayService] Proxy indisponible sur cet environnement :', proxyErr);
      }
    }

    // 3. Solution Universelle & Infaillible : Lien de Paiement Officiel SasPay dédié
    // Évite tout blocage CORS du navigateur web et ouvre immédiatement la passerelle hébergée SasPay
    const fallbackLink = SASPAY_PERMANENT_PAYMENT_LINKS[plan.id] || SASPAY_PERMANENT_PAYMENT_LINKS['monthly'];
    if (fallbackLink) {
      return {
        success: true,
        sessionId: `link_${plan.id}_${Date.now()}`,
        checkoutUrl: fallbackLink,
        amount: plan.price,
        currency: 'XOF',
        status: 'PENDING'
      };
    }

    throw new Error('Impossible d\'initialiser le paiement SasPay.');
  },

  /**
   * Vérifie le statut d'une session de checkout SasPay
   */
  async checkCheckoutStatus(sessionId: string): Promise<SasPayStatusResult> {
    if (!sessionId) {
      return { sessionId, status: 'UNKNOWN', isPaid: false };
    }

    // Les sessions basées sur les liens de paiement permanents restent strictement en attente
    // Aucune activation n'est permise tant que le paiement n'est pas formellement confirmé
    if (sessionId.startsWith('link_')) {
      return { sessionId, status: 'PENDING', isPaid: false };
    }

    const apiKey = this.getApiKey();

    // 1. Mobile Natif Android/iOS via CapacitorHttp
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeRes = await CapacitorHttp.get({
          url: `${SASPAY_API_BASE_URL}/checkout-sessions/${sessionId}/status/`,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        const data = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
        if (nativeRes.status >= 200 && nativeRes.status < 300 && data && data.success && data.data) {
          const rawStatus = (data.data.status || '').toUpperCase();
          const isPaid = rawStatus === 'SUCCESS' || rawStatus === 'PAID';
          return {
            sessionId,
            status: isPaid ? 'SUCCESS' : rawStatus as any,
            isPaid,
            transactionId: data.data.transaction_id || undefined
          };
        }
      } catch (nativeErr) {
        console.warn('[SasPayService] Échec vérification statut natif :', nativeErr);
      }
    }

    // 2. Web : Proxy /api/saspay
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/saspay/checkout-sessions/${sessionId}/status/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          let data = null;
          try {
            data = typeof res.json === 'function' ? await res.json() : JSON.parse(await res.text());
          } catch {}

          if (data && data.success && data.data) {
            const rawStatus = (data.data.status || '').toUpperCase();
            const isPaid = rawStatus === 'SUCCESS' || rawStatus === 'PAID';
            return {
              sessionId,
              status: isPaid ? 'SUCCESS' : rawStatus as any,
              isPaid,
              transactionId: data.data.transaction_id || undefined
            };
          }
        }
      } catch {}
    }

    return { sessionId, status: 'PENDING', isPaid: false };
  }
};
