import React, { useState, useEffect } from 'react';
import { StockSupply } from '../../types';
import { suppliesService } from '../../db/services/suppliesService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { 
  X, 
  PackagePlus, 
  Search, 
  FileSpreadsheet, 
  Trash2
} from 'lucide-react';
import { downloadOrShareTextFile } from '../../utils/fileDownloader';

interface SuppliesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplyUpdated?: () => void;
}

export const SuppliesHistoryModal: React.FC<SuppliesHistoryModalProps> = ({
  isOpen,
  onClose,
  onSupplyUpdated
}) => {
  const [supplies, setSupplies] = useState<StockSupply[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSupplies();
    }
  }, [isOpen]);

  const loadSupplies = async () => {
    setIsLoading(true);
    try {
      const list = await suppliesService.getAll();
      setSupplies(list);
    } catch (err) {
      console.error('Erreur chargement approvisionnements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filtrage par mois et recherche
  const availableMonths = Array.from(
    new Set(supplies.map((s) => s.createdAt.slice(0, 7)))
  ).sort().reverse();

  const filteredSupplies = supplies.filter((s) => {
    const matchesMonth = selectedMonth === 'all' || s.createdAt.startsWith(selectedMonth);
    const matchesSearch = !searchQuery.trim() || 
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.supplierName && s.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMonth && matchesSearch;
  });

  const totalQuantityAdded = filteredSupplies.reduce((sum, s) => sum + s.quantity, 0);
  const totalCostInvestment = filteredSupplies.reduce((sum, s) => sum + s.totalCost, 0);

  const handleExportCsv = async () => {
    if (filteredSupplies.length === 0) {
      alert("Aucun approvisionnement à exporter.");
      return;
    }

    setIsExporting(true);
    try {
      const headers = ['Date', 'Heure', 'Article', 'Quantite', 'Prix Achat Unitaire (FCFA)', 'Prix Vente Unitaire (FCFA)', 'Marge Unitaire (FCFA)', 'Taux Marge (%)', 'Cout Total Arrivage (FCFA)', 'Fournisseur', 'Notes'];
      
      const rows = filteredSupplies.map((s) => {
        const d = new Date(s.createdAt);
        const dateStr = d.toLocaleDateString('fr-FR');
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const selling = s.sellingPrice || s.costPrice;
        const margin = selling - s.costPrice;
        const marginPercent = s.costPrice > 0 ? Math.round((margin / s.costPrice) * 100) : 0;

        return [
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${s.productName.replace(/"/g, '""')}"`,
          s.quantity,
          s.costPrice,
          selling,
          margin,
          `"${marginPercent}%"`,
          s.totalCost,
          `"${(s.supplierName || '').replace(/"/g, '""')}"`,
          `"${(s.notes || '').replace(/"/g, '""')}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const dateSuffix = selectedMonth === 'all' ? new Date().toISOString().slice(0, 10) : selectedMonth;
      const fileName = `approvisionnements_fasocarnet_${dateSuffix}.csv`;

      await downloadOrShareTextFile({
        fileName,
        content: csvContent,
        mimeType: 'text/csv;charset=utf-8;',
        title: 'Historique des Approvisionnements - FasoCarnet'
      });
    } catch (err) {
      console.error('Erreur export approvisionnements:', err);
      alert("Erreur lors de l'exportation.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (confirm("Supprimer cette ligne d'approvisionnement de l'historique ?")) {
      await suppliesService.delete(id);
      await loadSupplies();
      if (onSupplyUpdated) onSupplyUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner text-emerald-300">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-display">
                Historique des Approvisionnements
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                Entrées en stock, prix d'achats et réapprovisionnements
              </p>
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

        {/* Barre de KPI & Filtres */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-3">
          {/* Cartes KPI */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-display">
                Total Pièces Reçues
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-display">
                {totalQuantityAdded.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">unités</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block font-display">
                Investissement Achats
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-700 font-display">
                {formatCurrency(totalCostInvestment)}
              </div>
            </div>
          </div>

          {/* Recherche & Filtre par mois & Bouton Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par article, fournisseur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none transition-all shadow-2xs"
              />
            </div>

            {availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">Tous les mois ({supplies.length})</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || filteredSupplies.length === 0}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer font-display shrink-0"
              title="Exporter les approvisionnements en Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isExporting ? 'Export...' : 'Exporter Excel'}</span>
            </button>
          </div>
        </div>

        {/* Liste des approvisionnements */}
        <div className="p-4 space-y-2.5 overflow-y-auto max-h-[50vh] divide-y divide-slate-100">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              Chargement de l'historique...
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium space-y-1 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <span className="font-bold block text-slate-700">Aucun approvisionnement trouvé</span>
              <p className="text-[11px]">Les nouveaux réapprovisionnements apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            filteredSupplies.map((sup) => {
              const selling = sup.sellingPrice || sup.costPrice;
              const margin = selling - sup.costPrice;
              const marginPercent = sup.costPrice > 0 ? Math.round((margin / sup.costPrice) * 100) : 0;

              return (
                <div
                  key={sup.id}
                  className="pt-2.5 pb-1 flex items-start justify-between gap-3 text-left group"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 font-display mt-0.5">
                      +{sup.quantity}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                        <span className="font-extrabold text-slate-900 text-xs truncate">{sup.productName}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          • {formatDateTime(sup.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-600 flex-wrap gap-y-0.5">
                        <span>Achat : <strong className="text-slate-800">{formatCurrency(sup.costPrice)}</strong> /u</span>
                        <span>•</span>
                        <span>Vente : <strong className="text-emerald-700">{formatCurrency(selling)}</strong></span>
                        {margin > 0 && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                            Marge : +{formatCurrency(margin)} (+{marginPercent}%)
                          </span>
                        )}
                      </div>

                      {(sup.supplierName || sup.notes) && (
                        <div className="text-[10px] text-slate-500 italic flex items-center space-x-1 pt-0.5">
                          {sup.supplierName && (
                            <span className="font-medium text-slate-700 not-italic bg-slate-100 px-1.5 py-0.2 rounded">
                              Fournisseur : {sup.supplierName}
                            </span>
                          )}
                          {sup.notes && <span>{sup.notes}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-extrabold text-xs text-emerald-800 font-display">
                      {formatCurrency(sup.totalCost)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSupply(sup.id)}
                      className="text-slate-300 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredSupplies.length} approvisionnement(s) listé(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer font-display"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
