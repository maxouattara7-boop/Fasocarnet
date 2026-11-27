import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { db } from '../../db/db';
import { Sale } from '../../types';
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
  ArrowUpRight, 
  ChevronRight,
  Sparkles,
  Banknote,
  Clock,
  Smartphone
} from 'lucide-react';

export const MobileHomeView: React.FC = () => {
  const { shopProfile, setActiveTab } = useAppStore();
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadTodayData = async () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const allSales = await db.sales.toArray();
        const filtered = allSales
          .filter((s) => !s.isCancelled && s.createdAt && s.createdAt.slice(0, 10) === todayStr)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (isMounted) {
          setTodaySales(filtered);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erreur chargement données accueil mobile:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadTodayData();
    const interval = setInterval(loadTodayData, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
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
  const creditToday = todaySales
    .filter((s) => s.isCredit)
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const handleTileClick = (tabId: 'pos' | 'debts' | 'reports' | 'invoices' | 'inventory' | 'settings') => {
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
    if (sale.paymentMethod === 'ORANGE_MONEY' || sale.paymentMethod === 'MOOV_MONEY' || sale.paymentMethod === 'WAVE') {
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
    month: 'long'
  }).format(new Date());

  return (
    <div className="w-full max-w-lg md:max-w-6xl mx-auto px-3.5 md:px-6 pt-3 md:pt-6 pb-24 md:pb-12 space-y-4 md:space-y-6 animate-in fade-in duration-200">
      
      {/* 1. EN-TÊTE DE BIENVENUE */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight font-display">
            Bonjour, {shopProfile?.ownerName || shopProfile?.name || 'Gérant'}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium capitalize">
            {todayDateFormatted}
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => handleTileClick('pos')}
            className="hidden md:inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer font-display"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
            <span>Nouvelle Vente</span>
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

      {/* BLOC PRINCIPAL : RÉSUMÉ DU JOUR + GRILLE DES 6 ICÔNES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
        {/* 2. RÉSUMÉ DU JOUR (CARTE VERTE) */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 md:p-6 shadow-lg shadow-emerald-700/20 border border-emerald-500/30 flex flex-col justify-between">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-emerald-100 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Résumé du jour</span>
              </span>
              <button
                type="button"
                onClick={() => handleTileClick('reports')}
                className="text-xs font-bold text-emerald-200 hover:text-white flex items-center space-x-0.5 cursor-pointer"
              >
                <span>Détails</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-1">
              <p className="text-xs text-emerald-100/90 font-medium">Ventes réalisées</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight text-white font-display mt-0.5">
                {formatCurrency(totalSalesAmount)}
              </h3>
            </div>

            <div className="flex items-center space-x-2 pt-1 text-xs text-emerald-100/90 font-semibold">
              <span className="flex items-center space-x-1 bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-400/20">
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                <span>{salesCount} vente{salesCount > 1 ? 's' : ''} aujourd'hui</span>
              </span>
            </div>
          </div>

          {/* Ventilation express visible sur ordinateur/tablette */}
          <div className="hidden md:grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-white/15 relative z-10 text-xs">
            <div className="bg-white/10 rounded-xl px-2.5 py-2 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-100/80 block font-medium">Espèces</span>
              <span className="font-black text-white font-display truncate block">{formatCurrency(cashToday)}</span>
            </div>
            <div className="bg-white/10 rounded-xl px-2.5 py-2 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-100/80 block font-medium">Mobile Money</span>
              <span className="font-black text-white font-display truncate block">{formatCurrency(mobileToday)}</span>
            </div>
            <div className="bg-white/10 rounded-xl px-2.5 py-2 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-100/80 block font-medium">Crédits</span>
              <span className="font-black text-amber-200 font-display truncate block">{formatCurrency(creditToday)}</span>
            </div>
          </div>
        </div>

        {/* 3. GRILLE CENTRALE 2x3 DES 6 FONCTIONNALITÉS */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-2.5 md:gap-4">
          {/* LIGNE 1 : Vendre, Dettes, Bilan */}
          <button
            type="button"
            onClick={() => handleTileClick('pos')}
            className="group bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-emerald-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display block">Vendre</span>
              <span className="hidden md:block text-[10px] text-slate-400 font-medium mt-0.5">Caisse &amp; encaissement</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTileClick('debts')}
            className="group bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-amber-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display block">Dettes</span>
              <span className="hidden md:block text-[10px] text-slate-400 font-medium mt-0.5">Crédits &amp; clients</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTileClick('reports')}
            className="group bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display block">Bilan</span>
              <span className="hidden md:block text-[10px] text-slate-400 font-medium mt-0.5">Graphes &amp; trésorerie</span>
            </div>
          </button>

          {/* LIGNE 2 : Facturation, Stock, Boutique */}
          <button
            type="button"
            onClick={() => handleTileClick('invoices')}
            className="group bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-purple-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display block">Facturation</span>
              <span className="hidden md:block text-[10px] text-slate-400 font-medium mt-0.5">Devis &amp; factures PDF</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTileClick('inventory')}
            className="group bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-sky-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display block">Stock</span>
              <span className="hidden md:block text-[10px] text-slate-400 font-medium mt-0.5">Articles &amp; arrivages</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTileClick('settings')}
            className="group bg-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xs hover:border-slate-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-600/25 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-xs md:text-sm font-extrabold text-slate-900 font-display block">Boutique</span>
              <span className="hidden md:block text-[10px] text-slate-400 font-medium mt-0.5">Profil &amp; paramètres</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. HISTORIQUE DES VENTES RÉCENTES DU JOUR */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h4 className="text-sm font-black text-slate-900 font-display">Ventes récentes</h4>
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
          <div className="py-7 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingCart className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700">Aucune vente enregistrée aujourd'hui</p>
              <p className="text-[11px] text-slate-400">Cliquez sur « Vendre » ci-dessus pour démarrer votre première vente.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todaySales.slice(0, 5).map((sale, idx) => (
              <div key={sale.id || idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-slate-900 font-display truncate">
                      Vente #{todaySales.length - idx}
                    </span>
                    {getPaymentMethodBadge(sale)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
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

    </div>
  );
};
