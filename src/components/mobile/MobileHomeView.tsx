import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { db } from '../../db/db';
import { Product, Sale } from '../../types';
import { formatCurrency, formatTime } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import {
  ShoppingCart,
  BookOpen,
  BarChart3,
  FileText,
  Package,
  Store,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Banknote,
  Clock,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Activity,
} from 'lucide-react';

interface DayBar {
  date: string;
  label: string;
  total: number;
  isToday: boolean;
}

export const MobileHomeView: React.FC = () => {
  const { shopProfile, setActiveTab, isOnline } = useAppStore();
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [yesterdayTotal, setYesterdayTotal] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [last7Days, setLast7Days] = useState<DayBar[]>([]);
  const [outstandingDebt, setOutstandingDebt] = useState(0);
  const [debtorsCount, setDebtorsCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<DayBar | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yesterdayStr = yest.toISOString().slice(0, 10);

        const [allSales, allExpenses, allCustomers, allProducts, allInvoices] = await Promise.all([
          db.sales.toArray(),
          db.expenses.toArray(),
          db.customers.toArray(),
          db.products.toArray(),
          db.customInvoices.toArray(),
        ]);

        const activeSales = allSales.filter((s) => !s.isCancelled);

        const todayFiltered = activeSales
          .filter((s) => s.createdAt && s.createdAt.slice(0, 10) === todayStr)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const yestSum = activeSales
          .filter((s) => s.createdAt && s.createdAt.slice(0, 10) === yesterdayStr)
          .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        const expToday = allExpenses
          .filter((e) => e.createdAt && e.createdAt.slice(0, 10) === todayStr)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        // Construire les 7 derniers jours
        const bars: DayBar[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().slice(0, 10);
          const dayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
            .format(d)
            .replace('.', '')
            .slice(0, 3);
          const dayTotal = activeSales
            .filter((s) => s.createdAt && s.createdAt.slice(0, 10) === dStr)
            .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
          bars.push({
            date: dStr,
            label: dayShort,
            total: dayTotal,
            isToday: i === 0,
          });
        }

        const debtors = allCustomers.filter((c) => (c.totalDebt || 0) > 0);
        const totalDebt = debtors.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

        const lowStock = allProducts.filter(
          (p) =>
            p.stockQuantity !== undefined &&
            p.stockQuantity <= (p.minStockAlert ?? 5)
        );

        if (isMounted) {
          setTodaySales(todayFiltered);
          setYesterdayTotal(yestSum);
          setTodayExpenses(expToday);
          setLast7Days(bars);
          setOutstandingDebt(totalDebt);
          setDebtorsCount(debtors.length);
          setLowStockProducts(lowStock);
          setTotalProductsCount(allProducts.length);
          setInvoicesCount(allInvoices.length);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erreur chargement données accueil:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    window.addEventListener('fasocarnet_database_updated', loadDashboardData);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('fasocarnet_database_updated', loadDashboardData);
    };
  }, []);

  const totalSalesAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const salesCount = todaySales.length;
  const cashToday = todaySales
    .filter((s) => !s.isCredit && s.paymentMethod === 'CASH')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const mobileToday = todaySales
    .filter(
      (s) =>
        !s.isCredit &&
        (s.paymentMethod === 'ORANGE_MONEY' ||
          s.paymentMethod === 'MOOV_MONEY' ||
          s.paymentMethod === 'WAVE')
    )
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const netToday = totalSalesAmount - todayExpenses;

  const vsYesterdayPct =
    yesterdayTotal > 0
      ? Math.round(((totalSalesAmount - yesterdayTotal) / yesterdayTotal) * 100)
      : null;

  const max7Days = Math.max(...last7Days.map((b) => b.total), 1);

  const handleTileClick = (
    tabId: 'pos' | 'debts' | 'reports' | 'invoices' | 'inventory' | 'settings'
  ) => {
    triggerHaptic(25);
    setActiveTab(tabId);
  };

  const getPaymentMethodBadge = (sale: Sale) => {
    if (sale.isCredit) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
          <Clock className="w-2.5 h-2.5" />
          <span>Crédit</span>
        </span>
      );
    }
    if (
      sale.paymentMethod === 'ORANGE_MONEY' ||
      sale.paymentMethod === 'MOOV_MONEY' ||
      sale.paymentMethod === 'WAVE'
    ) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
          <Smartphone className="w-2.5 h-2.5" />
          <span>Mobile Money</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
        <Banknote className="w-2.5 h-2.5" />
        <span>Espèces</span>
      </span>
    );
  };

  const todayDateFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="w-full max-w-lg md:max-w-6xl mx-auto px-3.5 md:px-6 pt-3 md:pt-6 pb-24 md:pb-12 space-y-4 md:space-y-6 animate-in fade-in duration-200">
      {/* 1. EN-TÊTE DE BIENVENUE DYNAMIQUE */}
      <div className="flex items-center justify-between pt-1 gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight font-display">
              Bonjour, {shopProfile?.ownerName || shopProfile?.name || 'Gérant'}
            </h2>
            <span
              className={`hidden md:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isOnline ? 'En direct' : 'Hors ligne'}</span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium capitalize">
            {todayDateFormatted}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => handleTileClick('reports')}
            className="hidden md:inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-extrabold shadow-2xs active:scale-98 transition-all cursor-pointer font-display"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Bilan &amp; Graphes</span>
          </button>

          <button
            type="button"
            onClick={() => handleTileClick('pos')}
            className="hidden md:inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer font-display"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Ouvrir la Caisse</span>
          </button>

          <button
            type="button"
            onClick={() => handleTileClick('settings')}
            className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            title="Paramètres de la boutique"
          >
            <Store className="w-5 h-5 text-emerald-700" />
          </button>
        </div>
      </div>

      {/* BLOC PRINCIPAL : CARTE HERO + GRILLE DES 6 TUILES DYNAMIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
        {/* 2. RÉSUMÉ DU JOUR + MINI-GRAPHE 7 JOURS */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 md:p-6 shadow-lg shadow-emerald-700/20 border border-emerald-500/30 flex flex-col justify-between">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-0 bottom-0 -translate-x-6 translate-y-6 w-28 h-28 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-emerald-50 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Résumé du jour</span>
              </span>
              <button
                type="button"
                onClick={() => handleTileClick('reports')}
                className="text-xs font-bold text-emerald-100 hover:text-white flex items-center space-x-0.5 cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors"
              >
                <span>Détails</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-0.5">
              <p className="text-xs text-emerald-100/90 font-medium">Ventes réalisées</p>
              <div className="flex items-baseline gap-2.5 flex-wrap mt-0.5">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight text-white font-display">
                  {formatCurrency(totalSalesAmount)}
                </h3>
                {vsYesterdayPct !== null && (
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-black ${
                      vsYesterdayPct >= 0
                        ? 'bg-emerald-400/25 text-emerald-50'
                        : 'bg-rose-400/25 text-rose-100'
                    }`}
                  >
                    {vsYesterdayPct >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {vsYesterdayPct > 0 ? `+${vsYesterdayPct}%` : `${vsYesterdayPct}%`} vs hier
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-emerald-100/95 font-semibold">
              <span className="flex items-center space-x-1 bg-emerald-950/35 px-2.5 py-1 rounded-xl border border-emerald-400/20">
                <Activity className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {salesCount} vente{salesCount > 1 ? 's' : ''} aujourd'hui
                </span>
              </span>
              {todayExpenses > 0 && (
                <span className="bg-rose-950/35 text-rose-100 px-2.5 py-1 rounded-xl border border-rose-300/20">
                  Dépenses : -{formatCurrency(todayExpenses)}
                </span>
              )}
            </div>
          </div>

          {/* Mini-histogramme des 7 derniers jours (desktop/tablette) */}
          <div className="hidden md:block relative z-10 mt-4 pt-3.5 border-t border-white/15 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-100/90">Activité sur 7 jours</span>
              <span className="font-extrabold text-amber-200">
                {hoveredDay
                  ? `${hoveredDay.label.toUpperCase()} : ${formatCurrency(hoveredDay.total)}`
                  : `Hier : ${formatCurrency(yesterdayTotal)}`}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 items-end h-14 pt-1">
              {last7Days.map((bar) => {
                const heightPct =
                  bar.total > 0 ? Math.max(18, Math.round((bar.total / max7Days) * 100)) : 10;
                return (
                  <div
                    key={bar.date}
                    onMouseEnter={() => setHoveredDay(bar)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex flex-col items-center justify-end h-full gap-1 cursor-pointer group"
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[22px] rounded-t-md transition-all ${
                          bar.isToday
                            ? 'bg-amber-300 shadow-xs shadow-amber-300/40'
                            : bar.total > 0
                            ? 'bg-white/45 group-hover:bg-white/80'
                            : 'bg-white/15 group-hover:bg-white/30'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[9px] uppercase font-bold ${
                        bar.isToday ? 'text-amber-200 font-black' : 'text-emerald-100/70'
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ventilation express */}
          <div className="hidden md:grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-white/15 relative z-10 text-xs">
            <div className="bg-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-100/80 block font-medium">Espèces</span>
              <span className="font-black text-white font-display truncate block">
                {formatCurrency(cashToday)}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-100/80 block font-medium">Mobile Money</span>
              <span className="font-black text-white font-display truncate block">
                {formatCurrency(mobileToday)}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-100/80 block font-medium">Solde Net</span>
              <span
                className={`font-black font-display truncate block ${
                  netToday >= 0 ? 'text-amber-200' : 'text-rose-200'
                }`}
              >
                {formatCurrency(netToday)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. GRILLE CENTRALE 2x3 DES 6 FONCTIONNALITÉS AVEC BADGES TEMPS RÉEL */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-2.5 md:gap-4">
          {/* Vendre */}
          <button
            type="button"
            onClick={() => handleTileClick('pos')}
            className="group relative bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 md:hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-center md:items-start justify-between space-y-2 md:space-y-3 cursor-pointer text-center md:text-left"
          >
            <div className="w-full flex items-center justify-center md:justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ouvert
              </span>
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center md:justify-between">
                <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display">
                  Vendre
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {salesCount > 0
                  ? `${salesCount} ticket${salesCount > 1 ? 's' : ''} aujourd'hui`
                  : 'Encaisser un client'}
              </span>
            </div>
          </button>

          {/* Dettes */}
          <button
            type="button"
            onClick={() => handleTileClick('debts')}
            className="group relative bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 md:hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-center md:items-start justify-between space-y-2 md:space-y-3 cursor-pointer text-center md:text-left"
          >
            <div className="w-full flex items-center justify-center md:justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span
                className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  debtorsCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {debtorsCount} client{debtorsCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center md:justify-between">
                <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display">
                  Dettes
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="hidden md:block text-[11px] font-semibold text-amber-700 mt-0.5 truncate">
                {outstandingDebt > 0 ? formatCurrency(outstandingDebt) : 'Aucun impayé'}
              </span>
            </div>
          </button>

          {/* Bilan */}
          <button
            type="button"
            onClick={() => handleTileClick('reports')}
            className="group relative bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 md:hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-center md:items-start justify-between space-y-2 md:space-y-3 cursor-pointer text-center md:text-left"
          >
            <div className="w-full flex items-center justify-center md:justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                Analytique
              </span>
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center md:justify-between">
                <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display">
                  Bilan
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                Graphes, PDF &amp; marges
              </span>
            </div>
          </button>

          {/* Facturation */}
          <button
            type="button"
            onClick={() => handleTileClick('invoices')}
            className="group relative bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 md:hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-center md:items-start justify-between space-y-2 md:space-y-3 cursor-pointer text-center md:text-left"
          >
            <div className="w-full flex items-center justify-center md:justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200/70">
                {invoicesCount} émise{invoicesCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center md:justify-between">
                <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display">
                  Facturation
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                Devis &amp; factures PDF
              </span>
            </div>
          </button>

          {/* Stock */}
          <button
            type="button"
            onClick={() => handleTileClick('inventory')}
            className="group relative bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/10 md:hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-center md:items-start justify-between space-y-2 md:space-y-3 cursor-pointer text-center md:text-left"
          >
            <div className="w-full flex items-center justify-center md:justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6 stroke-[2.2]" />
              </div>
              {lowStockProducts.length > 0 ? (
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3 h-3" />
                  {lowStockProducts.length} alerte{lowStockProducts.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200/70">
                  {totalProductsCount} art.
                </span>
              )}
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center md:justify-between">
                <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display">
                  Stock
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {lowStockProducts.length > 0
                  ? 'Réapprovisionnement requis'
                  : 'Catalogue & arrivages'}
              </span>
            </div>
          </button>

          {/* Boutique */}
          <button
            type="button"
            onClick={() => handleTileClick('settings')}
            className="group relative bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-slate-400 hover:shadow-lg hover:shadow-slate-500/10 md:hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-center md:items-start justify-between space-y-2 md:space-y-3 cursor-pointer text-center md:text-left"
          >
            <div className="w-full flex items-center justify-center md:justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-600/25 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                Config
              </span>
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center md:justify-between">
                <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display">
                  Boutique
                </span>
                <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="hidden md:block text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                Profil, PIN &amp; sauvegarde
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. BAS DE PAGE : VENTES RÉCENTES (7 COLS) + SANTÉ & ALERTES BOUTIQUE (5 COLS SUR DESKTOP) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* VENTES RÉCENTES DU JOUR */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-4 md:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="text-sm md:text-base font-black text-slate-900 font-display">
                Ventes récentes
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">Activité de la journée</p>
            </div>
            {salesCount > 0 && (
              <button
                type="button"
                onClick={() => handleTileClick('reports')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
              >
                <span>Voir tout</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Chargement des ventes...</div>
          ) : todaySales.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <ShoppingCart className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs md:text-sm font-bold text-slate-700">
                  Aucune vente enregistrée aujourd'hui
                </p>
                <p className="text-[11px] text-slate-400">
                  Lancez votre première vente pour alimenter le résumé en direct.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTileClick('pos')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs active:scale-98 transition-all cursor-pointer font-display"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Démarrer une vente</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todaySales.slice(0, 6).map((sale, idx) => (
                <div
                  key={sale.id || idx}
                  className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs md:text-sm text-slate-900 font-display truncate">
                        Vente #{todaySales.length - idx}
                      </span>
                      {getPaymentMethodBadge(sale)}
                    </div>
                    <p className="text-[10px] md:text-[11px] text-slate-400 font-medium">
                      {formatTime(sale.createdAt)}
                      {sale.customerName ? ` • ${sale.customerName}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-slate-900 font-display">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANNEAU SANTÉ BOUTIQUE & ALERTES (DESKTOP) */}
        <div className="hidden lg:block lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="text-base font-black text-slate-900 font-display">
                À surveiller aujourd'hui
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Stock faible &amp; créances clients
              </p>
            </div>
          </div>

          {/* Alerte Stock */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                {lowStockProducts.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>État du Stock</span>
              </span>
              <button
                type="button"
                onClick={() => handleTileClick('inventory')}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-800 cursor-pointer"
              >
                Gérer →
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl px-3.5 py-2.5 text-xs text-emerald-800 font-semibold">
                Tout le catalogue ({totalProductsCount} articles) est à niveau.
              </div>
            ) : (
              <div className="space-y-1.5">
                {lowStockProducts.slice(0, 3).map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between bg-amber-50/70 border border-amber-200/70 rounded-xl px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-slate-800 truncate pr-2">{prod.name}</span>
                    <span className="font-black text-rose-700 shrink-0">
                      Reste : {prod.stockQuantity ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Encours Dettes */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">
                Créances clients à recouvrer
              </span>
              <span className="text-base font-black text-amber-800 font-display">
                {formatCurrency(outstandingDebt)}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5">
                ({debtorsCount} client{debtorsCount > 1 ? 's' : ''})
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleTileClick('debts')}
              className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold transition-colors cursor-pointer font-display"
            >
              Carnet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
