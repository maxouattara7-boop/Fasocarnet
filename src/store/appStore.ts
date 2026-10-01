import { create } from 'zustand';
import { ShopProfile, TeamLeaderAccount } from '../types';
import { db } from '../db/db';
import { syncService, LoginResult } from '../db/services/syncService';
import { verifyHash, hashPin, isHashed } from '../utils/crypto';

export type ActiveTab = 'pos' | 'debts' | 'reports' | 'invoices' | 'settings';

const getInitialActiveTab = (): ActiveTab => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fasocarnet_active_tab');
    if (saved === 'pos' || saved === 'debts' || saved === 'reports' || saved === 'invoices' || saved === 'settings') {
      return saved as ActiveTab;
    }
  }
  return 'pos';
};

const getInitialAdminOpen = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fasocarnet_is_admin_open') === 'true' || window.location.search.includes('admin=true');
  }
  return false;
};

const getInitialTeamLeader = (): TeamLeaderAccount | null => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('fasocarnet_active_team_leader');
      if (saved) return JSON.parse(saved);
    } catch {}
  }
  return null;
};

const getInitialMiniAdminOpen = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fasocarnet_is_mini_admin_open') === 'true';
  }
  return false;
};

interface AppState {
  isInitialized: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeShopId: string | null;
  shopProfile: ShopProfile | null;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  activeTeamLeader: TeamLeaderAccount | null;
  isMiniAdminOpen: boolean;
  setIsMiniAdminOpen: (open: boolean) => void;
  openMiniAdmin: (leader: TeamLeaderAccount) => void;
  logoutMiniAdmin: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingOfflineData: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  loadCurrentShop: () => Promise<void>;
  loginWithPhoneAndPin: (phone: string, pin: string) => Promise<LoginResult>;
  createShop: (data: Omit<ShopProfile, 'id' | 'createdAt' | 'updatedAt' | 'isConfigured'>) => Promise<ShopProfile>;
  updateShopProfile: (updates: Partial<ShopProfile>) => Promise<void>;
  syncNow: () => Promise<void>;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  verifyPin: (pin: string) => boolean;
  setPin: (pin: string) => Promise<void>;
  isLandingOpen: boolean;
  setIsLandingOpen: (open: boolean) => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  // Détecter l'état du réseau au lancement
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      set({ isOnline: true });
      // Dès que la connexion revient, pousser TOUTES les données locales vers Supabase
      // (données sauvegardées hors-ligne en attente de synchronisation)
      const state = get();
      const shopProfile = state.shopProfile;
      if (shopProfile) {
        set({ isSyncing: true });
        try {
          await syncService.pushLocalChanges(shopProfile.id);
          await syncService.pullRemoteChanges(shopProfile.id);
          // Effacer le flag "données en attente"
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('fasocarnet_pending_offline_data');
          }
          set({ isSyncing: false, syncError: null, hasPendingOfflineData: false, lastSyncedAt: new Date().toISOString() });
        } catch {
          set({ isSyncing: false });
        }
      }
    });
    window.addEventListener('offline', () => {
      set({ isOnline: false });
    });
    window.addEventListener('fasocarnet_pending_offline_data_changed', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      set({ hasPendingOfflineData: !!detail?.pending });
    });
    window.addEventListener('fasocarnet_account_deleted', () => {
      syncService.stopAutoRealtimeSync();
      set({
        activeShopId: null,
        shopProfile: null,
        activeTeamLeader: null,
        isMiniAdminOpen: false,
        isLocked: false,
        activeTab: 'pos',
        lastSyncedAt: null,
        syncError: null,
        isInitialized: true
      });
    });
  }

  return {
    isInitialized: false,
    activeTab: getInitialActiveTab(),
    setActiveTab: (tab) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fasocarnet_active_tab', tab);
      }
      set({ activeTab: tab });
    },
    activeShopId: null,
    shopProfile: null,
    isAdminOpen: getInitialAdminOpen(),
    setIsAdminOpen: (open) => {
      if (typeof window !== 'undefined') {
        if (open) localStorage.setItem('fasocarnet_is_admin_open', 'true');
        else localStorage.removeItem('fasocarnet_is_admin_open');
      }
      set({ isAdminOpen: open });
    },
    activeTeamLeader: getInitialTeamLeader(),
    isMiniAdminOpen: getInitialMiniAdminOpen(),
    setIsMiniAdminOpen: (open) => {
      if (typeof window !== 'undefined') {
        if (open) localStorage.setItem('fasocarnet_is_mini_admin_open', 'true');
        else localStorage.removeItem('fasocarnet_is_mini_admin_open');
      }
      set({ isMiniAdminOpen: open });
    },
    openMiniAdmin: (leader) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fasocarnet_active_team_leader', JSON.stringify(leader));
        localStorage.setItem('fasocarnet_is_mini_admin_open', 'true');
        localStorage.removeItem('fasocarnet_is_admin_open');
      }
      set({
        activeTeamLeader: leader,
        isMiniAdminOpen: true,
        isAdminOpen: false,
        activeShopId: null,
        shopProfile: null
      });
    },
    logoutMiniAdmin: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fasocarnet_active_team_leader');
        localStorage.removeItem('fasocarnet_is_mini_admin_open');
      }
      set({
        activeTeamLeader: null,
        isMiniAdminOpen: false
      });
    },
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    hasPendingOfflineData: typeof window !== 'undefined'
      ? localStorage.getItem('fasocarnet_pending_offline_data') === 'true'
      : false,
    lastSyncedAt: null,
    syncError: null,
    isLocked: false,

    loadCurrentShop: async () => {
      // Si une session Super-Admin ou Chef d'Équipe est déjà ouverte, ne pas charger de boutique commerçante
      if (get().isAdminOpen || (get().isMiniAdminOpen && get().activeTeamLeader)) {
        set({ activeShopId: null, shopProfile: null, isLocked: false, isInitialized: true });
        return;
      }

      // Sur cet appareil, charger l'unique profil existant
      const shop = await db.shopProfiles.toCollection().first();
      if (shop) {
        // RÈGLE STRICTE : AUCUNE CONNEXION SI LE COMPTE N'EXISTE PAS SUR LE CLOUD
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const remoteShop = await syncService.fetchShopPartition(shop.id);
            if (!remoteShop) {
              // Le compte a été supprimé sur le Cloud : purge locale immédiate et affichage écran connexion
              console.warn('[App] Compte supprimé ou inexistant sur le Cloud, purge locale stricte:', shop.id);
              await syncService.handleShopDeletedLocally(shop.id);
              set({ activeShopId: null, shopProfile: null, isLocked: false, isInitialized: true });
              return;
            }
          } catch {
            // Hors-ligne ou erreur réseau : accès temporaire toléré
          }
        }

        set({
          activeShopId: shop.id,
          shopProfile: shop,
          isLocked: false,
          isInitialized: true
        });
        // Démarrer la synchronisation continue temps-réel (Téléphone ⇄ PC)
        syncService.startAutoRealtimeSync(shop.id);
        // Tenter une synchronisation initiale
        get().syncNow();
      } else {
        set({ activeShopId: null, shopProfile: null, isLocked: false, isInitialized: true });
      }
    },

    loginWithPhoneAndPin: async (inputPhone: string, inputPin: string) => {
      set({ isSyncing: true, syncError: null });
      try {
        const res = await syncService.loginAndRestore(inputPhone, inputPin);
        if (res.success) {
          if (res.isAdmin) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('fasocarnet_is_admin_open', 'true');
              localStorage.removeItem('fasocarnet_is_mini_admin_open');
              localStorage.removeItem('fasocarnet_active_team_leader');
            }
            set({ isAdminOpen: true, isMiniAdminOpen: false, activeTeamLeader: null, activeShopId: null, shopProfile: null, isSyncing: false, isInitialized: true });
            return res;
          }
          if (res.teamLeader) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('fasocarnet_active_team_leader', JSON.stringify(res.teamLeader));
              localStorage.setItem('fasocarnet_is_mini_admin_open', 'true');
              localStorage.removeItem('fasocarnet_is_admin_open');
            }
            set({
              activeTeamLeader: res.teamLeader,
              isMiniAdminOpen: true,
              isAdminOpen: false,
              activeShopId: null,
              shopProfile: null,
              isSyncing: false,
              isInitialized: true
            });
            return res;
          }
          if (res.shop) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('fasocarnet_is_admin_open');
              localStorage.removeItem('fasocarnet_is_mini_admin_open');
              localStorage.removeItem('fasocarnet_active_team_leader');
            }
            set({
              activeShopId: res.shop.id,
              shopProfile: res.shop,
              isMiniAdminOpen: false,
              activeTeamLeader: null,
              isLocked: false,
              isInitialized: true,
              lastSyncedAt: new Date().toISOString()
            });
            syncService.startAutoRealtimeSync(res.shop.id);
          }
        }
        return res;
      } catch (err: any) {
        return { success: false, message: err.message || 'Erreur lors de la connexion.' };
      } finally {
        set({ isSyncing: false });
      }
    },

    createShop: async (data) => {
      set({ isSyncing: true, syncError: null });
      try {
        const newShop = await syncService.registerShop(data);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fasocarnet_is_admin_open');
        }
        set({
          activeShopId: newShop.id,
          shopProfile: newShop,
          isLocked: false,
          isInitialized: true,
          lastSyncedAt: new Date().toISOString()
        });
        syncService.startAutoRealtimeSync(newShop.id);
        return newShop;
      } finally {
        set({ isSyncing: false });
      }
    },

    updateShopProfile: async (updates) => {
      const current = get().shopProfile;
      if (!current) return;
      const updated: ShopProfile = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await db.shopProfiles.put(updated);
      set({ shopProfile: updated });
      // Synchroniser avec le Cloud
      await syncService.pushLocalChanges(updated.id);
    },

    syncNow: async () => {
      const current = get().shopProfile;
      if (!current) return;
      set({ isSyncing: true, syncError: null });
      try {
        const timestamp = await syncService.syncNow(current.id);
        const refreshed = await db.shopProfiles.get(current.id);
        set({
          lastSyncedAt: timestamp,
          shopProfile: refreshed || current
        });
      } catch (err: any) {
        console.warn('Sync en attente (hors-ligne ou erreur temporaire):', err);
        set({ syncError: 'Hors-ligne' });
      } finally {
        set({ isSyncing: false });
      }
    },

    setIsLocked: (locked) => set({ isLocked: locked }),

    verifyPin: (pin: string) => {
      const current = get().shopProfile;
      if (!current || !current.pinCode) return true;
      return verifyHash(pin, current.pinCode);
    },

    setPin: async (pin: string) => {
      const hashed = pin.trim() ? (isHashed(pin) ? pin.trim() : hashPin(pin.trim())) : undefined;
      await get().updateShopProfile({ pinCode: hashed });
    },

    isLandingOpen: false,
    setIsLandingOpen: (open) => set({ isLandingOpen: open }),

    logout: async () => {
      // Vider les données locales de l'appareil et stopper la synchronisation temps-réel
      syncService.stopAutoRealtimeSync();
      await syncService.clearLocalData();

      if (typeof window !== 'undefined') {
        localStorage.removeItem('fasocarnet_active_tab');
        localStorage.removeItem('fasocarnet_is_admin_open');
        localStorage.removeItem('fasocarnet_is_mini_admin_open');
        localStorage.removeItem('fasocarnet_active_team_leader');
        localStorage.removeItem('fasocarnet_settings_tab');
        localStorage.removeItem('fasocarnet_admin_tab');
        localStorage.removeItem('fasocarnet_web_app_opened');
      }

      set({
        activeShopId: null,
        shopProfile: null,
        activeTeamLeader: null,
        isMiniAdminOpen: false,
        isLocked: false,
        activeTab: 'pos',
        lastSyncedAt: null,
        syncError: null
      });
    }
  };
});
