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
    const envUrl = isTest ? '' : ((import.meta as any).env?.VITE_SUPABASE_URL || 'https://ofbqqzmatttztbhtjban.supabase.co');
    const envKey = isTest ? '' : ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnFxem1hdHR0enRiaHRqYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTIwNjYsImV4cCI6MjEwNTU2ODA2Nn0.bI6wxI9rw-rhauKhFTb2yHIEu2eXwh8F8mTcr2ZiuYI');

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
      // Normaliser les numéros de téléphone (8 derniers chiffres) pour garantir la fiabilité des recherches ILIKE
      const normalizePhoneCol = (p: string | undefined | null) =>
        p ? p.replace(/\D/g, '').slice(-8) : null;
      const { error } = await client
        .from('shops')
        .upsert({
          id: profile.id,
          name: profile.name,
          phone: normalizePhoneCol(profile.phone) || profile.phone || '',
          owner_name: profile.ownerName || null,
          owner_phone: normalizePhoneCol(profile.ownerPhone),
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
   * Recherche si une boutique existe déjà par numéro de téléphone dans Supabase
   */
  async findShopByPhone(phone: string): Promise<CloudShopData | null> {
    const client = this.getClient();
    if (!client) return null;

    const clean = phone.replace(/\D/g, '').slice(-8);
    if (!clean || clean.length < 8) return null;

    try {
      // Recherche 1 : numéro normalisé (les nouvelles lignes sont stockées sans espaces)
      const { data: data1, error: err1 } = await client
        .from('shops')
        .select('data')
        .or(`phone.ilike.%${clean}%,owner_phone.ilike.%${clean}%`)
        .limit(1);

      if (!err1 && data1 && data1.length > 0) {
        return (data1[0].data as CloudShopData) || null;
      }

      // Recherche 2 : pattern souple pour les anciens numéros stockés avec espaces (+226 65 61 61 34)
      // On insère un % entre chaque chiffre pour tolérer n'importe quel séparateur
      const spacedPattern = `%${clean.split('').join('%')}%`;
      const { data: data2, error: err2 } = await client
        .from('shops')
        .select('data')
        .or(`phone.ilike.${spacedPattern},owner_phone.ilike.${spacedPattern}`)
        .limit(1);

      if (!err2 && data2 && data2.length > 0) {
        return (data2[0].data as CloudShopData) || null;
      }

      return null;
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
  },

  /**
   * Récupère la dernière version de l'application depuis Supabase (instantané sans cache CDN)
   */
  async fetchAppVersion(): Promise<any | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('broadcasts')
        .select('message')
        .eq('id', 'app_version')
        .single();

      if (error || !data) return null;
      return data.message || null;
    } catch {
      return null;
    }
  },

  /**
   * Publie la dernière version sur Supabase
   */
  async pushAppVersion(versionInfo: any): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('broadcasts')
        .upsert({
          id: 'app_version',
          message: versionInfo,
          updated_at: new Date().toISOString()
        });
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Récupère le coffre-fort administrateur (Chefs d'Équipe, Équipes, Commerciaux) depuis Supabase
   */
  async fetchAdminVault(): Promise<{ teamLeaders?: any[]; commercialTeams?: any[]; commercialAgents?: any[] } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('broadcasts')
        .select('message')
        .eq('id', 'admin_vault')
        .single();

      if (error || !data) return null;
      return (data.message as any) || null;
    } catch {
      return null;
    }
  },

  /**
   * Synchronise le coffre-fort administrateur vers Supabase
   */
  async pushAdminVault(vaultData: { teamLeaders?: any[]; commercialTeams?: any[]; commercialAgents?: any[] }): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('broadcasts')
        .upsert({
          id: 'admin_vault',
          message: vaultData,
          updated_at: new Date().toISOString()
        });
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Abonne l'appareil aux modifications en temps réel de sa boutique (Multi-appareils Téléphone ⇄ PC)
   */
  /**
   * Diffuse un signal de synchronisation instantané aux autres appareils connectés sur le même compte
   */
  async broadcastShopChange(shopId: string): Promise<void> {
    const client = this.getClient();
    if (!client || !shopId) return;

    try {
      const channelName = `shop_realtime_${shopId}`;
      const channel = client.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'shop_sync',
        payload: { shopId, timestamp: Date.now() }
      });
    } catch {
      // Silencieux si échec d'envoi broadcast
    }
  },

  /**
   * Diffuse un signal instantané de suppression définitive de compte aux appareils connectés
   */
  async broadcastShopDeleted(shopId: string): Promise<void> {
    const client = this.getClient();
    if (!client || !shopId) return;

    try {
      const channelName = `shop_realtime_${shopId}`;
      const channel = client.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'shop_deleted',
        payload: { shopId, timestamp: Date.now() }
      });
    } catch {
      // Silencieux si échec d'envoi broadcast
    }
  },

  /**
   * Supprime une boutique de Supabase et notifie immédiatement tous les appareils
   */
  async deleteShop(shopId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      // Émettre le signal de suppression avant la destruction en base
      await this.broadcastShopDeleted(shopId);

      const { error } = await client
        .from('shops')
        .delete()
        .eq('id', shopId);

      return !error;
    } catch {
      return false;
    }
  },

  /**
   * S'abonne aux changements temps réel d'une boutique (Postgres changes + WebSockets)
   */
  subscribeToShopChanges(
    shopId: string, 
    onRemoteChange: () => void,
    onShopDeleted?: () => void
  ): (() => void) {
    const client = this.getClient();
    if (!client || !shopId) return () => {};

    try {
      const channelName = `shop_realtime_${shopId}`;
      const channel = client.channel(channelName);

      // 1. Écoute des mutations directes sur la table shops de Supabase
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
          filter: `id=eq.${shopId}`
        },
        (payload: any) => {
          if (payload?.eventType === 'DELETE') {
            if (onShopDeleted) onShopDeleted();
            else onRemoteChange();
          } else {
            onRemoteChange();
          }
        }
      );

      // 2. Écoute des messages de diffusion instantanée WebSocket
      channel.on(
        'broadcast',
        { event: 'shop_sync' },
        () => {
          onRemoteChange();
        }
      );

      // 3. Écoute du signal de suppression de compte
      channel.on(
        'broadcast',
        { event: 'shop_deleted' },
        () => {
          if (onShopDeleted) onShopDeleted();
          else onRemoteChange();
        }
      );

      channel.subscribe();

      return () => {
        try {
          client.removeChannel(channel);
        } catch {}
      };
    } catch (err) {
      console.warn('[Supabase Realtime] Erreur abonnement canal:', err);
      return () => {};
    }
  }
};

