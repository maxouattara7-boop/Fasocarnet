import { db } from '../db';
import { Expense, ExpenseCategory } from '../../types';

export interface CreateExpenseDTO {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE';
  notes?: string;
  createdAt?: string;
}

export interface ExpensesSummary {
  totalExpenses: number;
  cashExpenses: number;
  orangeMoneyExpenses: number;
  moovMoneyExpenses: number;
  waveExpenses: number;
  count: number;
  byCategory: Record<ExpenseCategory, number>;
}

export const expensesService = {
  /**
   * Enregistre une nouvelle dépense / sortie de caisse
   */
  async create(data: CreateExpenseDTO): Promise<Expense> {
    const expense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      amount: Math.abs(data.amount),
      category: data.category,
      paymentMethod: data.paymentMethod,
      notes: data.notes?.trim() || undefined,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.expenses.put(expense);
    return expense;
  },

  /**
   * Récupère toutes les dépenses enregistrées
   */
  async getAll(): Promise<Expense[]> {
    return await db.expenses.orderBy('createdAt').reverse().toArray();
  },

  /**
   * Récupère les dépenses d'une date précise (YYYY-MM-DD)
   */
  async getByDate(dateString: string): Promise<Expense[]> {
    const startOfDay = `${dateString}T00:00:00.000Z`;
    const endOfDay = `${dateString}T23:59:59.999Z`;

    const list = await db.expenses
      .where('createdAt')
      .between(startOfDay, endOfDay, true, true)
      .toArray();

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Récupère les dépenses d'un mois précis (YYYY-MM)
   */
  async getByMonth(monthString: string): Promise<Expense[]> {
    const [year, month] = monthString.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const startOfMonth = `${monthString}-01T00:00:00.000Z`;
    const endOfMonth = `${monthString}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const list = await db.expenses
      .where('createdAt')
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Calcule le résumé des dépenses pour une liste donnée
   */
  computeSummary(expenses: Expense[]): ExpensesSummary {
    const summary: ExpensesSummary = {
      totalExpenses: 0,
      cashExpenses: 0,
      orangeMoneyExpenses: 0,
      moovMoneyExpenses: 0,
      waveExpenses: 0,
      count: expenses.length,
      byCategory: {
        STOCK: 0,
        TRANSPORT: 0,
        UTILITIES: 0,
        FOOD: 0,
        SALARY: 0,
        OWNER_DRAW: 0,
        OTHER: 0
      }
    };

    for (const exp of expenses) {
      summary.totalExpenses += exp.amount;
      if (exp.paymentMethod === 'CASH') summary.cashExpenses += exp.amount;
      if (exp.paymentMethod === 'ORANGE_MONEY') summary.orangeMoneyExpenses += exp.amount;
      if (exp.paymentMethod === 'MOOV_MONEY') summary.moovMoneyExpenses += exp.amount;
      if (exp.paymentMethod === 'WAVE') summary.waveExpenses += exp.amount;

      if (summary.byCategory[exp.category] !== undefined) {
        summary.byCategory[exp.category] += exp.amount;
      } else {
        summary.byCategory.OTHER += exp.amount;
      }
    }

    return summary;
  },

  /**
   * Supprime une dépense
   */
  async delete(id: string): Promise<void> {
    await db.expenses.delete(id);
  }
};
