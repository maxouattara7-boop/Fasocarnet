import { DailySummary, Expense, Sale } from '../types';

export interface TimeSeriesPoint {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  net: number;
  salesCount: number;
}

export interface TopProductStat {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface ExpenseCategoryStat {
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface PaymentChannelSlice {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface PerformanceRatios {
  averageBasket: number;
  netMarginRate: number;
  grossMarginRate: number;
  expenseRatio: number;
  creditRate: number;
}

export interface TrendDelta {
  value: number; // percentage change, e.g. 12.5 or -8.3
  direction: 'up' | 'down' | 'flat';
  hasBaseline: boolean;
}

/**
 * Retourne la date ou le mois précédent au format YYYY-MM-DD ou YYYY-MM.
 */
export function getPreviousPeriod(period: 'day' | 'month', value: string): string {
  if (period === 'day') {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }
  const [yearStr, monthStr] = value.split('-');
  let year = Number(yearStr);
  let month = Number(monthStr) - 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calcule la variation en pourcentage entre la valeur courante et précédente.
 */
export function computeTrendDelta(current: number, previous: number): TrendDelta {
  if (previous <= 0 && current <= 0) {
    return { value: 0, direction: 'flat', hasBaseline: false };
  }
  if (previous <= 0) {
    return { value: 100, direction: 'up', hasBaseline: false };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return {
    value: rounded,
    direction: rounded > 0.5 ? 'up' : rounded < -0.5 ? 'down' : 'flat',
    hasBaseline: true,
  };
}

/**
 * Calcule les ratios financiers clés de la période.
 */
export function computePerformanceRatios(summary: DailySummary | null): PerformanceRatios {
  if (!summary) {
    return {
      averageBasket: 0,
      netMarginRate: 0,
      grossMarginRate: 0,
      expenseRatio: 0,
      creditRate: 0,
    };
  }

  const totalSales = summary.totalSales || 0;
  const salesCount = summary.salesCount || 0;
  const totalVolume = totalSales + (summary.creditSales || 0);

  return {
    averageBasket: salesCount > 0 ? Math.round(totalSales / salesCount) : 0,
    netMarginRate: totalSales > 0 ? Math.round(((summary.netProfit || 0) / totalSales) * 1000) / 10 : 0,
    grossMarginRate: totalSales > 0 ? Math.round(((summary.grossProfit || 0) / totalSales) * 1000) / 10 : 0,
    expenseRatio: totalSales > 0 ? Math.round(((summary.totalExpenses || 0) / totalSales) * 1000) / 10 : 0,
    creditRate: totalVolume > 0 ? Math.round(((summary.creditSales || 0) / totalVolume) * 1000) / 10 : 0,
  };
}

/**
 * Extrait le montant encaissé effectif d'une vente (hors crédit impayé et hors annulation).
 */
function getCollectedSaleAmount(sale: Sale): number {
  if (sale.isCancelled) return 0;
  if (sale.isPartialCredit) return sale.paidAmount || 0;
  if (sale.isCredit) return 0;
  return sale.totalAmount || 0;
}

/**
 * Construit la série temporelle (horaire en mode Jour, journalière en mode Mois)
 * pour comparer Encaissements vs Dépenses.
 */
export function buildTimeSeries(
  period: 'day' | 'month',
  dateOrMonth: string,
  sales: Sale[],
  expenses: Expense[]
): TimeSeriesPoint[] {
  if (period === 'day') {
    // Tranches horaires de 06h à 23h (ou 00h-23h si activité nocturne)
    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06..23
    const map = new Map<number, TimeSeriesPoint>();
    for (const h of hours) {
      const label = `${String(h).padStart(2, '0')}h`;
      map.set(h, { key: String(h), label, revenue: 0, expenses: 0, net: 0, salesCount: 0 });
    }

    for (const sale of sales) {
      if (sale.isCancelled) continue;
      const d = new Date(sale.createdAt);
      const h = d.getHours();
      const bucketHour = h < 6 ? 6 : h > 23 ? 23 : h;
      const point = map.get(bucketHour);
      if (point) {
        const amt = getCollectedSaleAmount(sale);
        point.revenue += amt;
        point.salesCount += 1;
      }
    }

    for (const exp of expenses) {
      const d = new Date(exp.createdAt);
      const h = d.getHours();
      const bucketHour = h < 6 ? 6 : h > 23 ? 23 : h;
      const point = map.get(bucketHour);
      if (point) {
        point.expenses += exp.amount || 0;
      }
    }

    return Array.from(map.values()).map((p) => ({ ...p, net: p.revenue - p.expenses }));
  }

  // Mode Mois : jours 1..lastDay
  const [year, month] = dateOrMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const map = new Map<number, TimeSeriesPoint>();

  for (let day = 1; day <= lastDay; day++) {
    map.set(day, {
      key: String(day),
      label: String(day).padStart(2, '0'),
      revenue: 0,
      expenses: 0,
      net: 0,
      salesCount: 0,
    });
  }

  for (const sale of sales) {
    if (sale.isCancelled) continue;
    const d = new Date(sale.createdAt);
    const day = d.getDate();
    const point = map.get(day);
    if (point) {
      point.revenue += getCollectedSaleAmount(sale);
      point.salesCount += 1;
    }
  }

  for (const exp of expenses) {
    const d = new Date(exp.createdAt);
    const day = d.getDate();
    const point = map.get(day);
    if (point) {
      point.expenses += exp.amount || 0;
    }
  }

  return Array.from(map.values()).map((p) => ({ ...p, net: p.revenue - p.expenses }));
}

/**
 * Calcule le Top N des articles les plus vendus sur la période (hors ventes annulées).
 */
export function computeTopProducts(sales: Sale[], limit = 5): TopProductStat[] {
  const map = new Map<string, TopProductStat>();

  for (const sale of sales) {
    if (sale.isCancelled || !sale.items?.length) continue;
    for (const item of sale.items) {
      const name = (item.description || 'Article').trim();
      const qty = item.quantity || 0;
      const revenue = qty * (item.unitPrice || 0);
      const cost = qty * (item.costPrice || 0);
      const profit = item.costPrice !== undefined ? revenue - cost : 0;

      const existing = map.get(name);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += revenue;
        existing.profit += profit;
      } else {
        map.set(name, { name, quantity: qty, revenue, profit });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit);
}

/**
 * Regroupe les dépenses par libellé / poste pour l'analyse de structure des coûts.
 */
export function computeExpenseBreakdown(expenses: Expense[], limit = 5): ExpenseCategoryStat[] {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  if (total <= 0) return [];

  const map = new Map<string, { amount: number; count: number }>();
  for (const exp of expenses) {
    const label = (exp.title || 'Autre dépense').trim();
    const existing = map.get(label);
    if (existing) {
      existing.amount += exp.amount || 0;
      existing.count += 1;
    } else {
      map.set(label, { amount: exp.amount || 0, count: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([label, data]) => ({
      label,
      amount: data.amount,
      count: data.count,
      percentage: Math.round((data.amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Construit les tranches du Donut Chart des moyens de paiement.
 */
export function buildPaymentSlices(summary: DailySummary | null): PaymentChannelSlice[] {
  if (!summary) return [];
  const raw = [
    { id: 'CASH', label: 'Espèces', amount: summary.cashSales || 0, color: '#059669' },
    { id: 'ORANGE_MONEY', label: 'Orange Money', amount: summary.orangeMoneySales || 0, color: '#ff6600' },
    { id: 'MOOV_MONEY', label: 'Moov Money', amount: summary.moovMoneySales || 0, color: '#005baa' },
    { id: 'WAVE', label: 'Wave', amount: summary.waveSales || 0, color: '#1dc4fe' },
    { id: 'CREDIT', label: 'Crédit accordé', amount: summary.creditSales || 0, color: '#d97706' },
  ];

  const total = raw.reduce((s, r) => s + r.amount, 0);
  if (total <= 0) return [];

  return raw
    .filter((r) => r.amount > 0)
    .map((r) => ({
      ...r,
      percentage: Math.round((r.amount / total) * 1000) / 10,
    }));
}
