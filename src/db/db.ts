import Dexie, { Table } from 'dexie';
import { Customer, DebtPayment, DebtRecord, Product, Sale, ShopProfile, LicenseKey } from '../types';

export class FasoCarnetDB extends Dexie {
  shopProfiles!: Table<ShopProfile, string>;
  customers!: Table<Customer, string>;
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  debts!: Table<DebtRecord, string>;
  debtPayments!: Table<DebtPayment, string>;
  licenses!: Table<LicenseKey, string>;

  constructor() {
    super('FasoCarnetDB');
    this.version(3).stores({
      shopProfiles: 'id',
      customers: 'id, name, phone, totalDebt',
      products: 'id, name, price, createdAt',
      sales: 'id, paymentMethod, isCredit, customerId, createdAt',
      debts: 'id, customerId, status, createdAt',
      debtPayments: 'id, debtId, customerId, createdAt',
      licenses: 'id, code, plan, isUsed, createdAt'
    });
  }
}

export const db = new FasoCarnetDB();

export async function initializeShopProfile(): Promise<ShopProfile> {
  const existing = await db.shopProfiles.toCollection().first();
  if (existing) {
    return existing;
  }
  const defaultProfile: ShopProfile = {
    id: 'default_shop',
    name: '',
    ownerName: '',
    phone: '',
    currency: 'FCFA',
    isConfigured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await db.shopProfiles.put(defaultProfile);
  return defaultProfile;
}
