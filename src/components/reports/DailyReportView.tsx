import React, { useState, useEffect } from 'react';
import { DailySummary, Sale } from '../../types';
import { salesService } from '../../db/services/salesService';
import { useAppStore } from '../../store/appStore';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { generateDailyReportWhatsAppUrl } from '../../utils/whatsapp';
import { 
  BarChart3, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  ArrowDownLeft, 
  Calendar, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Wallet
} from 'lucide-react';

export const DailyReportView: React.FC = () => {
  const { shopProfile } = useAppStore();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isCashDetailsOpen, setIsCashDetailsOpen] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [selectedDate]);

  const loadReportData = async () => {
    const sum = await salesService.getDailySummary(selectedDate);
    const sales = await salesService.getRecentSales(30);
    setSummary(sum);
    setRecentSales(sales);
  };

  const handleSendReportToOwner = () => {
    if (!summary) return;
    const url = generateDailyReportWhatsAppUrl(summary, shopProfile || undefined);
    window.open(url, '_blank');
  };

  const totalCashCollected = 
    (summary?.cashSales || 0) + 
    (summary?.orangeMoneySales || 0) + 
    (summary?.moovMoneySales || 0) + 
    (summary?.waveSales || 0);

  return (
    <div className="max-w-md mx-auto p-3 space-y-2.5 pb-28">
      {/* Sélecteur de date */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center space-x-1.5 text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
          <span className="text-[11px] font-bold font-display">Date du Bilan :</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
        />
      </div>

      {/* Carte du Chiffre d'Affaires Encaissé */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-4 rounded-2xl shadow-md space-y-1 border border-emerald-700/50">
        <div className="flex items-center justify-between text-emerald-300 text-[10px] font-bold uppercase tracking-wider font-display">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Total Encaissé</span>
          </div>
          <span className="bg-emerald-700/60 px-2 py-0.5 rounded-md text-[9px] font-extrabold">{summary?.salesCount || 0} vente(s)</span>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          {formatCurrency(summary?.totalSales || 0)}
        </div>

        <p className="text-[9px] text-emerald-300/80 font-medium">
          Chiffre d'affaires net encaissé (espèces + mobile money)
        </p>
      </div>

      {/* BOUTON D'ACTION PRINCIPAL : ENVOYER LE POINT DU JOUR AU PATRON */}
      <button
        type="button"
        onClick={handleSendReportToOwner}
        className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl shadow-sm shadow-green-600/20 flex items-center justify-center space-x-1.5 active:scale-98 transition-all text-xs font-display"
      >
        <MessageSquare className="w-3.5 h-3.5 fill-white" />
        <span>ENVOYER LE POINT AU PATRON (WhatsApp)</span>
      </button>

      {/* BLOC 1 : PAIEMENTS CASH & MOBILE MONEY (SECTION AVEC DÉTAIL DÉROULANT) */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div 
          onClick={() => setIsCashDetailsOpen(!isCashDetailsOpen)}
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Paiements CASH & Mobile</span>
              <span className="text-sm font-extrabold text-slate-900 font-display">{formatCurrency(totalCashCollected)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-emerald-700 text-[10px] font-bold">
            <span>{isCashDetailsOpen ? 'Masquer' : 'Détails'}</span>
            {isCashDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Partie déroulante : Détail des 4 opérateurs */}
        {isCashDetailsOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-100 grid grid-cols-2 gap-1.5 animate-in fade-in duration-150">
            <div className="bg-slate-50 p-2 rounded-lg space-y-0.5">
              <div className="flex items-center space-x-1 text-emerald-700 text-[10px] font-bold font-display">
                <Banknote className="w-3 h-3 stroke-[2.2]" />
                <span>Espèces</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.cashSales || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg space-y-0.5">
              <div className="flex items-center space-x-1 text-[#ff6600] text-[10px] font-bold font-display">
                <Smartphone className="w-3 h-3 stroke-[2.2] text-[#ff6600]" />
                <span>Orange Money</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.orangeMoneySales || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg space-y-0.5">
              <div className="flex items-center space-x-1 text-[#005baa] text-[10px] font-bold font-display">
                <Smartphone className="w-3 h-3 stroke-[2.2] text-[#005baa]" />
                <span>Moov Money</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 font-display truncate">
                {formatCurrency(summary?.moovMoneySales || 0)}
              </div>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg space-y-0.5">
              <div className="flex items-center space-x-1 text-[#1dc4fe] text-[10px] font-bold font-display">
                <Smartphone className="w-3 h-3 stroke-[2.2] text-[#1dc4fe]" />
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
        <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 shadow-xs space-y-0.5">
          <div className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1 font-display">
            <CreditCard className="w-3 h-3 text-amber-700" />
            <span>Crédits Accordés</span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-amber-950 font-display truncate">
            {formatCurrency(summary?.creditSales || 0)}
          </div>
        </div>

        <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 shadow-xs space-y-0.5">
          <div className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1 font-display">
            <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
            <span>Dettes Récupérées</span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-emerald-950 font-display truncate">
            {formatCurrency(summary?.totalRecoveredDebts || 0)}
          </div>
        </div>
      </div>

      {/* Historique Récent des Ventes */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-2">
        <h4 className="font-bold text-slate-900 text-xs tracking-tight font-display">Dernières Ventes Enregistrées</h4>
        <div className="divide-y divide-slate-100">
          {recentSales.slice(0, 10).map((sale) => (
            <div key={sale.id} className="py-1.5 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-semibold text-slate-900 text-[11px] truncate">
                  {sale.isCredit ? `Crédit : ${sale.customerName || 'Client'}` : `Vente ${sale.paymentMethod}`}
                </div>
                <div className="text-[9px] text-slate-400">{formatDateTime(sale.createdAt)}</div>
              </div>
              <div className={`font-extrabold font-display text-xs flex-shrink-0 ${sale.isCredit ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(sale.totalAmount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
