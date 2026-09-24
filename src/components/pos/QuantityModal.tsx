import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { Package, Plus, Minus, X, Check, AlertTriangle } from 'lucide-react';

interface QuantityModalProps {
  isOpen: boolean;
  product: Product | null;
  initialQuantity?: number;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number) => void;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  isOpen,
  product,
  initialQuantity = 1,
  onClose,
  onConfirm
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [inputVal, setInputVal] = useState<string>(initialQuantity.toString());

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(initialQuantity || 1);
      setInputVal((initialQuantity || 1).toString());
    }
  }, [isOpen, product, initialQuantity]);

  if (!isOpen || !product) return null;

  const handleIncrement = (delta: number) => {
    triggerHaptic(30);
    setQuantity((prev) => {
      const next = Math.max(1, prev + delta);
      setInputVal(next.toString());
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setInputVal(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(parsed);
    } else if (raw === '') {
      setQuantity(1);
    }
  };

  const handleConfirm = () => {
    triggerHaptic(40);
    const finalQty = Math.max(1, quantity);
    onConfirm(product, finalQty);
  };

  const totalAmount = quantity * product.price;
  const hasStockWarning = typeof product.stockQuantity === 'number' && product.stockQuantity < quantity;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 border border-slate-100">
        {/* En-tête modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Quantité d'article
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Détails Prix Unitaire et Stock */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Prix unitaire</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {formatCurrency(product.price)}
            </span>
          </div>
          {typeof product.stockQuantity === 'number' && (
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Stock disponible</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded-full ${
                product.stockQuantity <= 0
                  ? 'bg-red-100 text-red-700'
                  : product.stockQuantity <= (product.minStockAlert ?? 5)
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {product.stockQuantity} unité(s)
              </span>
            </div>
          )}
        </div>

        {/* Sélecteur de Quantité Stepper & Clavier */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 text-center">
            Précisez le nombre d'unités à ajouter :
          </label>
          <div className="flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={() => handleIncrement(-1)}
              disabled={quantity <= 1}
              className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 flex items-center justify-center text-lg font-black transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-5 h-5" />
            </button>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputVal}
              onChange={handleInputChange}
              onFocus={(e) => e.target.select()}
              className="w-24 h-12 bg-white border-2 border-emerald-500 rounded-2xl text-center text-2xl font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/20 outline-none shadow-inner font-display"
              autoFocus
            />

            <button
              type="button"
              onClick={() => handleIncrement(1)}
              className="w-12 h-12 rounded-2xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center text-lg font-black transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Raccourcis tactiles rapides (+1, +2, +5, +10) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[1, 2, 5, 10].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => handleIncrement(step)}
                className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                +{step}
              </button>
            ))}
          </div>
        </div>

        {/* Alerte stock dépassé si nécessaire */}
        {hasStockWarning && (
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-800 font-semibold flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Attention : la quantité demandée ({quantity}) dépasse le stock restant ({product.stockQuantity}).</span>
          </div>
        )}

        {/* Sous-total calculé */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold text-emerald-300 uppercase block">Total calculé</span>
            <span className="text-xs font-semibold text-emerald-100">
              {quantity} × {formatCurrency(product.price)}
            </span>
          </div>
          <span className="text-xl font-extrabold text-white font-display">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all active:scale-98 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer font-display"
          >
            <Check className="w-4 h-4" />
            <span>Valider l'ajout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
