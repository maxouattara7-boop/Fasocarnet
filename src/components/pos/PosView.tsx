import React, { useState, useEffect } from 'react';
import { Keypad } from './Keypad';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { salesService } from '../../db/services/salesService';
import { productsService } from '../../db/services/productsService';
import { Product, Sale, SaleItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { soundEffects } from '../../utils/soundEffects';
import { ArrowRight, ShoppingCart, Package, Calculator, Plus, Search, X, ChevronDown } from 'lucide-react';

const evaluateAddition = (expression: string): number => {
  try {
    const sanitized = expression.replace(/[^0-9+]/g, '');
    const parts = sanitized.split('+').filter((p) => p.trim() !== '');
    return parts.reduce((sum, part) => sum + (parseInt(part, 10) || 0), 0);
  } catch {
    return 0;
  }
};

export const PosView: React.FC = () => {
  const [amountStr, setAmountStr] = useState<string>('0');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Catalogue d'articles & sélecteur modal
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [isArticlePickerOpen, setIsArticlePickerOpen] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');

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
    setSelectedItems([]);
  };

  const handleSelectProduct = (productId: string) => {
    triggerHaptic(35);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setSelectedItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          description: product.name,
          quantity: 1,
          unitPrice: product.price
        }
      ];
    });

    if (amountStr === '0') {
      setAmountStr(product.price.toString());
    } else if (amountStr.trim().endsWith('+')) {
      setAmountStr(amountStr + product.price.toString());
    } else {
      setAmountStr(amountStr + ' + ' + product.price.toString());
    }
  };

  const handleOpenPayment = () => {
    if (totalAmount <= 0) return;
    triggerHaptic(40);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmSale = async (data: any) => {
    const recorded = await salesService.recordSale({
      totalAmount,
      ...data,
      items: selectedItems.length > 0 ? selectedItems : undefined,
      notes: data.notes || undefined
    });
    triggerDoubleHaptic();
    soundEffects.notifySaleSuccess(recorded.totalAmount, recorded.isCredit);
    setIsPaymentModalOpen(false);
    setLastSale(recorded);
    setIsReceiptModalOpen(true);
    setAmountStr('0');
    setSelectedItems([]);
  };

  const hasCalculation = amountStr.includes('+');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(articleSearch.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 pb-24">
      {/* Écran d'affichage du montant et du calcul */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-4 sm:p-4.5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[118px] sm:min-h-[125px] border border-emerald-700/50">
        <div className="flex items-center justify-between text-emerald-300 text-[11px] font-bold tracking-wider uppercase">
          <div className="flex items-center space-x-1.5">
            {hasCalculation ? (
              <Calculator className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            <span>{hasCalculation ? 'Total Calculé' : 'Montant à Encaisser'}</span>
          </div>
          <span className="bg-emerald-700/70 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide">FCFA</span>
        </div>

        <div className="text-right mt-1">
          {/* Formule de calcul si addition en cours */}
          {hasCalculation && (
            <div className="text-[11px] sm:text-xs font-semibold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md inline-block max-w-full truncate mb-0.5 border border-amber-500/30">
              {amountStr} {amountStr.trim().endsWith('+') ? '...' : '='}
            </div>
          )}

          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xs truncate leading-tight">
            {formatCurrency(totalAmount).replace(' FCFA', '')}
          </div>

          <div className="text-[10px] text-emerald-300/80 mt-0.5">
            {selectedItems.length > 0 ? (
              <span className="font-medium text-amber-300 truncate block">
                {selectedItems.map((it) => `${it.description}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' • ')}
              </span>
            ) : (
              'Francs CFA (XOF)'
            )}
          </div>
        </div>
      </div>

      {/* BARRE D'ARTICLES RAPIDES (CHIPS DÉFILANTES & BOUTON COMPACT) */}
      {products.length > 0 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {/* Bouton catalogue complet */}
          <button
            type="button"
            onClick={() => {
              setArticleSearch('');
              setIsArticlePickerOpen(true);
            }}
            className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Ouvrir le catalogue d'articles"
          >
            <Package className="w-3.5 h-3.5 text-amber-300" />
            <span>Articles ({products.length})</span>
            <ChevronDown className="w-3 h-3 text-emerald-200" />
          </button>

          {/* Puces des articles fréquents en 1-tap direct */}
          {products.slice(0, 8).map((prod) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => handleSelectProduct(prod.id)}
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-slate-800 border border-emerald-200/80 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shrink-0 shadow-2xs active:scale-95 transition-all group cursor-pointer"
            >
              <Plus className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-900">{prod.name}</span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200/60">
                {formatCurrency(prod.price).replace(' FCFA', '')}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Clavier tactile avec touche + et vibreur */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-gray-100">
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
        className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-base shadow-md flex items-center justify-center space-x-2 transition-all ${
          totalAmount > 0
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-98'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
        }`}
      >
        <span>ENCAISSER ({formatCurrency(totalAmount)})</span>
        <ArrowRight className="w-5 h-5" />
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

      {/* Modal de Sélection Rapide d'Articles du Catalogue */}
      {isArticlePickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2 text-emerald-900">
                <div className="w-7 h-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-tight">Catalogue d'Articles</h3>
                  <p className="text-[10px] text-slate-500">{products.length} article(s) enregistré(s)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArticlePickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Liste des articles */}
            <div className="p-3 space-y-1.5 overflow-y-auto max-h-64 divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  Aucun article trouvé.
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      handleSelectProduct(prod.id);
                      setIsArticlePickerOpen(false);
                    }}
                    className="w-full pt-2 pb-1.5 px-2 rounded-xl flex items-center justify-between hover:bg-emerald-50/70 active:bg-emerald-100 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">{prod.name}</span>
                        <span className="text-emerald-700 font-extrabold text-[11px] tracking-tight">{formatCurrency(prod.price)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors">
                      + Ajouter
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
