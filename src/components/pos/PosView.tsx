import React, { useState, useEffect } from 'react';
import { Keypad } from './Keypad';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { salesService } from '../../db/services/salesService';
import { productsService } from '../../db/services/productsService';
import { Product, Sale } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { soundEffects } from '../../utils/soundEffects';
import { ArrowRight, ShoppingCart, Package, Calculator } from 'lucide-react';

const evaluateAddition = (expr: string): number => {
  if (!expr) return 0;
  const parts = expr.split('+');
  let total = 0;
  for (const part of parts) {
    const cleaned = part.trim().replace(/\s/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      total += num;
    }
  }
  return total;
};

export const PosView: React.FC = () => {
  const [amountStr, setAmountStr] = useState<string>('0');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Catalogue d'articles
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedArticlesNotes, setSelectedArticlesNotes] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const list = await productsService.getAll();
    setProducts(list);
  };

  const totalAmount = evaluateAddition(amountStr);

  const handleClear = () => {
    setAmountStr('0');
    setSelectedArticlesNotes([]);
  };

  const handleSelectProduct = (productId: string) => {
    triggerHaptic(35);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (amountStr === '0') {
      setAmountStr(product.price.toString());
    } else if (amountStr.trim().endsWith('+')) {
      setAmountStr(amountStr + product.price.toString());
    } else {
      setAmountStr(amountStr + ' + ' + product.price.toString());
    }
    setSelectedArticlesNotes((prev) => [...prev, product.name]);
  };

  const handleOpenPayment = () => {
    if (totalAmount <= 0) return;
    triggerHaptic(40);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmSale = async (data: any) => {
    const finalNotes = [
      data.notes,
      selectedArticlesNotes.length > 0 ? selectedArticlesNotes.join(', ') : ''
    ].filter(Boolean).join(' - ');

    const recorded = await salesService.recordSale({
      totalAmount,
      ...data,
      notes: finalNotes || undefined
    });
    triggerDoubleHaptic();
    soundEffects.notifySaleSuccess(recorded.totalAmount, recorded.isCredit);
    setIsPaymentModalOpen(false);
    setLastSale(recorded);
    setIsReceiptModalOpen(true);
    setAmountStr('0');
    setSelectedArticlesNotes([]);
  };

  const hasCalculation = amountStr.includes('+');

  return (
    <div className="max-w-md mx-auto p-4 space-y-3.5 pb-24">
      {/* Écran d'affichage du montant et du calcul */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between min-h-[145px] border border-emerald-700/50">
        <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold tracking-wider uppercase">
          <div className="flex items-center space-x-1.5">
            {hasCalculation ? (
              <Calculator className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            <span>{hasCalculation ? 'Total Calculé' : 'Montant à Encaisser'}</span>
          </div>
          <span className="bg-emerald-700/60 px-2 py-0.5 rounded-full text-[10px] font-bold">FCFA</span>
        </div>

        <div className="text-right mt-2">
          {/* Formule de calcul si addition en cours */}
          {hasCalculation && (
            <div className="text-xs sm:text-sm font-semibold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg inline-block max-w-full truncate mb-1 border border-amber-500/30">
              {amountStr} {amountStr.trim().endsWith('+') ? '...' : '='}
            </div>
          )}

          <div className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm truncate">
            {formatCurrency(totalAmount).replace(' FCFA', '')}
          </div>

          <div className="text-[11px] text-emerald-300/80 mt-1">
            {selectedArticlesNotes.length > 0 ? (
              <span className="font-semibold text-amber-300 truncate block">
                Articles : {selectedArticlesNotes.join(' + ')}
              </span>
            ) : (
              'Francs CFA (XOF)'
            )}
          </div>
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT DES ARTICLES DU CATALOGUE */}
      {products.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
            <Package className="w-4 h-4" />
          </div>
          <select
            value=""
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
          >
            <option value="" disabled>
              📦 Choisir un article rapide (+ additionner le prix)...
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clavier tactile avec touche + et vibreur */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <Keypad
          value={amountStr}
          onChange={setAmountStr}
          onClear={handleClear}
        />
      </div>

      {/* Bouton d'encaissement principal */}
      <button
        type="button"
        disabled={totalAmount <= 0}
        onClick={handleOpenPayment}
        className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center space-x-2 transition-all ${
          totalAmount > 0
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-98'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
        }`}
      >
        <span>ENCAISSER ({formatCurrency(totalAmount)})</span>
        <ArrowRight className="w-6 h-6" />
      </button>

      {/* Modal de sélection de mode de paiement */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={totalAmount}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmSale}
      />

      {/* Modal de reçu et partage WhatsApp */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        sale={lastSale}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};
