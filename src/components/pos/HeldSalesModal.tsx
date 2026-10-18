import React from 'react';
import { HeldSale } from './PosView';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Clock, Play, Trash2, X, AlertCircle, ShoppingCart } from 'lucide-react';

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldSales: HeldSale[];
  onRestore: (sale: HeldSale) => void;
  onDelete: (id: string) => void;
  hasCurrentSale: boolean;
}

export const HeldSalesModal: React.FC<HeldSalesModalProps> = ({
  isOpen,
  onClose,
  heldSales,
  onRestore,
  onDelete,
  hasCurrentSale
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
        
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                Ventes en Attente ({heldSales.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Reprenez une vente mise en pause pour terminer l'encaissement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-all cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'information si un panier est déjà actif */}
        {hasCurrentSale && heldSales.length > 0 && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center space-x-2 text-[11px] text-amber-900 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Une vente est actuellement en cours. Si vous reprenez une vente en attente, la vente actuelle sera automatiquement mise en attente à son tour.
            </span>
          </div>
        )}

        {/* Liste des ventes en attente */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {heldSales.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm font-display">Aucune vente en attente</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Pour mettre une vente en pause et servir un autre client, cliquez sur le bouton « Mettre en attente » sur l'écran de vente.
                </p>
              </div>
            </div>
          ) : (
            heldSales.map((sale, idx) => {
              const itemCount = sale.selectedItems?.reduce((sum, it) => sum + it.quantity, 0) || 0;
              return (
                <div
                  key={sale.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-display">
                          Vente #{heldSales.length - idx}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDateTime(sale.createdAt)}
                        </span>
                      </div>

                      <div className="text-xl font-black text-slate-900 font-display mt-1">
                        {formatCurrency(sale.finalPayableAmount)}
                      </div>

                      {sale.discount && sale.discount.calculatedAmount > 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          Remise : -{formatCurrency(sale.discount.calculatedAmount)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDelete(sale.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="Supprimer cette vente en attente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Résumé des articles */}
                  {sale.selectedItems && sale.selectedItems.length > 0 ? (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                        <ShoppingCart className="w-3 h-3 text-slate-400" />
                        <span>{itemCount} article{itemCount > 1 ? 's' : ''} au panier :</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {sale.selectedItems.slice(0, 4).map((it, i) => (
                          <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-800">
                            {it.quantity > 1 ? `${it.quantity}× ` : ''}{it.description}
                          </span>
                        ))}
                        {sale.selectedItems.length > 4 && (
                          <span className="text-[10px] text-slate-500 font-bold self-center">
                            +{sale.selectedItems.length - 4} autre(s)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-2 rounded-xl text-xs text-slate-600 font-medium italic">
                      Saisie directe calculatrice
                    </div>
                  )}

                  {/* Bouton de reprise */}
                  <button
                    type="button"
                    onClick={() => onRestore(sale)}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-98 cursor-pointer font-display"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Reprendre cette vente</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer font-display"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
