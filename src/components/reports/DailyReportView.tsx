import React, { useState, useEffect } from 'react';
import { DailySummary, Sale } from '../../types';
import { salesService } from '../../db/services/salesService';
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
  Loader2
} from 'lucide-react';
import { exportMonthlyReportToExcel } from '../../utils/excelExporter';
import { useAppStore } from '../../store/appStore';
import { db } from '../../db/db';

export const DailyReportView: React.FC = () => {
  const { shopProfile } = useAppStore();
  const [reportPeriod, setReportPeriod] = useState<'day' | 'month'>('day');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [isCashDetailsOpen, setIsCashDetailsOpen] = useState(false);
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

    let text = `📊 *BILAN COMPTABLE MENSUEL - ${month.toUpperCase()}*\n`;
    text += `🏪 *Commerce :* ${shopName}\n`;
    if (shopProfile?.ifu) text += `📋 *IFU :* ${shopProfile.ifu}\n`;
    text += `──────────────────────\n`;
    text += `💰 *Chiffre d'Affaires Net :* ${formatCurrency(summary.totalSales || 0)}\n`;
    text += `💵 *Espèces (Cash) :* ${formatCurrency(summary.cashSales || 0)}\n`;
    text += `📱 *Paiements Mobile Money :* ${formatCurrency(totalMobile)}\n`;
    text += `  • Orange Money : ${formatCurrency(summary.orangeMoneySales || 0)}\n`;
    text += `  • Moov Money : ${formatCurrency(summary.moovMoneySales || 0)}\n`;
    text += `  • Wave : ${formatCurrency(summary.waveSales || 0)}\n`;
    text += `🤝 *Ventes à Crédit (Dettes émises) :* ${formatCurrency(summary.creditSales || 0)}\n`;
    text += `📥 *Dettes Récupérées :* ${formatCurrency(summary.totalRecoveredDebts || 0)}\n`;
    text += `🛍️ *Nombre Total de Ventes :* ${summary.salesCount || 0}\n`;
    text += `──────────────────────\n`;
    text += `_Rapport certifié généré par FasoCarnet_`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  useEffect(() => {
    loadReportData();
  }, [reportPeriod, selectedDate, selectedMonth]);

  const loadReportData = async () => {
    if (reportPeriod === 'day') {
      const sum = await salesService.getDailySummary(selectedDate);
      const sales = await salesService.getSalesByDate(selectedDate);
      setSummary(sum);
      setSalesList(sales);
    } else {
      const sum = await salesService.getMonthlySummary(selectedMonth);
      const sales = await salesService.getSalesByMonth(selectedMonth);
      setSummary(sum);
      setSalesList(sales);
    }
  };

  const totalCashCollected = 
    (summary?.cashSales || 0) + 
    (summary?.orangeMoneySales || 0) + 
    (summary?.moovMoneySales || 0) + 
    (summary?.waveSales || 0);

  return (
    <div className="max-w-md mx-auto p-3.5 sm:p-4 space-y-3 pb-28">
      {/* Onglets Période : Bilan du Jour vs Bilan du Mois */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl sm:rounded-2xl gap-1 text-xs font-bold shadow-2xs">
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
          <span>Bilan Journalier</span>
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
          <span>Bilan Mensuel</span>
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

      {/* Carte du Chiffre d'Affaires Encaissé */}
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

      {/* BLOC 1 : PAIEMENTS CASH & MOBILE MONEY (SECTION AVEC DÉTAIL DÉROULANT) */}
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
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Paiements CASH & Mobile</span>
              <span className="text-sm font-black text-slate-900 font-display">{formatCurrency(totalCashCollected)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold">
            <span>{isCashDetailsOpen ? 'Masquer' : 'Détails'}</span>
            {isCashDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Partie déroulante : Détail des 4 opérateurs */}
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

      {/* BLOC 2 : PAIEMENTS À CRÉDIT & DETTES */}
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

      {/* Historique des Ventes de la Période Choisie */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-xs tracking-tight font-display flex items-center space-x-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {reportPeriod === 'day' ? 'Ventes de cette date' : 'Ventes de ce mois'}
            </span>
          </h4>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {salesList.length} enregistrement{salesList.length > 1 ? 's' : ''}
          </span>
        </div>

        {salesList.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold">Aucune vente enregistrée pour cette sélection</p>
            <p className="text-[10px] text-slate-400">
              {reportPeriod === 'day' ? formatDateLabel(selectedDate) : formatMonthLabel(selectedMonth)}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {salesList.map((sale) => (
              <div key={sale.id} className="py-2 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-slate-900 text-xs truncate font-display">
                    {sale.isCredit ? `Crédit : ${sale.customerName || 'Client'}` : `Vente ${sale.paymentMethod}`}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(sale.createdAt)}</div>
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
              {/* Bouton Partager sur WhatsApp */}
              <button
                type="button"
                onClick={handleShareSummaryWhatsApp}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Envoyer le Résumé sur WhatsApp</span>
              </button>

              {/* Bouton Copier tout le tableau */}
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
