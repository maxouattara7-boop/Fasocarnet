/**
 * Service d'intégration de la passerelle de paiement SasPay (Burkina Faso & UEMOA)
 * Compatible Orange Money BF, Moov Money BF, Wave et Cartes Bancaires.
 * Documentation officielle : https://docs.saspay.me/
 */

import { ShopProfile } from '../../types';
import { SubscriptionPlan } from './subscriptionService';

export const DEFAULT_SASPAY_API_KEY = 'sk_live_vdGAFS2yW-eHEJc-mM8tuvdByunepYKBr-7vIjvmo1s';
export const SASPAY_API_BASE_URL = 'https://api.saspay.me/api/v1';

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
   * Crée une session de checkout SasPay hébergée pour le renouvellement d'abonnement
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
        : 'https://fasocarnet.com'
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

    const res = await fetch(`${SASPAY_API_BASE_URL}/checkout-sessions/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.success) {
      const errDetail = data?.error
        ? (typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error))
        : data?.message || `Erreur HTTP ${res.status}`;
      throw new Error(`Échec de création de la session SasPay : ${errDetail}`);
    }

    const sessionData = data.data || {};
    return {
      success: true,
      sessionId: sessionData.id,
      checkoutUrl: sessionData.checkout_url,
      slug: sessionData.slug,
      amount: plan.price,
      currency: sessionData.currency || 'XOF',
      status: sessionData.status || 'PENDING'
    };
  },

  /**
   * Vérifie le statut d'une session de checkout SasPay
   */
  async checkCheckoutStatus(sessionId: string): Promise<SasPayStatusResult> {
    if (!sessionId) {
      return { sessionId, status: 'UNKNOWN', isPaid: false };
    }

    const apiKey = this.getApiKey();

    try {
      // 1. Essai sur l'endpoint dédié au statut
      const res = await fetch(`${SASPAY_API_BASE_URL}/checkout-sessions/${sessionId}/status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
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

      // 2. Fallback sur le détail complet de la session
      const detailRes = await fetch(`${SASPAY_API_BASE_URL}/checkout-sessions/${sessionId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        if (detailData && detailData.success && detailData.data) {
          const rawStatus = (detailData.data.status || '').toUpperCase();
          const isPaid = rawStatus === 'SUCCESS' || rawStatus === 'PAID';
          return {
            sessionId,
            status: isPaid ? 'SUCCESS' : rawStatus as any,
            isPaid,
            transactionId: detailData.data.transaction?.id || undefined
          };
        }
      }

      return { sessionId, status: 'PENDING', isPaid: false };
    } catch (e: any) {
      console.warn('[SasPayService] Erreur vérification statut session :', e);
      return { sessionId, status: 'PENDING', isPaid: false, errorMessage: e?.message };
    }
  }
};
