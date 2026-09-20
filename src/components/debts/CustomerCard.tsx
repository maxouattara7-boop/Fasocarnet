import React from 'react';
import { Customer } from '../../types';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/formatters';
import { generateWhatsAppDebtReminderUrl } from '../../utils/whatsapp';
import { MessageSquare, Phone, ArrowDownRight } from 'lucide-react';

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
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-amber-300 transition-all space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-gray-900 text-base">{customer.name}</h4>
          <div className="flex items-center space-x-1.5 text-xs text-gray-500 mt-0.5">
            <Phone className="w-3.5 h-3.5" />
            <span>{customer.phone}</span>
          </div>
          {customer.notes && (
            <p className="text-[11px] text-gray-400 italic mt-1">{customer.notes}</p>
          )}
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
            Dette Restante
          </span>
          <span className="text-lg font-black text-amber-700">
            {formatCurrency(customer.totalDebt)}
          </span>
        </div>
      </div>

      {/* Boutons d'action : Relance WhatsApp & Règlement */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
        <button
          type="button"
          onClick={handleWhatsAppReminder}
          className="py-2.5 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
        >
          <MessageSquare className="w-4 h-4 fill-[#128C7E]" />
          <span>Relancer (WhatsApp)</span>
        </button>

        <button
          type="button"
          onClick={() => onPayDebt(customer)}
          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all"
        >
          <ArrowDownRight className="w-4 h-4" />
          <span>Régler / Acompte</span>
        </button>
      </div>
    </div>
  );
};
