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
  ArrowUpRight,
  PackagePlus,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';
import { exportMonthlyReportToExcel } from '../../utils/excelExporter';
import { useAppStore } from '../../store/appStore';
import { db } from '../../db/db';
import { subscriptionService } from '../../db/services/subscriptionService';
import { NewExpenseModal } from './NewExpenseModal';
import { SuppliesHistoryModal } from '../inventory/SuppliesHistoryModal';

export const DailyReportView: React.FC = () => {
  const { shopProfile, setActiveTab, verifyPin } = useAppStore();
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
  const [isSuppliesHistoryModalOpen, setIsSuppliesHistoryModalOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelPinInput, setCancelPinInput] = useState('');
  const [showCancelPin, setShowCancelPin] = useState(false);
  const [cancelPinError, setCancelPinError] = useState('');
  const [cancelReasonInput, setCancelReasonInput] = useState('Erreur de saisie caisse');
  const [isCancellingSale, setIsCancellingSale] = useState(false);
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

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
      case 'Espèces':
        return { label: 'Espèces', color: 'bg-emerald-100 text-emerald-800' };
      case 'ORANGE_MONEY':
      case 'Orange Money':
        return { label: 'Orange Money', color: 'bg-[#ff6600]/15 text-[#ff6600]' };
      case 'MOOV_MONEY':
      case 'Moov Money':
        return { label: 'Moov Money', color: 'bg-[#005baa]/15 text-[#005baa]' };
      case 'WAVE':
      case 'Wave':
        return { label: 'Wave', color: 'bg-[#1dc4fe]/15 text-[#1dc4fe]' };
      case 'CREDIT':
      case 'Crédit':
        return { label: 'Crédit', color: 'bg-amber-100 text-amber-800' };
      default:
        return { label: method, color: 'bg-slate-100 text-slate-800' };
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

    const handleDbUpdated = () => {
      loadReportData();
    };
    window.addEventListener('fasocarnet_database_updated', handleDbUpdated);

    return () => {
      window.removeEventListener('fasocarnet_database_updated', handleDbUpdated);
    };
  }, [reportPeriod, selectedDate, selectedMonth]);

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Supprimer cette dépense ?")) {
      await expensesService.delete(id);
      await loadReportData();
    }
  };

  const handleOpenCancelSale = (sale: Sale) => {
    setSaleToCancel(sale);
    setCancelPinInput('');
    setCancelPinError('');
    setShowCancelPin(false);
    setCancelReasonInput('Erreur de saisie caisse');
  };

  const handleConfirmCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel) return;
    setCancelPinError('');

    if (shopProfile?.pinCode) {
      if (!cancelPinInput.trim()) {
        setCancelPinError('Veuillez saisir votre code PIN pour confirmer.');
        return;
      }
      const isValid = verifyPin(cancelPinInput.trim());
      if (!isValid) {
        setCancelPinError('Code PIN incorrect.');
        return;
      }
    }

    setIsCancellingSale(true);
    try {
      await salesService.cancelSale(saleToCancel.id, cancelReasonInput);
      setSaleToCancel(null);
      await loadReportData();
    } catch (err: any) {
      setCancelPinError(err.message || "Erreur lors de l'annulation de la vente.");
    } finally {
      setIsCancellingSale(false);
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

    let text = `BILAN COMPTABLE - ${month.toUpperCase()}\n`;
    text += `Commerce : ${shopName}\n`;
    if (shopProfile?.ifu) text += `IFU : ${shopProfile.ifu}\n`;
    text += `----------------------------------\n`;
    text += `Chiffre d'Affaires Net : ${formatCurrency(summary.totalSales || 0)}\n`;
    text += `Espèces (Cash) : ${formatCurrency(summary.cashSales || 0)}\n`;
    text += `Mobile Money : ${formatCurrency(totalMobile)}\n`;
    text += `  - OM : ${formatCurrency(summary.orangeMoneySales || 0)} | Moov : ${formatCurrency(summary.moovMoneySales || 0)} | Wave : ${formatCurrency(summary.waveSales || 0)}\n`;
    text += `Total des Dépenses : ${formatCurrency(summary.totalExpenses || 0)}\n`;
    text += `Trésorerie Nette Réelle : ${formatCurrency(summary.netCashFlow || 0)}\n`;
    text += `----------------------------------\n`;
    text += `Crédits Accordés : ${formatCurrency(summary.creditSales || 0)}\n`;
    text += `Dettes Récupérées : ${formatCurrency(summary.totalRecoveredDebts || 0)}\n`;
    text += `Dettes Restantes à Récupérer : ${formatCurrency(summary.totalOutstandingDebt || 0)}\n`;
    text += `----------------------------------\n`;
    text += `Rapport certifié généré par FasoCarnet`;

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
    <div className="max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-12 space-y-6">
      {/* Barre Supérieure : Titre, Période, Sélecteur de date et Boutons d'Action */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Titre & Période */}
        <div className="flex items-center justify-between lg:justify-start gap-4 flex-wrap">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-inner">
              <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">Bilan & Trésorerie</h2>
              <p className="text-xs text-slate-500 font-medium">
                {reportPeriod === 'day' ? formatDateLabel(selectedDate) : formatMonthLabel(selectedMonth)}
              </p>
            </div>
          </div>

          {/* Onglets Période : Jour vs Mois */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setReportPeriod('day')}
              className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
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
              className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
                reportPeriod === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mois</span>
            </button>
          </div>

          {/* Sélecteur de date / mois */}
          <div>
            {reportPeriod === 'day' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              />
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              />
            )}
          </div>
        </div>

        {/* Boutons d'Action Rapides */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton Historique Approvisionnements */}
          <button
            type="button"
            onClick={() => setIsSuppliesHistoryModalOpen(true)}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Consulter l'historique des achats et réapprovisionnements"
          >
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Approvisionnements</span>
          </button>

          {/* Bouton Export Excel */}
          {reportPeriod === 'month' && (
            <button
              type="button"
              disabled={isExportingExcel}
              onClick={handleExportExcel}
              className="py-2.5 px-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl flex items-center space-x-1.5 shadow-xs active:scale-98 transition-all cursor-pointer font-display disabled:opacity-50"
              title="Exporter en Excel"
            >
              {isExportingExcel ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              )}
              <span>Excel (.csv)</span>
            </button>
          )}

          {/* Bouton Nouvelle Dépense */}
          <button
            type="button"
            onClick={() => setIsNewExpenseModalOpen(true)}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center space-x-1.5 cursor-pointer font-display"
            title="Enregistrer une sortie de caisse ou dépense"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ Dépense</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4 CARTES KPI SYNTHÉTIQUES EN GRILLE RESPONSIVE           */}
      {/* ======================================================== */}
      {/* 4 CARTES KPI SYNTHÉTIQUES EN GRILLE RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARTE 1 : CHIFFRE D'AFFAIRES ENCAISSÉ */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-extrabold px-2.5 py-1 rounded-full font-display">
              {summary?.salesCount || 0} vente{summary?.salesCount && summary.salesCount > 1 ? 's' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              {reportPeriod === 'day' ? "Chiffre d'Affaires du Jour" : "Chiffre d'Affaires du Mois"}
            </span>
            <div className="text-2xl font-black text-slate-900 font-display mt-0.5">
              {formatCurrency(summary?.totalSales || 0)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Net perçu en caisse (hors crédits impayés)
            </p>
          </div>
        </div>

        {/* CARTE 2 : BÉNÉFICE NET RÉEL */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full font-display ${
              (summary?.netProfit || 0) >= 0 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' 
                : 'bg-rose-50 text-rose-800 border border-rose-200/60'
            }`}>
              {(summary?.netProfit || 0) >= 0 ? 'Rentable' : 'Déficit'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              Bénéfice Net Réel
            </span>
            <div className={`text-2xl font-black font-display mt-0.5 ${
              (summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>
              {(summary?.netProfit || 0) >= 0 ? `+${formatCurrency(summary?.netProfit || 0)}` : `-${formatCurrency(Math.abs(summary?.netProfit || 0))}`}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1 pt-1 border-t border-slate-100">
              <span>Marge brute : <strong className="text-emerald-700">+{formatCurrency(summary?.grossProfit || 0)}</strong></span>
              <span>Coût : {formatCurrency(summary?.totalCostOfGoodsSold || 0)}</span>
            </div>
          </div>
        </div>

        {/* CARTE 3 : TRÉSORERIE NETTE RÉELLE */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full font-display ${
              isPositiveFlow 
                ? 'bg-teal-50 text-teal-800 border border-teal-200/60' 
                : 'bg-rose-50 text-rose-800 border border-rose-200/60'
            }`}>
              {isPositiveFlow ? 'Solde +' : 'Solde −'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              Trésorerie Nette Réelle
            </span>
            <div className={`text-2xl font-black font-display mt-0.5 ${
              isPositiveFlow ? 'text-teal-800' : 'text-rose-600'
            }`}>
              {isPositiveFlow ? `+${formatCurrency(netFlow)}` : `-${formatCurrency(Math.abs(netFlow))}`}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
              Entrées ({formatCurrency((summary?.totalSales || 0) + (summary?.totalRecoveredDebts || 0))}) − Dépenses ({formatCurrency(summary?.totalExpenses || 0)})
            </p>
          </div>
        </div>

        {/* CARTE 4 : DÉPENSES & SORTIES DE CAISSE */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="bg-rose-50 text-rose-800 border border-rose-200/60 text-[10px] font-extrabold px-2.5 py-1 rounded-full font-display">
              {expensesList.length} sortie{expensesList.length > 1 ? 's' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              Dépenses d'Exploitation
            </span>
            <div className="text-2xl font-black text-rose-700 font-display mt-0.5">
              -{formatCurrency(summary?.totalExpenses || 0)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Espèces : {formatCurrency(summary?.cashExpenses || 0)} • Mobile : {formatCurrency((summary?.orangeMoneyExpenses || 0) + (summary?.moovMoneyExpenses || 0) + (summary?.waveExpenses || 0))}
            </p>
          </div>
        </div>
      </div>

      {/* DISPOSITION EN 2 VOLETS COMPLÉMENTAIRES (7 COLS JOURNAL / 5 COLS FLUX & CRÉANCES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* VOLET GAUCHE (7 COLONNES) : JOURNAL DES OPÉRATIONS */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 font-display">Journal des Opérations</h3>
                <p className="text-[10px] text-slate-500 font-medium">Historique chronologique des encaissements et dépenses</p>
              </div>
            </div>

            <div className="flex items-center p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setHistoryTab('sales')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display ${
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
                className={`px-3.5 py-1.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display ${
                  historyTab === 'expenses'
                    ? 'bg-white text-rose-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Dépenses ({expensesList.length})</span>
              </button>
            </div>
          </div>

          {/* CONTENU DE L'ONGLET VENTES */}
          {historyTab === 'sales' && (
            <div>
              {salesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Aucune vente enregistrée pour cette sélection</p>
                  <p className="text-[11px] text-slate-400">Les transactions validées à la caisse apparaîtront ici.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1 space-y-1">
                  {salesList.map((sale) => (
                    <div 
                      key={sale.id} 
                      className={`py-3 px-3 flex items-center justify-between text-xs hover:bg-slate-50/80 rounded-2xl transition-all ${
                        sale.isCancelled ? 'opacity-60 bg-red-50/30' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-3 space-y-0.5">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className={`font-black text-xs sm:text-sm font-display ${
                            sale.isCancelled ? 'text-slate-500 line-through' : 'text-slate-900'
                          }`}>
                            {sale.isPartialCredit 
                              ? `Vente Partielle : ${sale.customerName || 'Client'}` 
                              : sale.isCredit 
                              ? `Crédit : ${sale.customerName || 'Client'}` 
                              : `Vente ${getPaymentMethodBadge(sale.paymentMethod).label}`}
                          </span>
                          {sale.isCancelled ? (
                            <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-md border border-red-200">
                              ANNULÉE
                            </span>
                          ) : (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${getPaymentMethodBadge(sale.paymentMethod).color}`}>
                              {getPaymentMethodBadge(sale.paymentMethod).label}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{formatDateTime(sale.createdAt)}</div>
                        {sale.isCancelled && sale.cancelReason && (
                          <div className="text-[11px] text-red-600 italic">
                            Motif : {sale.cancelReason}
                          </div>
                        )}
                        {sale.isPartialCredit && (
                          <div className="text-[11px] text-indigo-700 font-semibold">
                            Acompte : {formatCurrency(sale.paidAmount || 0)} • Dette : {formatCurrency(sale.creditAmount || 0)}
                          </div>
                        )}
                        {sale.items && sale.items.length > 0 && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {sale.items.map(it => `${it.description} (x${it.quantity})`).join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className={`font-black font-display text-sm sm:text-base ${
                          sale.isCancelled 
                            ? 'text-slate-400 line-through' 
                            : sale.isCredit 
                            ? 'text-amber-700' 
                            : 'text-emerald-700'
                        }`}>
                          {formatCurrency(sale.totalAmount)}
                        </div>
                        {!sale.isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelSale(sale)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Annuler cette vente et remettre en stock"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTENU DE L'ONGLET DÉPENSES */}
          {historyTab === 'expenses' && (
            <div>
              {expensesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <TrendingDown className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Aucune dépense pour cette sélection</p>
                  <button
                    type="button"
                    onClick={() => setIsNewExpenseModalOpen(true)}
                    className="mt-1 text-xs font-black text-rose-600 hover:text-rose-700 underline cursor-pointer font-display"
                  >
                    + Enregistrer une dépense
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1 space-y-1">
                  {expensesList.map((exp) => (
                    <div key={exp.id} className="py-3 px-3 flex items-center justify-between text-xs hover:bg-slate-50/80 rounded-2xl transition-all">
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate font-display">
                          {exp.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDateTime(exp.createdAt)} • <span className="font-semibold text-rose-700">{exp.paymentMethod}</span>
                        </div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-500 italic truncate">{exp.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2.5 flex-shrink-0">
                        <span className="font-black font-display text-xs sm:text-sm text-rose-700">
                          -{formatCurrency(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
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

        {/* VOLET DROIT (5 COLONNES) : VENTILATION DES ENCAISSEMENTS & SITUATION DES CRÉDITS */}
        <div className="lg:col-span-5 space-y-5">
          {/* CARTE 1 : VENTILATION DES ENCAISSEMENTS VENTES */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 font-display">Moyens de Paiement</h4>
                  <p className="text-[10px] text-slate-500">Répartition des encaissements ventes</p>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-black text-emerald-800 font-display">
                {formatCurrency(totalCashCollected)}
              </span>
            </div>

            {/* Visual Distribution Bar */}
            {totalCashCollected > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  {(summary?.cashSales || 0) > 0 && (
                    <div 
                      style={{ width: `${((summary?.cashSales || 0) / totalCashCollected) * 100}%` }}
                      className="bg-emerald-600 h-full transition-all"
                      title={`Espèces : ${formatCurrency(summary?.cashSales || 0)}`}
                    />
                  )}
                  {(summary?.orangeMoneySales || 0) > 0 && (
                    <div 
                      style={{ width: `${((summary?.orangeMoneySales || 0) / totalCashCollected) * 100}%` }}
                      className="bg-[#ff6600] h-full transition-all"
                      title={`Orange Money : ${formatCurrency(summary?.orangeMoneySales || 0)}`}
                    />
                  )}
                  {(summary?.moovMoneySales || 0) > 0 && (
                    <div 
                      style={{ width: `${((summary?.moovMoneySales || 0) / totalCashCollected) * 100}%` }}
                      className="bg-[#005baa] h-full transition-all"
                      title={`Moov Money : ${formatCurrency(summary?.moovMoneySales || 0)}`}
                    />
                  )}
                  {(summary?.waveSales || 0) > 0 && (
                    <div 
                      style={{ width: `${((summary?.waveSales || 0) / totalCashCollected) * 100}%` }}
                      className="bg-[#1dc4fe] h-full transition-all"
                      title={`Wave : ${formatCurrency(summary?.waveSales || 0)}`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Grille des 4 canaux */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-150 space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-700 text-[10px] font-bold font-display">
                  <Banknote className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Espèces (Cash)</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-display truncate">
                  {formatCurrency(summary?.cashSales || 0)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {totalCashCollected > 0 ? `${Math.round(((summary?.cashSales || 0) / totalCashCollected) * 100)}% du total` : '0%'}
                </div>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-150 space-y-1">
                <div className="flex items-center space-x-1.5 text-[#ff6600] text-[10px] font-bold font-display">
                  <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#ff6600]" />
                  <span>Orange Money</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-display truncate">
                  {formatCurrency(summary?.orangeMoneySales || 0)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {totalCashCollected > 0 ? `${Math.round(((summary?.orangeMoneySales || 0) / totalCashCollected) * 100)}% du total` : '0%'}
                </div>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-150 space-y-1">
                <div className="flex items-center space-x-1.5 text-[#005baa] text-[10px] font-bold font-display">
                  <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#005baa]" />
                  <span>Moov Money</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-display truncate">
                  {formatCurrency(summary?.moovMoneySales || 0)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {totalCashCollected > 0 ? `${Math.round(((summary?.moovMoneySales || 0) / totalCashCollected) * 100)}% du total` : '0%'}
                </div>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-150 space-y-1">
                <div className="flex items-center space-x-1.5 text-[#1dc4fe] text-[10px] font-bold font-display">
                  <Smartphone className="w-3.5 h-3.5 stroke-[2.2] text-[#1dc4fe]" />
                  <span>Wave</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-display truncate">
                  {formatCurrency(summary?.waveSales || 0)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {totalCashCollected > 0 ? `${Math.round(((summary?.waveSales || 0) / totalCashCollected) * 100)}% du total` : '0%'}
                </div>
              </div>
            </div>
          </div>

          {/* CARTE 2 : SITUATION DES CRÉDITS & ENCOURS DETTES */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 font-display">Crédits & Créances</h4>
                  <p className="text-[10px] text-slate-500">Mouvements des dettes sur la période</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/70 space-y-1">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1 font-display">
                  <CreditCard className="w-3 h-3 text-amber-700" />
                  <span>Crédits Accordés</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-amber-950 font-display truncate">
                  {formatCurrency(summary?.creditSales || 0)}
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/70 space-y-1">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1 font-display">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                  <span>Dettes Récupérées</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-emerald-950 font-display truncate">
                  {formatCurrency(summary?.totalRecoveredDebts || 0)}
                </div>
              </div>
            </div>

            {/* Encart Dettes Restantes à Récupérer */}
            <div 
              onClick={() => setActiveTab('debts')}
              className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white p-4 rounded-2xl shadow-sm border border-amber-500/40 flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all active:scale-99 group"
            >
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="flex items-center space-x-1.5 text-amber-200 text-[10px] font-bold uppercase tracking-wider font-display">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                  <span>Dettes Restantes à Recouvrer</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white font-display truncate">
                  {formatCurrency(summary?.totalOutstandingDebt || 0)}
                </div>
                <p className="text-[10px] text-amber-100/80">
                  {summary?.debtorsCount || 0} client{summary?.debtorsCount && summary.debtorsCount > 1 ? 's' : ''} débiteur{summary?.debtorsCount && summary.debtorsCount > 1 ? 's' : ''} en attente
                </p>
              </div>

              <div className="bg-white/20 group-hover:bg-white text-white group-hover:text-amber-900 px-3 py-1.5 rounded-xl flex items-center space-x-1 text-xs font-bold transition-colors shrink-0 font-display">
                <span>Carnet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
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
      {/* Modal d'Annulation Sécurisée d'une Vente */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <form 
            onSubmit={handleConfirmCancelSale}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 border border-slate-100"
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 font-display">
                    Annuler la Vente
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    #{saleToCancel.id.slice(-8).toUpperCase()} • {formatDateTime(saleToCancel.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Récapitulatif de la vente */}
            <div className="bg-red-50/50 p-3 rounded-2xl border border-red-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Montant de la vente :</span>
                <span className="font-black text-sm text-red-800 font-display">{formatCurrency(saleToCancel.totalAmount)}</span>
              </div>
              {saleToCancel.items && saleToCancel.items.length > 0 && (
                <div className="text-[11px] text-slate-600 border-t border-red-100/80 pt-1">
                  <strong>Articles concernés :</strong> {saleToCancel.items.map(it => `${it.description} (x${it.quantity})`).join(', ')}
                </div>
              )}
              {saleToCancel.customerName && (
                <div className="text-[11px] text-slate-600">
                  <strong>Client :</strong> {saleToCancel.customerName} ({saleToCancel.customerPhone})
                </div>
              )}
            </div>

            {/* Note d'impact */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1 leading-snug">
              <p className="font-bold text-slate-800 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Conséquences de l'annulation :</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>Les quantités vendues seront <strong>restituées en stock</strong>.</li>
                <li>Le montant sera déduit du chiffre d'affaires et de la caisse.</li>
                {saleToCancel.isCredit && <li>La dette client associée sera annulée.</li>}
              </ul>
            </div>

            {/* Motif */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Motif de l'annulation
              </label>
              <select
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-red-500 outline-none cursor-pointer"
              >
                <option value="Erreur de saisie caisse">Erreur de saisie caisse</option>
                <option value="Retour marchandise client">Retour marchandise client</option>
                <option value="Paiement refusé / annulé">Paiement refusé / annulé</option>
                <option value="Autre motif">Autre motif</option>
              </select>
            </div>

            {/* Demande Code PIN */}
            {shopProfile?.pinCode && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Code PIN commerçant (4 chiffres) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showCancelPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    placeholder="Entrez votre code PIN"
                    value={cancelPinInput}
                    onChange={(e) => {
                      setCancelPinInput(e.target.value.replace(/\D/g, ''));
                      setCancelPinError('');
                    }}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-red-500 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCancelPin(!showCancelPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showCancelPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {cancelPinError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center space-x-1.5 animate-in shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{cancelPinError}</span>
              </div>
            )}

            {/* Boutons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Garder la vente
              </button>
              <button
                type="submit"
                disabled={isCancellingSale}
                className="py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-red-600/25 transition-all cursor-pointer font-display disabled:opacity-50"
              >
                {isCancellingSale ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{isCancellingSale ? 'Annulation...' : 'CONFIRMER L\'ANNULATION'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Historique des Approvisionnements */}
      <SuppliesHistoryModal
        isOpen={isSuppliesHistoryModalOpen}
        onClose={() => setIsSuppliesHistoryModalOpen(false)}
        onSupplyUpdated={loadReportData}
      />
    </div>
  );
};
