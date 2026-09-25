import React, { useState, useEffect } from 'react';
import { X, Percent, Check, Trash2, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export interface DiscountData {
  type: 'PERCENT' | 'AMOUNT';
  value: number; // e.g. 10 for 10%, or 500 for 500 FCFA
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
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (currentDiscount) {
        setDiscountType(currentDiscount.type);
        setInputValue(currentDiscount.value.toString());
      } else {
        setDiscountType('PERCENT');
        setInputValue('10');
      }
    }
  }, [isOpen, currentDiscount]);

  if (!isOpen) return null;

  const numValue = Math.max(0, parseFloat(inputValue) || 0);

  let discountAmount = 0;
  if (discountType === 'PERCENT') {
    const cappedPercent = Math.min(100, numValue);
    discountAmount = Math.round((subtotal * cappedPercent) / 100);
  } else {
    discountAmount = Math.min(subtotal, numValue);
  }

  const finalAmount = Math.max(0, subtotal - discountAmount);

  const percentPresets = [5, 10, 15, 20, 25, 50];
  const amountPresets = [250, 500, 1000, 2000, 5000].filter(p => p <= subtotal);

  const handleConfirm = () => {
    if (discountAmount <= 0) {
      onApply(null);
    } else {
      onApply({
        type: discountType,
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in slide-in-from-bottom duration-200">
        {/* Header modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold font-display">Appliquer une Remise</h3>
              <p className="text-[11px] text-amber-100">Rabais commercial sur le panier de caisse</p>
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

        {/* Corps modal */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Choix du mode de remise : Pourcentage ou Montant fixe */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">
              Type de réduction
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('PERCENT');
                  if (discountType !== 'PERCENT') setInputValue('10');
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  discountType === 'PERCENT'
                    ? 'bg-white text-orange-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5 text-orange-600" />
                <span>Pourcentage (%)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDiscountType('AMOUNT');
                  if (discountType !== 'AMOUNT') setInputValue('500');
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  discountType === 'AMOUNT'
                    ? 'bg-white text-orange-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="font-bold text-xs text-orange-600">FCFA</span>
                <span>Montant Fixe (FCFA)</span>
              </button>
            </div>
          </div>

          {/* Raccourcis de remises rapides */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-display">
              Raccourcis rapides
            </label>
            <div className="flex flex-wrap gap-1.5">
              {discountType === 'PERCENT' ? (
                percentPresets.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setInputValue(pct.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      numValue === pct
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    -{pct}%
                  </button>
                ))
              ) : (
                amountPresets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInputValue(amt.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      numValue === amt
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    -{formatCurrency(amt)}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Saisie personnalisée */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-display">
              Valeur personnalisée {discountType === 'PERCENT' ? '(en %)' : '(en FCFA)'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max={discountType === 'PERCENT' ? '100' : subtotal.toString()}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                placeholder={discountType === 'PERCENT' ? 'Ex: 10' : 'Ex: 1000'}
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                {discountType === 'PERCENT' ? '%' : 'FCFA'}
              </span>
            </div>
          </div>

          {/* Récapitulatif dynamique */}
          <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Sous-total initial :</span>
              <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-amber-900 font-bold">
              <span>Remise accordée :</span>
              <span className="text-red-600">-{formatCurrency(discountAmount)} {discountType === 'PERCENT' && numValue > 0 ? `(-${numValue}%)` : ''}</span>
            </div>

            <div className="pt-2 border-t border-amber-200/80 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-display">Net à encaisser :</span>
              <span className="text-lg font-black text-emerald-800 font-display">{formatCurrency(finalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
          {currentDiscount && (
            <button
              type="button"
              onClick={handleRemove}
              className="py-2.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
              title="Supprimer la remise actuelle"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xs:inline">Annuler Remise</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer font-display"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Appliquer ({formatCurrency(discountAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
