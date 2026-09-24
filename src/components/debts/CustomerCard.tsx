import React, { useState } from 'react';
import { Customer, DebtPayment, DebtRecord } from '../../types';
import { useAppStore } from '../../store/appStore';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { generateWhatsAppDebtReminderUrl } from '../../utils/whatsapp';
import { debtsService } from '../../db/services/debtsService';
import { 
  MessageSquare, 
  Phone, 
  ArrowDownRight, 
  User, 
  Trash2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  onPayDebt: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onPayDebt, onDelete }) => {
  const { shopProfile } = useAppStore();
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<{ debts: DebtRecord[]; payments: DebtPayment[] }>({
    debts: [],
    payments: []
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleToggleHistory = async () => {
    if (!showHistory) {
      setIsLoadingHistory(true);
      try {
        const res = await debtsService.getCustomerFullDebtHistory(customer.id);
        setHistoryData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    setShowHistory(!showHistory);
  };

  const handleWhatsAppReminder = () => {
    const url = generateWhatsAppDebtReminderUrl(
      customer,
      { remainingAmount: customer.totalDebt },
      shopProfile || undefined
    );
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:border-amber-400/80 transition-all space-y-3 relative group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 font-display">
            {customer.name ? customer.name.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm font-display truncate">
              {customer.name}
            </h4>
            <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 font-medium mt-0.5">
              <Phone className="w-3 h-3 text-gray-400" />
              <span>{customer.phone}</span>
            </div>
            {customer.notes && (
              <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">{customer.notes}</p>
            )}
            <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Inscrit le {formatDateTime(customer.createdAt).split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200/80 text-right">
            <span className="text-[9px] uppercase font-black text-amber-800 tracking-wider block font-display">
              Dette Restante
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-700 font-display">
              {formatCurrency(customer.totalDebt)}
            </span>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(customer)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              title="Supprimer cette dette"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bouton pour afficher/masquer les dates et l'historique complet des mouvements */}
      <button
        type="button"
        onClick={handleToggleHistory}
        className="w-full py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl text-[11px] font-bold text-slate-600 flex items-center justify-between transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Dates des dettes & Historique des règlements</span>
        </div>
        {showHistory ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {/* Accordéon Historique détaillé */}
      {showHistory && (
        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2 text-xs animate-in fade-in duration-150">
          {isLoadingHistory ? (
            <p className="text-[11px] text-slate-400 text-center py-2">Chargement de l'historique...</p>
          ) : (
            <>
              {/* Dettes contractées (Dates de création) */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  🔴 Dettes contractées :
                </span>
                {historyData.debts.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Aucun enregistrement</p>
                ) : (
                  historyData.debts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-[11px]">
                          {formatCurrency(d.initialAmount)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Date : <span className="font-medium text-slate-700">{formatDateTime(d.createdAt)}</span>
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        d.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.status === 'PAID' ? 'Soldée' : `Reste: ${formatCurrency(d.remainingAmount)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Règlements / Acomptes reçus (Dates de règlement) */}
              <div className="space-y-1 pt-1 border-t border-slate-200">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                  🟢 Acomptes & Règlements reçus :
                </span>
                {historyData.payments.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Aucun acompte versé pour le moment</p>
                ) : (
                  historyData.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                      <div>
                        <p className="font-bold text-emerald-900 text-[11px]">
                          + {formatCurrency(p.amount)} ({p.paymentMethod})
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Réglement le : <span className="font-medium text-slate-700">{formatDateTime(p.createdAt)}</span>
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Boutons d'action : Relance WhatsApp & Règlement */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleWhatsAppReminder}
          className="py-2.5 px-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 active:scale-95 transition-all cursor-pointer font-display"
        >
          <MessageSquare className="w-3.5 h-3.5 fill-[#128C7E]" />
          <span>Relancer WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => onPayDebt(customer)}
          className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 shadow-xs active:scale-95 transition-all cursor-pointer font-display"
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>Régler / Acompte</span>
        </button>
      </div>
    </div>
  );
};
