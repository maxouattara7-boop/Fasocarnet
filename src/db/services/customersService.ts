import { db } from '../db';
import { Customer } from '../../types';

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

  async create(data: Omit<Customer, 'id' | 'totalDebt' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      notes: data.notes?.trim(),
      totalDebt: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.customers.put(newCustomer);
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
