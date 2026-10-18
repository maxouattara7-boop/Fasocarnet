import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export interface DiscountData {
  type: 'PERCENT' | 'AMOUNT';
  value: number; // e.g. 10 for 10%
  calculatedAmount: number; // Montant réel en FCFA déduit
}

interface DiscountModalProps {
  isOpen: boolean;
  subtotal: number;
  currentDiscount: DiscountData | null;
  onApply: (discount: DiscountData | null) => void;
  onClose: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  subtotal,
  currentDiscount,
  onApply,
  onClose
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (currentDiscount) {
        setInputValue(currentDiscount.value.toString());
      } else {
        setInputValue('10');
      }
    }
  }, [isOpen, currentDiscount]);

  const numValue = Math.max(0, Math.min(100, parseFloat(inputValue) || 0));
  const discountAmount = Math.round((subtotal * numValue) / 100);
  const finalAmount = Math.max(0, subtotal - discountAmount);

  const handleConfirm = () => {
    if (discountAmount <= 0) {
      onApply(null);
    } else {
      onApply({
        type: 'PERCENT',
        value: numValue,
        calculatedAmount: discountAmount
      });
    }
    onClose();
  };

  const handleRemove = () => {
    onApply(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, discountAmount, numValue, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm sm:max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in slide-in-from-bottom duration-200">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-display">Appliquer une Remise</h3>
              <p className="text-xs text-amber-100">Rabais commercial en pourcentage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps épuré */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Saisie du pourcentage */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-display">
              Pourcentage de Remise (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl font-black text-2xl text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-2xs font-display"
                placeholder="Ex: 10"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-orange-600 pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Récapitulatif dynamique épuré */}
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/90 space-y-2.5">
            <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600 font-medium">
              <span>Sous-total initial :</span>
              <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-xs sm:text-sm text-amber-900 font-bold">
              <span>Remise accordée :</span>
              <span className="text-red-600 font-black">
                -{formatCurrency(discountAmount)} {numValue > 0 ? `(-${numValue}%)` : ''}
              </span>
            </div>

            <div className="pt-2 border-t border-amber-200/80 flex justify-between items-center">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 font-display">
                Net à encaisser :
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 font-display">
                {formatCurrency(finalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
          {currentDiscount && (
            <button
              type="button"
              onClick={handleRemove}
              className="py-2.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 cursor-pointer"
              title="Supprimer la remise actuelle"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xs:inline">Annuler Remise</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer font-display"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer font-display"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Appliquer ({formatCurrency(discountAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
