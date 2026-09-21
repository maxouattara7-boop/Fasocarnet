import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CloudShopData } from './services/syncService';
import { AdminBroadcastMessage } from '../types';

const SUPABASE_URL_KEY = 'fasocarnet_supabase_url';
const SUPABASE_ANON_KEY = 'fasocarnet_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
}

let inMemoryCustomUrl: string | null = null;
let inMemoryCustomKey: string | null = null;

export const supabaseClient = {
  /**
   * Récupère la configuration Supabase active
   */
  getConfig(): SupabaseConfig {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedUrl = localStorage.getItem(SUPABASE_URL_KEY);
      const savedKey = localStorage.getItem(SUPABASE_ANON_KEY);
      if (savedUrl && savedKey) {
        return {
          url: savedUrl.trim(),
          anonKey: savedKey.trim(),
          isCustom: true
        };
      }
    } else if (inMemoryCustomUrl && inMemoryCustomKey) {
      return {
        url: inMemoryCustomUrl,
        anonKey: inMemoryCustomKey,
        isCustom: true
      };
    }

    const isTest = (import.meta as any).env?.MODE === 'test';
    const envUrl = isTest ? '' : ((import.meta as any).env?.VITE_SUPABASE_URL || '');
    const envKey = isTest ? '' : ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '');

    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      isCustom: false
    };
  },

  /**
   * Enregistre les identifiants de projet Supabase
   */
  setConfig(url: string, anonKey: string): void {
    const trimmedUrl = url.trim().replace(/\/+$/, '');
    const trimmedKey = anonKey.trim();

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (!trimmedUrl || !trimmedKey) {
        localStorage.removeItem(SUPABASE_URL_KEY);
        localStorage.removeItem(SUPABASE_ANON_KEY);
      } else {
        localStorage.setItem(SUPABASE_URL_KEY, trimmedUrl);
        localStorage.setItem(SUPABASE_ANON_KEY, trimmedKey);
      }
    }
    
    if (!trimmedUrl || !trimmedKey) {
      inMemoryCustomUrl = null;
      inMemoryCustomKey = null;
    } else {
      inMemoryCustomUrl = trimmedUrl;
      inMemoryCustomKey = trimmedKey;
    }

    cachedClient = null;
    lastClientKey = '';
  },

  /**
   * Vérifie si Supabase est configuré
   */
  isConfigured(): boolean {
    const { url, anonKey } = this.getConfig();
    return Boolean(url && anonKey && url.startsWith('http'));
  },

  /**
   * Obtient l'instance du client Supabase
   */
  getClient(): SupabaseClient | null {
    const { url, anonKey } = this.getConfig();
    if (!url || !anonKey) return null;

    const cacheId = `${url}_${anonKey}`;
    if (cachedClient && lastClientKey === cacheId) {
      return cachedClient;
    }

    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      lastClientKey = cacheId;
      return cachedClient;
    } catch (err) {
      console.error('[Supabase] Erreur création client:', err);
      return null;
    }
  },

  /**
   * Teste la connexion à la base Supabase et vérifie la table 'shops'
   */
  async testConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const activeConfig = this.getConfig();
    const url = customUrl !== undefined ? customUrl.trim() : activeConfig.url;
    const anonKey = customKey !== undefined ? customKey.trim() : activeConfig.anonKey;

    if (!url || !anonKey) {
      return { success: false, latencyMs: 0, message: 'Veuillez renseigner l\'URL du projet et la Clé Anon.' };
    }

    const startTime = performance.now();
    try {
      const client = createClient(url, anonKey, {
        auth: { persistSession: false }
      });

      const { error } = await client
        .from('shops')
        .select('id')
        .limit(1);

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            latencyMs,
            message: 'Connecté à Supabase, mais la table "shops" n\'existe pas encore. Exécutez le script SQL schema.sql dans Supabase.'
          };
        }
        return { success: false, latencyMs, message: `Erreur Supabase (${error.code}) : ${error.message}` };
      }

      return {
        success: true,
        latencyMs,
        message: 'Connexion Supabase PostgreSQL établie avec succès ! Table "shops" opérationnelle.'
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { success: false, latencyMs, message: `Échec de connexion : ${err.message || 'Serveur inaccessible'}` };
    }
  },

  /**
   * Envoie les données d'une boutique vers Supabase (Upsert)
   */
  async pushShop(shopData: CloudShopData): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const profile = shopData.profile;
      const { error } = await client
        .from('shops')
        .upsert({
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          owner_name: profile.ownerName || null,
          owner_phone: profile.ownerPhone || null,
          city: profile.city || null,
          pin_code: profile.pinCode || null,
          subscription_plan: profile.subscriptionPlan || 'trial',
          subscription_status: profile.subscriptionStatus || 'trial',
          subscription_expires_at: profile.subscriptionExpiresAt || null,
          data: shopData,
          telemetry: profile.telemetry || null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('[Supabase] Erreur pushShop:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] Erreur pushShop catch:', err);
      return false;
    }
  },

  /**
   * Récupère les données d'une boutique depuis Supabase
   */
  async fetchShop(shopId: string): Promise<CloudShopData | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('shops')
        .select('data')
        .eq('id', shopId)
        .single();

      if (error || !data) return null;
      return (data.data as CloudShopData) || null;
    } catch {
      return null;
    }
  },

  /**
   * Récupère toutes les boutiques depuis Supabase (Super-Admin)
   */
  async fetchAllShops(): Promise<Record<string, CloudShopData> | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('shops')
        .select('id, data');

      if (error || !data) return null;

      const result: Record<string, CloudShopData> = {};
      data.forEach(item => {
        if (item.data) {
          result[item.id] = item.data as CloudShopData;
        }
      });
      return result;
    } catch {
      return null;
    }
  },

  /**
   * Récupère l'annonce broadcast active
   */
  async fetchBroadcast(): Promise<AdminBroadcastMessage | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('broadcasts')
        .select('message')
        .eq('id', 'current_broadcast')
        .single();

      if (error || !data) return null;
      return (data.message as AdminBroadcastMessage) || null;
    } catch {
      return null;
    }
  },

  /**
   * Met à jour l'annonce broadcast active
   */
  async pushBroadcast(message: AdminBroadcastMessage | null): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      if (message) {
        const { error } = await client
          .from('broadcasts')
          .upsert({
            id: 'current_broadcast',
            message,
            updated_at: new Date().toISOString()
          });
        return !error;
      } else {
        const { error } = await client
          .from('broadcasts')
          .delete()
          .eq('id', 'current_broadcast');
        return !error;
      }
    } catch {
      return false;
    }
  }
};
