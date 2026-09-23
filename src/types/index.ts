export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE' | 'CREDIT';

export interface ShopProfile {
  id: string;
  name: string;
  ownerName?: string;
  ownerPhone?: string; // Numéro WhatsApp du propriétaire/patron pour les rapports du soir
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  currency: string; // 'FCFA'
  isConfigured: boolean;
  pinCode?: string; // Code PIN à 4 chiffres
  orangeMoneyNumber?: string;
  moovMoneyNumber?: string;
  waveNumber?: string;
  subscriptionPlan?: 'trial' | 'monthly' | 'semi-annual' | 'annual';
  subscriptionStatus?: 'trial' | 'active' | 'grace' | 'expired';
  subscriptionExpiresAt?: string; // ISO string date d'expiration
  licenseKey?: string;
  isSuspended?: boolean; // Verrouillage / Suspension à distance
  suspendedReason?: string;
  telemetry?: DeviceTelemetry;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  shopId?: string;
  name: string;
  phone: string;
  notes?: string;
  totalDebt: number; // Solde total dû actuel
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  shopId?: string;
  name: string;
  price: number;
  barcode?: string;
  category?: string;
  stockQuantity?: number; // Quantité en stock disponible (si indéfini, stock non géré / illimité)
  minStockAlert?: number; // Seuil d'alerte de stock faible (par défaut 5)
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  shopId?: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items?: SaleItem[];
  receivedAmount?: number;
  changeAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface DebtRecord {
  id: string;
  shopId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleId?: string;
  initialAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  shopId?: string;
  debtId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE';
  notes?: string;
  createdAt: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalSales: number;
  cashSales: number;
  orangeMoneySales: number;
  moovMoneySales: number;
  waveSales: number;
  creditSales: number;
  salesCount: number;
  totalRecoveredDebts: number;
}

export interface LicenseKey {
  id: string;
  code: string;
  plan: 'monthly' | 'semi-annual' | 'annual';
  durationDays: number;
  price: number;
  isUsed: boolean;
  usedByShopId?: string;
  usedByShopName?: string;
  usedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

export interface DeviceTelemetry {
  deviceId: string;
  platform: 'android' | 'ios' | 'web_mobile' | 'desktop';
  appVersion: string;
  userAgent: string;
  installedAt: string;
  lastActiveAt: string;
  city?: string;
  operator?: 'ORANGE' | 'MOOV' | 'TELECEL' | 'OTHER';
}

export interface AdminBroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'alert';
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface ExtendedAdminAnalytics {
  totalInstalls: number;
  activeInstallsToday: number;
  activeInstallsThisWeek: number;
  totalNetworkSalesVolume: number;
  totalNetworkDebtsVolume: number;
  totalNetworkSalesCount: number;
  totalNetworkCustomersCount: number;
  platformStats: {
    android: number;
    ios: number;
    webMobile: number;
    desktop: number;
  };
  operatorStats: {
    orange: number;
    moov: number;
    telecel: number;
    other: number;
  };
  cityStats: { city: string; count: number }[];
}

export interface AdminDepositNumbers {
  orangeMoney: string;
  moovMoney: string;
  wave: string;
  merchantName?: string;
  updatedAt?: string;
}
