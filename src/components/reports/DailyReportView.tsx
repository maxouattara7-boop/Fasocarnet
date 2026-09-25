import React, { useState, useEffect } from 'react';
import { DailySummary, Expense, Sale } from '../../types';
import { salesService } from '../../db/services/salesService';
import { expensesService } from '../../db/services/expensesService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { 
  BarChart3, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  ArrowDownLeft, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Wallet, 
  ShoppingBag, 
  CalendarDays, 
  FileSpreadsheet, 
  CheckCircle2, 
  Copy, 
  Share2, 
  X, 
  Loader2, 
  Crown, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Trash2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { exportMonthlyReportToExcel } from '../../utils/excelExporter';
import { useAppStore } from '../../store/appStore';
import { db } from '../../db/db';
import { subscriptionService } from '../../db/services/subscriptionService';
import { NewExpenseModal } from './NewExpenseModal';

export const DailyReportView: React.FC = () => {
  const { shopProfile, setActiveTab } = useAppStore();
  const isPremium = subscriptionService.isPremiumActive(shopProfile);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'month'>('day');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [historyTab, setHistoryTab] = useState<'sales' | 'expenses'>('sales');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [isCashDetailsOpen, setIsCashDetailsOpen] = useState(false);
  const [isExpensesDetailsOpen, setIsExpensesDetailsOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportModalData, setExportModalData] = useState<{
    isOpen: boolean;
    fileName: string;
    csvContent: string;
    monthLabel: string;
    copied: boolean;
  } | null>(null);

  const formatMonthLabel = (mString: string) => {
    try {
      const [year, month] = mString.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch {
      return mString;
    }
  };

  const formatDateLabel = (dString: string) => {
    try {
      const date = new Date(dString + 'T00:00:00');
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dString;
    }
  };

  const loadReportData = async () => {
    if (reportPeriod === 'day') {
      const [sum, sales, expenses] = await Promise.all([
        salesService.getDailySummary(selectedDate),
        salesService.getSalesByDate(selectedDate),
        expensesService.getByDate(selectedDate)
      ]);
      setSummary(sum);
      setSalesList(sales);
      setExpensesList(expenses);
    } else {
      const [sum, sales, expenses] = await Promise.all([
        salesService.getMonthlySummary(selectedMonth),
        salesService.getSalesByMonth(selectedMonth),
        expensesService.getByMonth(selectedMonth)
      ]);
      setSummary(sum);
      setSalesList(sales);
      setExpensesList(expenses);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [reportPeriod, selectedDate, selectedMonth]);

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Supprimer cette dépense ?")) {
      await expensesService.delete(id);
      await loadReportData();
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const startOfMonth = `${selectedMonth}-01T00:00:00.000Z`;
      const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

      const payments = await db.debtPayments
        .where('createdAt')
        .between(startOfMonth, endOfMonth, true, true)
        .toArray();

      const exportRes = await exportMonthlyReportToExcel({
        monthString: selectedMonth,
        summary,
        sales: salesList,
        debtPayments: payments,
        shopProfile
      });

      setExportModalData({
        isOpen: true,
        fileName: exportRes.fileName,
        csvContent: exportRes.csvContent,
        monthLabel: formatMonthLabel(selectedMonth),
        copied: false
      });
    } catch (err) {
      console.error('Erreur export excel:', err);
      alert("Erreur lors de l'exportation du bilan.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleCopyCsv = async () => {
    if (!exportModalData?.csvContent) return;
    try {
      await navigator.clipboard.writeText(exportModalData.csvContent);
      setExportModalData(prev => prev ? { ...prev, copied: true } : null);
      setTimeout(() => {
        setExportModalData(prev => prev ? { ...prev, copied: false } : null);
      }, 2500);
    } catch (err) {
      console.warn('Erreur copie:', err);
    }
  };

  const handleShareSummaryWhatsApp = () => {
    if (!summary) return;
    const shopName = shopProfile?.name || 'FasoCarnet';
    const month = exportModalData?.monthLabel || selectedMonth;
    const totalMobile = (summary.orangeMoneySales || 0) + (summary.moovMoneySales || 0) + (summary.waveSales || 0);

    let text = `📊 *BILAN COMPTABLE - ${month.toUpperCase()}*\n`;
    text += `🏪 *Commerce :* ${shopName}\n`;
    if (shopProfile?.ifu) text += `📋 *IFU :* ${shopProfile.ifu}\n`;
    text += `──────────────────────\n`;
    text += `💰 *Chiffre d'Affaires Net :* ${formatCurrency(summary.totalSales || 0)}\n`;
    text += `💵 *Espèces (Cash) :* ${formatCurrency(summary.cashSales || 0)}\n`;
    text += `📱 *Mobile Money :* ${formatCurrency(totalMobile)}\n`;
    text += `  • OM : ${formatCurrency(summary.orangeMoneySales || 0)} | Moov : ${formatCurrency(summary.moovMoneySales || 0)} | Wave : ${formatCurrency(summary.waveSales || 0)}\n`;
    text += `💸 *Total des Dépenses :* ${formatCurrency(summary.totalExpenses || 0)}\n`;
    text += `📈 *Trésorerie Nette Réelle :* ${formatCurrency(summary.netCashFlow || 0)}\n`;
    text += `──────────────────────\n`;
    text += `🤝 *Crédits Accordés :* ${formatCurrency(summary.creditSales || 0)}\n`;
    text += `📥 *Dettes Récupérées :* ${formatCurrency(summary.totalRecoveredDebts || 0)}\n`;
    text += `⚠️ *Dettes Restantes à Récupérer :* ${formatCurrency(summary.totalOutstandingDebt || 0)}\n`;
    text += `──────────────────────\n`;
    text += `_Rapport certifié généré par FasoCarnet_`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const totalCashCollected = 
    (summary?.cashSales || 0) + 
    (summary?.orangeMoneySales || 0) + 
    (summary?.moovMoneySales || 0) + 
    (summary?.waveSales || 0);

  if (!isPremium) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4 pb-28 animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-emerald-500/30 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-lg mb-3 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Crown className="w-7 h-7 text-amber-400" />
            </div>
          </div>

          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Fonctionnalité FasoCarnet Pro</span>
          </span>

          <h2 className="text-lg font-black font-display text-white mb-1.5">
            Bilan & Comptabilité Avancée
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto mb-4">
            Suivez votre chiffre d'affaires, gérez vos dépenses, analysez votre trésorerie réelle et exportez en Excel (.csv).
          </p>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('fasocarnet_settings_tab', 'subscription');
              }
              setActiveTab('settings');
            }}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
          >
            <span>Activer un Abonnement Pro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const netFlow = summary?.netCashFlow ?? 0;
  const isPositiveFlow = netFlow >= 0;

  return (
    <div className="max-w-md mx-auto p-3.5 sm:p-4 space-y-3 pb-28">
      {/* Barre Supérieure : Période + Bouton Nouvelle Dépense */}
      <div className="flex items-center justify-between gap-2">
        {/* Onglets Période : Jour vs Mois */}
        <div className="flex-1 flex items-center p-1 bg-slate-100 rounded-xl sm:rounded-2xl gap-1 text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setReportPeriod('day')}
            className={`flex-1 py-2 rounded-lg sm:rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              reportPeriod === 'day'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Jour</span>
          </button>

          <button
            type="button"
            onClick={() => setReportPeriod('month')}
            className={`flex-1 py-2 rounded-lg sm:rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              reportPeriod === 'month'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Mois</span>
          </button>
        </div>

        {/* Bouton Nouvelle Dépense */}
        <button
          type="button"
          onClick={() => setIsNewExpenseModalOpen(true)}
          className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl sm:rounded-2xl shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
          title="Enregistrer une sortie de caisse ou dépense"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>+ Dépense</span>
        </button>
      </div>

      {/* Sélecteur de date / mois */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center space-x-2 text-slate-700">
          <Calendar className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
          <span className="text-xs font-black font-display">
            {reportPeriod === 'day' ? 'Jour choisi :' : 'Mois choisi :'}
          </span>
        </div>

        {reportPeriod === 'day' ? (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
          />
        ) : (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
          />
        )}
      </div>

      {/* CARTE 1 : CHIFFRE D'AFFAIRES ENCAISSÉ */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md space-y-1.5 border border-emerald-700/50">
        <div className="flex items-center justify-between text-emerald-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-display">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 stroke-[2.5]" />
            <span>{reportPeriod === 'day' ? 'Total Encaissé du Jour' : 'Total Encaissé du Mois'}</span>
          </div>
          <span className="bg-emerald-700/70 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
            {summary?.salesCount || 0} vente{summary?.salesCount && summary.salesCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display drop-shadow-xs">
          {formatCurrency(summary?.totalSales || 0)}
        </div>

        <p className="text-[10px] text-emerald-200/80 font-medium">
          {reportPeriod === 'day' 
            ? `Chiffre d'affaires net pour le ${formatDateLabel(selectedDate)}`
            : `Chiffre d'affaires net pour ${formatMonthLabel(selectedMonth)}`}
        </p>
      </div>

      {/* CARTE 2 : TRÉSORERIE NETTE RÉELLE (BÉNÉFICE = ENCAISSEMENTS - DÉPENSES) */}
      <div className={`p-4 rounded-2xl sm:rounded-3xl border shadow-xs transition-all ${
        isPositiveFlow 
          ? 'bg-gradient-to-br from-teal-900 to-emerald-950 text-white border-teal-700/40' 
          : 'bg-gradient-to-br from-rose-950 to-slate-900 text-white border-rose-800/40'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-display text-slate-300">
          <div className="flex items-center space-x-1.5">
            {isPositiveFlow ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            <span>Trésorerie Nette Réelle</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${isPositiveFlow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {isPositiveFlow ? 'Solde Positif' : 'Déficit'}
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-black tracking-tight font-display mt-1">
          {isPositiveFlow ? `+ ${formatCurrency(netFlow)}` : `- ${formatCurrency(Math.abs(netFlow))}`}
        </div>

        <p className="text-[10px] text-slate-300/80 font-medium mt-0.5">
          Calcul : (Total Encaissé {formatCurrency(summary?.totalSales || 0)} + Dettes Récupérées {formatCurrency(summary?.totalRecoveredDebts || 0)}) − Dépenses {formatCurrency(summary?.totalExpenses || 0)}
        </p>
      </div>

      {/* Bouton d'exportation Excel pour le Bilan Mensuel */}
      {reportPeriod === 'month' && (
        <button
          type="button"
          disabled={isExportingExcel}
          onClick={handleExportExcel}
          className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-md active:scale-98 transition-all cursor-pointer font-display disabled:opacity-50"
        >
          {isExportingExcel ? (
            <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
          )}
          <span>{isExportingExcel ? 'Génération du fichier...' : '📥 Télécharger le Bilan Mensuel Excel (.csv / .xlsx)'}</span>
        </button>
      )}

      {/* BLOC 3 : ENCAISSEMENTS CASH & MOBILE MONEY (DÉROULANT) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div 
          onClick={() => setIsCashDetailsOpen(!isCashDetailsOpen)}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Encaissements Ventes</span>
              <span className="text-sm font-black text-slate-900 font-display">{formatCurrency(totalCashCollected)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold">
            <span>{isCashDetailsOpen ? 'Masquer' : 'Détails'}</span>
            {isCashDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isCashDetailsOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-100 grid grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-emerald-700 text-[10px] font-bold font-display">
                <Banknote className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Espèces</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.cashSales || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-[#ff6600] text-[10px] font-bold font-display">
                <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#ff6600]" />
                <span>Orange Money</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.orangeMoneySales || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-[#005baa] text-[10px] font-bold font-display">
                <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#005baa]" />
                <span>Moov Money</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.moovMoneySales || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-[#1dc4fe] text-[10px] font-bold font-display">
                <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#1dc4fe]" />
                <span>Wave</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.waveSales || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOC 4 : DÉPENSES & SORTIES DE CAISSE (DÉROULANT) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div 
          onClick={() => setIsExpensesDetailsOpen(!isExpensesDetailsOpen)}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-rose-50/50 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dépenses & Sorties de Caisse</span>
              <span className="text-sm font-black text-rose-700 font-display">{formatCurrency(summary?.totalExpenses || 0)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-rose-700 text-xs font-bold">
            <span>{isExpensesDetailsOpen ? 'Masquer' : 'Détails'}</span>
            {isExpensesDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isExpensesDetailsOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-100 grid grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-slate-700 text-[10px] font-bold font-display">
                <Banknote className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Caisse (Espèces)</span>
              </div>
              <div className="text-xs font-extrabold text-rose-700 font-display truncate">
                {formatCurrency(summary?.cashExpenses || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-[#ff6600] text-[10px] font-bold font-display">
                <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#ff6600]" />
                <span>Orange Money</span>
              </div>
              <div className="text-xs font-extrabold text-rose-700 font-display truncate">
                {formatCurrency(summary?.orangeMoneyExpenses || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-[#005baa] text-[10px] font-bold font-display">
                <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#005baa]" />
                <span>Moov Money</span>
              </div>
              <div className="text-xs font-extrabold text-rose-700 font-display truncate">
                {formatCurrency(summary?.moovMoneyExpenses || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
              <div className="flex items-center space-x-1 text-[#1dc4fe] text-[10px] font-bold font-display">
                <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#1dc4fe]" />
                <span>Wave</span>
              </div>
              <div className="text-xs font-extrabold text-rose-700 font-display truncate">
                {formatCurrency(summary?.waveExpenses || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOC 5 : SITUATION DES CRÉDITS & ENCOURS GLOBAL DES DETTES (POINT 3) */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/80 shadow-xs space-y-0.5">
            <div className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1 font-display">
              <CreditCard className="w-3 h-3 text-amber-700" />
              <span>Crédits Accordés</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-amber-950 font-display truncate">
              {formatCurrency(summary?.creditSales || 0)}
            </div>
          </div>

          <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 shadow-xs space-y-0.5">
            <div className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1 font-display">
              <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
              <span>Dettes Récupérées</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-emerald-950 font-display truncate">
              {formatCurrency(summary?.totalRecoveredDebts || 0)}
            </div>
          </div>
        </div>

        {/* CARTE SPÉCIALE POINT 3 : TOTAL DES DETTES RESTANTES À RÉCUPÉRER */}
        <div 
          onClick={() => setActiveTab('debts')}
          className="bg-gradient-to-r from-amber-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-xs border border-amber-500/30 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all active:scale-99"
        >
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-amber-300 text-[10px] font-bold uppercase tracking-wider font-display">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Dettes Restantes à Récupérer (Encours)</span>
            </div>
            <div className="text-lg font-black text-white font-display">
              {formatCurrency(summary?.totalOutstandingDebt || 0)}
            </div>
            <p className="text-[10px] text-amber-200/80">
              {summary?.debtorsCount || 0} client{summary?.debtorsCount && summary.debtorsCount > 1 ? 's' : ''} débiteur{summary?.debtorsCount && summary.debtorsCount > 1 ? 's' : ''} en attente
            </p>
          </div>

          <div className="bg-amber-500/20 text-amber-300 p-2 rounded-xl flex items-center space-x-1 text-xs font-bold border border-amber-400/30 shrink-0">
            <span>Carnet</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* SECTION HISTORIQUE AVEC DOUBLE ONGLET : VENTES vs DÉPENSES */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        {/* Sélecteur d'onglet d'historique */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setHistoryTab('sales')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              historyTab === 'sales'
                ? 'bg-white text-emerald-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ventes ({salesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryTab('expenses')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              historyTab === 'expenses'
                ? 'bg-white text-rose-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Dépenses ({expensesList.length})</span>
          </button>
        </div>

        {/* Contenu de l'onglet Ventes */}
        {historyTab === 'sales' && (
          <div>
            {salesList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">Aucune vente pour cette sélection</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {salesList.map((sale) => (
                  <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 text-xs truncate font-display">
                        {sale.isPartialCredit 
                          ? `Vente Partielle : ${sale.customerName || 'Client'}` 
                          : sale.isCredit 
                          ? `Crédit : ${sale.customerName || 'Client'}` 
                          : `Vente ${sale.paymentMethod}`}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(sale.createdAt)}</div>
                      {sale.isPartialCredit && (
                        <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                          Acompte : {formatCurrency(sale.paidAmount || 0)} • Dette : {formatCurrency(sale.creditAmount || 0)}
                        </div>
                      )}
                      {sale.items && sale.items.length > 0 && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {sale.items.map(it => `${it.description} (x${it.quantity})`).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className={`font-black font-display text-xs sm:text-sm flex-shrink-0 ${sale.isCredit ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatCurrency(sale.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenu de l'onglet Dépenses */}
        {historyTab === 'expenses' && (
          <div>
            {expensesList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <TrendingDown className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">Aucune dépense pour cette sélection</p>
                <button
                  type="button"
                  onClick={() => setIsNewExpenseModalOpen(true)}
                  className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  + Enregistrer une dépense
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {expensesList.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs truncate font-display">
                        {exp.title}
                      </div>
                      <div className="text-[10px] text-slate-400">{formatDateTime(exp.createdAt)} • <span className="font-semibold text-rose-700">{exp.paymentMethod}</span></div>
                      {exp.notes && (
                        <div className="text-[10px] text-slate-500 italic truncate">{exp.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="font-black font-display text-xs sm:text-sm text-rose-700">
                        -{formatCurrency(exp.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer la dépense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALE D'AJOUT DE DÉPENSE */}
      <NewExpenseModal
        isOpen={isNewExpenseModalOpen}
        onClose={() => setIsNewExpenseModalOpen(false)}
        onSuccess={loadReportData}
      />

      {/* MODALE DE CONFIRMATION ET PARTAGE DU BILAN MENSUEL */}
      {exportModalData?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm font-display">Bilan Mensuel Prêt !</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalData(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{exportModalData.fileName}</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                Période : <strong>{exportModalData.monthLabel}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleShareSummaryWhatsApp}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Envoyer le Résumé sur WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCsv}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border border-slate-200/70 active:scale-98"
              >
                {exportModalData.copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copié dans le presse-papier !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copier les données (pour Excel / Notes)</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setExportModalData(null)}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
