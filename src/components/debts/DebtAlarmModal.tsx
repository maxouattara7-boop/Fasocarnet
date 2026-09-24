import React, { useEffect } from 'react';
import { Customer } from '../../types';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/formatters';
import { generateWhatsAppDebtReminderUrl } from '../../utils/whatsapp';
import { soundEffects } from '../../utils/soundEffects';
import { BellRing, MessageSquare, X, ArrowRight, User } from 'lucide-react';

interface DebtAlarmModalProps {
  isOpen: boolean;
  debtors: Customer[];
  onClose: () => void;
  onNavigateToDebts: () => void;
}

export const DebtAlarmModal: React.FC<DebtAlarmModalProps> = ({
  isOpen,
  debtors,
  onClose,
  onNavigateToDebts
}) => {
  const { shopProfile } = useAppStore();

  useEffect(() => {
    if (isOpen && debtors.length > 0) {
      soundEffects.playDebtAlarmSound();
    }
  }, [isOpen, debtors.length]);

  if (!isOpen || debtors.length === 0) return null;

  const totalOutstanding = debtors.reduce((sum, c) => sum + c.totalDebt, 0);

  const handleWhatsAppReminder = (customer: Customer) => {
    const url = generateWhatsAppDebtReminderUrl(
      customer,
      { remainingAmount: customer.totalDebt },
      shopProfile || undefined
    );
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-amber-200">
        
        {/* En-tête Alarme */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-4 sm:p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white shrink-0 animate-bounce">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 bg-black/20 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-100">
                Rappel Automatique du Patron
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight mt-0.5">
                Clients à Relancer ({debtors.length})
              </h3>
            </div>
          </div>

          {/* Total à recouvrer */}
          <div className="mt-3 bg-black/20 rounded-2xl p-3 backdrop-blur-xs flex items-center justify-between border border-white/10">
            <span className="text-xs font-bold text-amber-100">Total des créances :</span>
            <span className="text-lg sm:text-xl font-black text-white">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
        </div>

        {/* Corps : Liste des clients à relancer */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 max-h-[45vh]">
          <p className="text-[11px] text-slate-500 font-medium">
            Voici la liste de vos clients ayant une dette en attente. Relancez-les en un clic sur WhatsApp :
          </p>

          {debtors.map((c) => (
            <div
              key={c.id}
              className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name ? c.name.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{c.name}</h4>
                    <p className="text-[10px] text-slate-500">{c.phone}</p>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xs font-black text-amber-700">
                    Dû : {formatCurrency(c.totalDebt)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsAppReminder(c)}
                className="px-3 py-2 bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold rounded-xl text-[11px] flex items-center space-x-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Relancer sur WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
                <span>Relancer</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer avec Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToDebts();
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <span>Ouvrir l'Espace Dettes & Encaissements</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Fermer le rappel
          </button>
        </div>

      </div>
    </div>
  );
};
