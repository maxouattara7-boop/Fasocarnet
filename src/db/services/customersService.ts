import { db } from '../db';
import { Customer, DebtRecord } from '../../types';

export const customersService = {
  async getAll(): Promise<Customer[]> {
    return await db.customers.toArray();
  },

  async getById(id: string): Promise<Customer | undefined> {
    return await db.customers.get(id);
  },

  async search(query: string): Promise<Customer[]> {
    const q = query.toLowerCase().trim();
    if (!q) return await this.getAll();
    return await db.customers
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .toArray();
  },

  async create(data: { name: string; phone: string; initialDebt?: number; notes?: string }): Promise<Customer> {
    const cleanPhone = data.phone.trim();
    const cleanName = data.name.trim();
    const initialDebt = Math.max(0, Number(data.initialDebt) || 0);

    // Vérifier si un client existe déjà avec ce numéro de téléphone
    const allCustomers = await db.customers.toArray();
    const existing = allCustomers.find(c => c.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));

    if (existing) {
      const updatedDebt = (existing.totalDebt || 0) + initialDebt;
      const updatedCustomer: Customer = {
        ...existing,
        name: cleanName || existing.name,
        notes: data.notes?.trim() || existing.notes,
        totalDebt: updatedDebt,
        updatedAt: new Date().toISOString()
      };
      await db.customers.put(updatedCustomer);

      if (initialDebt > 0) {
        const debtRecord: DebtRecord = {
          id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          customerId: existing.id,
          customerName: updatedCustomer.name,
          customerPhone: updatedCustomer.phone,
          initialAmount: initialDebt,
          remainingAmount: initialDebt,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.debts.put(debtRecord);
      }

      return updatedCustomer;
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      phone: cleanPhone,
      notes: data.notes?.trim() || undefined,
      totalDebt: initialDebt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.customers.put(newCustomer);

    if (initialDebt > 0) {
      const debtRecord: DebtRecord = {
        id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        customerPhone: newCustomer.phone,
        initialAmount: initialDebt,
        remainingAmount: initialDebt,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.debts.put(debtRecord);
    }

    return newCustomer;
  },

  async updateDebt(customerId: string, deltaAmount: number): Promise<Customer> {
    const customer = await db.customers.get(customerId);
    if (!customer) throw new Error(`Client non trouvé : ${customerId}`);
    const updatedDebt = Math.max(0, (customer.totalDebt || 0) + deltaAmount);
    const updatedCustomer: Customer = {
      ...customer,
      totalDebt: updatedDebt,
      updatedAt: new Date().toISOString()
    };
    await db.customers.put(updatedCustomer);
    return updatedCustomer;
  }
};
