import React, { useState, useEffect } from 'react';
import { DailySummary, Sale } from '../../types';
import { salesService } from '../../db/services/salesService';
import { useAppStore } from '../../store/appStore';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { generateDailyReportWhatsAppUrl } from '../../utils/whatsapp';
import { BarChart3, Banknote, Smartphone, CreditCard, ArrowDownLeft, Calendar, MessageSquare } from 'lucide-react';

export const DailyReportView: React.FC = () => {
  const { shopProfile } = useAppStore();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-28">
      {/* Sélecteur de date */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-2 text-slate-700">
          <Calendar className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
          <span className="text-xs font-bold font-display">Date du Bilan :</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
        />
      </div>

      {/* Carte du Chiffre d'Affaires Encaissé */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 rounded-3xl shadow-xl space-y-2 border border-emerald-700/50">
        <div className="flex items-center justify-between text-emerald-300 text-xs font-black uppercase tracking-wider font-display">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 stroke-[2.5]" />
            <span>Total Encaissé</span>
          </div>
          <span className="bg-emerald-700/60 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">{summary?.salesCount || 0} vente(s)</span>
        </div>

        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-display">
          {formatCurrency(summary?.totalSales || 0)}
        </div>

        <p className="text-[11px] text-emerald-300/80 font-medium">
          Chiffre d'affaires net encaissé (espèces + mobile money)
        </p>
      </div>

      {/* BOUTON D'ACTION PRINCIPAL : ENVOYER LE POINT DU JOUR AU PATRON */}
      <button
        type="button"
        onClick={handleSendReportToOwner}
        className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-2xl shadow-lg shadow-green-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-all text-xs sm:text-sm font-display"
      >
        <MessageSquare className="w-5 h-5 fill-white" />
        <span>ENVOYER LE POINT DU SOIR AU PATRON (WhatsApp)</span>
      </button>

      {/* Ventilation par Mode de Règlement */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold font-display">
            <Banknote className="w-4 h-4 stroke-[2.2]" />
            <span>Espèces (Cash)</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-display">
            {formatCurrency(summary?.cashSales || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center space-x-1.5 text-[#ff6600] text-xs font-bold font-display">
            <Smartphone className="w-4 h-4 stroke-[2.2] text-[#ff6600]" />
            <span>Orange Money</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-display">
            {formatCurrency(summary?.orangeMoneySales || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center space-x-1.5 text-[#005baa] text-xs font-bold font-display">
            <Smartphone className="w-4 h-4 stroke-[2.2] text-[#005baa]" />
            <span>Moov Money</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-display">
            {formatCurrency(summary?.moovMoneySales || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center space-x-1.5 text-[#1dc4fe] text-xs font-bold font-display">
            <Smartphone className="w-4 h-4 stroke-[2.2] text-[#1dc4fe]" />
            <span>Wave</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-display">
            {formatCurrency(summary?.waveSales || 0)}
          </div>
        </div>
      </div>

      {/* Crédits accordés vs Dettes Recouvrées */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-amber-50/80 p-4 rounded-3xl border border-amber-200/80 shadow-sm space-y-1">
          <div className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center space-x-1 font-display">
            <CreditCard className="w-3.5 h-3.5 text-amber-700" />
            <span>Crédits Accordés</span>
          </div>
          <div className="text-base font-black text-amber-950 font-display">
            {formatCurrency(summary?.creditSales || 0)}
          </div>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-3xl border border-emerald-200/80 shadow-sm space-y-1">
          <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center space-x-1 font-display">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
            <span>Dettes Récupérées</span>
          </div>
          <div className="text-base font-black text-emerald-950 font-display">
            {formatCurrency(summary?.totalRecoveredDebts || 0)}
          </div>
        </div>
      </div>

      {/* Historique Récent des Ventes */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3.5">
        <h4 className="font-black text-slate-900 text-sm tracking-tight font-display">Dernières Ventes Enregistrées</h4>
        <div className="divide-y divide-slate-100">
          {recentSales.slice(0, 10).map((sale) => (
            <div key={sale.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">
                  {sale.isCredit ? `Crédit : ${sale.customerName || 'Client'}` : `Vente ${sale.paymentMethod}`}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{formatDateTime(sale.createdAt)}</div>
              </div>
              <div className={`font-black font-display text-sm ${sale.isCredit ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(sale.totalAmount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
