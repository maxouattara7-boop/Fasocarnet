import { create } from 'zustand';
import { ShopProfile } from '../types';
import { db } from '../db/db';
import { syncService, LoginResult } from '../db/services/syncService';
import { verifyHash, hashPin, isHashed } from '../utils/crypto';

export type ActiveTab = 'pos' | 'debts' | 'reports' | 'settings';

const getInitialActiveTab = (): ActiveTab => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fasocarnet_active_tab');
    if (saved === 'pos' || saved === 'debts' || saved === 'reports' || saved === 'settings') {
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

interface AppState {
  isInitialized: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeShopId: string | null;
  shopProfile: ShopProfile | null;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isOnline: boolean;
  isSyncing: boolean;
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
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  // Détecter l'état du réseau au lancement
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      set({ isOnline: true });
      get().syncNow();
    });
    window.addEventListener('offline', () => {
      set({ isOnline: false });
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
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
    isLocked: false,

    loadCurrentShop: async () => {
      // Sur cet appareil, charger l'unique profil existant
      const shop = await db.shopProfiles.toCollection().first();
      if (shop) {
        set({
          activeShopId: shop.id,
          shopProfile: shop,
          isLocked: false,
          isInitialized: true
        });
        // Tenter une synchronisation automatique en arrière-plan
        get().syncNow();
      } else {
        set({
          activeShopId: null,
          shopProfile: null,
          isLocked: false,
          isInitialized: true
        });
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
            }
            set({ isAdminOpen: true, isSyncing: false, isInitialized: true });
            return res;
          }
          if (res.shop) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('fasocarnet_is_admin_open');
            }
            set({
              activeShopId: res.shop.id,
              shopProfile: res.shop,
              isLocked: false,
              isInitialized: true,
              lastSyncedAt: new Date().toISOString()
            });
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

    logout: async () => {
      // Synchroniser une dernière fois si possible
      const current = get().shopProfile;
      if (current) {
        try {
          await syncService.pushLocalChanges(current.id);
        } catch {
          // Hors-ligne, on continue
        }
      }

      // Vider les données locales de l'appareil
      await syncService.clearLocalData();

      if (typeof window !== 'undefined') {
        localStorage.removeItem('fasocarnet_active_tab');
        localStorage.removeItem('fasocarnet_is_admin_open');
        localStorage.removeItem('fasocarnet_settings_tab');
        localStorage.removeItem('fasocarnet_admin_tab');
      }

      set({
        activeShopId: null,
        shopProfile: null,
        isLocked: false,
        activeTab: 'pos',
        lastSyncedAt: null,
        syncError: null
      });
    }
  };
});
