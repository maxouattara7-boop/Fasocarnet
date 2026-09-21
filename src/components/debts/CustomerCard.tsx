import React from 'react';
import { Customer } from '../../types';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/formatters';
import { generateWhatsAppDebtReminderUrl } from '../../utils/whatsapp';
import { MessageSquare, Phone, ArrowDownRight, User } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  onPayDebt: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onPayDebt }) => {
  const { shopProfile } = useAppStore();

  const handleWhatsAppReminder = () => {
    const url = generateWhatsAppDebtReminderUrl(
      customer,
      { remainingAmount: customer.totalDebt },
      shopProfile || undefined
    );
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:border-amber-400/80 transition-all space-y-3">
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
          </div>
        </div>

        <div className="bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200/80 text-right shrink-0">
          <span className="text-[9px] uppercase font-black text-amber-800 tracking-wider block font-display">
            Dette Restante
          </span>
          <span className="text-xs sm:text-sm font-black text-amber-700 font-display">
            {formatCurrency(customer.totalDebt)}
          </span>
        </div>
      </div>

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
