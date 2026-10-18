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
  const [minusActive, setMinusActive] = useState(false);
  const [plusActive, setPlusActive] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      const q = initialQuantity || 1;
      setQuantity(q);
      setInputVal(q.toString());
      setMinusActive(false);
      setPlusActive(false);
    }
  }, [isOpen, product, initialQuantity]);

  const maxAvailableStock = typeof product?.stockQuantity === 'number' ? Math.max(0, product.stockQuantity) : undefined;
  const isOutOfStock = maxAvailableStock !== undefined && maxAvailableStock <= 0;
  const isOverStock = maxAvailableStock !== undefined && quantity > maxAvailableStock;

  const handleIncrement = (delta: number) => {
    triggerHaptic(30);
    setQuantity((prev) => {
      let next = Math.max(1, prev + delta);
      if (maxAvailableStock !== undefined) {
        next = Math.min(next, maxAvailableStock);
      }
      setInputVal(next.toString());
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setInputVal(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (maxAvailableStock !== undefined && parsed > maxAvailableStock) {
        setQuantity(maxAvailableStock);
        setInputVal(maxAvailableStock.toString());
      } else {
        setQuantity(parsed);
      }
    } else if (raw === '') {
      setQuantity(1);
    }
  };

  const handleConfirm = () => {
    if (!product) return;
    if (isOutOfStock) {
      alert("Cet article est en rupture de stock.");
      return;
    }
    if (isOverStock) {
      alert(`Stock insuffisant. Quantité maximale disponible : ${maxAvailableStock}`);
      return;
    }
    triggerHaptic(40);
    const finalQty = Math.max(1, quantity);
    onConfirm(product, finalQty);
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
  }, [isOpen, quantity, product, isOutOfStock, isOverStock, maxAvailableStock, onConfirm, onClose]);

  if (!isOpen || !product) return null;

  const totalAmount = quantity * product.price;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200 border border-slate-100">
        
        {/* En-tête modal épuré */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 font-display">
            Quantité d'article
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fiche Article stylée inspirée du design moderne */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex items-center space-x-3.5 shadow-sm">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs shrink-0">
              <Package className="w-7 h-7 stroke-[2]" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2 font-display">
              {product.name}
            </h4>
            <p className="font-black text-base sm:text-lg text-emerald-600 mt-0.5 font-display">
              {formatCurrency(product.price)}
            </p>
            {maxAvailableStock !== undefined && (
              <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md mt-1 ${
                isOutOfStock
                  ? 'bg-rose-100 text-rose-700'
                  : maxAvailableStock <= (product.minStockAlert ?? 5)
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                Stock : {maxAvailableStock} dispo
              </span>
            )}
          </div>
        </div>

        {/* Sélecteur de Quantité Ultra-Épuré : [-]  [Chiffre]  [+] */}
        <div className="py-2">
          <div className="flex items-center justify-center space-x-5 sm:space-x-7">
            {/* Bouton Moins (Blanc avec retour rouge au clic) */}
            <button
              type="button"
              onClick={() => handleIncrement(-1)}
              onMouseDown={() => setMinusActive(true)}
              onMouseUp={() => setMinusActive(false)}
              onTouchStart={() => setMinusActive(true)}
              onTouchEnd={() => setMinusActive(false)}
              disabled={quantity <= 1 || isOutOfStock}
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-sm ${
                minusActive
                  ? 'bg-rose-600 border-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-500/20'
                  : 'bg-white hover:bg-rose-50/50 border-slate-200/90 text-slate-800 active:bg-rose-600 active:border-rose-600 active:text-white'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              title="Diminuer d'une unité"
            >
              <Minus className="w-7 h-7 stroke-[3]" />
            </button>

            {/* Chiffre au milieu (Sélectionnable & modifiable au clavier) */}
            <div className="flex flex-col items-center justify-center min-w-[70px]">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputVal}
                disabled={isOutOfStock}
                onChange={handleInputChange}
                onFocus={(e) => e.target.select()}
                className="w-24 sm:w-28 text-center text-5xl sm:text-6xl font-black text-slate-950 font-display bg-transparent border-0 focus:outline-none focus:ring-0 select-all p-0 leading-none cursor-text tracking-tight"
                autoFocus
              />
              <span className="text-[11px] font-extrabold text-slate-400 mt-1 uppercase tracking-wider font-display">
                {quantity > 1 ? 'Unités' : 'Unité'}
              </span>
            </div>

            {/* Bouton Plus (Vert plein avec retour vert au clic) */}
            <button
              type="button"
              onClick={() => handleIncrement(1)}
              onMouseDown={() => setPlusActive(true)}
              onMouseUp={() => setPlusActive(false)}
              onTouchStart={() => setPlusActive(true)}
              onTouchEnd={() => setPlusActive(false)}
              disabled={isOutOfStock || (maxAvailableStock !== undefined && quantity >= maxAvailableStock)}
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-md shadow-emerald-700/20 ${
                plusActive
                  ? 'bg-emerald-600 border-emerald-600 text-white ring-4 ring-emerald-500/20'
                  : 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 border-emerald-700 text-white'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              title="Ajouter une unité"
            >
              <Plus className="w-7 h-7 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Alerte stock épuisé ou dépassé */}
        {isOutOfStock ? (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs sm:text-sm text-rose-800 font-bold flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Cet article est en rupture de stock. Vente impossible.</span>
          </div>
        ) : isOverStock ? (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs sm:text-sm text-amber-800 font-semibold flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Stock maximal disponible : {maxAvailableStock} unité(s).</span>
          </div>
        ) : null}

        {/* Boutons d'action */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isOutOfStock || isOverStock}
            className="w-full py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-2xl text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/25 active:scale-98 transition-all cursor-pointer font-display disabled:opacity-50 disabled:bg-slate-400"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Valider l'ajout</span>
            <span className="text-emerald-100 font-extrabold ml-1">({formatCurrency(totalAmount)})</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs sm:text-sm transition-colors cursor-pointer text-center"
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
};
