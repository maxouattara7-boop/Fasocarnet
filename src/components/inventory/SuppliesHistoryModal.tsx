import React, { useState, useEffect } from 'react';
import { StockSupply } from '../../types';
import { suppliesService } from '../../db/services/suppliesService';
import { formatCurrency } from '../../utils/formatters';
import { 
  X, 
  PackagePlus, 
  Search, 
  FileSpreadsheet, 
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { downloadOrShareTextFile } from '../../utils/fileDownloader';

interface SuppliesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplyUpdated?: () => void;
}

interface SupplyGroup {
  dateKey: string;
  formattedDate: string;
  totalQuantity: number;
  totalCost: number;
  supplies: StockSupply[];
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
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

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
      // Par défaut, déplier tous les groupes
      const initialExpanded: Record<string, boolean> = {};
      list.forEach(s => {
        const key = s.createdAt.slice(0, 10);
        initialExpanded[key] = true;
      });
      setExpandedDates(initialExpanded);
    } catch (err) {
      console.error('Erreur chargement approvisionnements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Mois disponibles pour filtrage
  const availableMonths = Array.from(
    new Set(supplies.map((s) => s.createdAt.slice(0, 7)))
  ).sort().reverse();

  // Filtrage
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

  // Groupement par date (YYYY-MM-DD)
  const groupedSupplies: SupplyGroup[] = [];
  const groupsMap = new Map<string, StockSupply[]>();

  filteredSupplies.forEach(s => {
    const dateKey = s.createdAt.slice(0, 10);
    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
    }
    groupsMap.get(dateKey)!.push(s);
  });

  groupsMap.forEach((groupItems, dateKey) => {
    const d = new Date(dateKey + 'T12:00:00');
    const formattedDate = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    // Capitaliser la première lettre
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const totalQty = groupItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalCost = groupItems.reduce((acc, curr) => acc + curr.totalCost, 0);

    groupedSupplies.push({
      dateKey,
      formattedDate: capitalizedDate,
      totalQuantity: totalQty,
      totalCost,
      supplies: groupItems
    });
  });

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const toggleAllGroups = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    groupedSupplies.forEach(g => {
      updated[g.dateKey] = expand;
    });
    setExpandedDates(updated);
  };

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
                Arrivages groupés par date, prix d'achat et rentabilité
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

          {/* Boutons d'accordéon rapide */}
          {groupedSupplies.length > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-slate-500">
                {groupedSupplies.length} session(s) d'arrivage
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => toggleAllGroups(true)}
                  className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Tout déplier
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => toggleAllGroups(false)}
                  className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Tout replier
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Liste des approvisionnements groupés par date */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              Chargement de l'historique...
            </div>
          ) : groupedSupplies.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium space-y-1 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <span className="font-bold block text-slate-700">Aucun approvisionnement trouvé</span>
              <p className="text-[11px]">Les nouveaux réapprovisionnements apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            groupedSupplies.map((group) => {
              const isExpanded = expandedDates[group.dateKey] ?? true;

              return (
                <div
                  key={group.dateKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Entête du groupe d'arrivage */}
                  <button
                    type="button"
                    onClick={() => toggleDateGroup(group.dateKey)}
                    className="w-full px-4 py-3 bg-slate-50/90 hover:bg-slate-100/90 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-100"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate font-display">
                          Arrivage du {group.formattedDate}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {group.supplies.length} article(s) • +{group.totalQuantity} pièces au total
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Coût jour</span>
                        <span className="font-extrabold text-xs sm:text-sm text-emerald-800 font-display">
                          {formatCurrency(group.totalCost)}
                        </span>
                      </div>
                      <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Détail des articles de cette session */}
                  {isExpanded && (
                    <div className="p-3 space-y-2.5 divide-y divide-slate-100 bg-white">
                      {group.supplies.map((sup) => {
                        const selling = sup.sellingPrice || sup.costPrice;
                        const margin = selling - sup.costPrice;
                        const marginPercent = sup.costPrice > 0 ? Math.round((margin / sup.costPrice) * 100) : 0;

                        return (
                          <div
                            key={sup.id}
                            className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-left group"
                          >
                            <div className="flex items-start space-x-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 font-display mt-0.5">
                                +{sup.quantity}
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                  <span className="font-extrabold text-slate-900 text-xs truncate">
                                    {sup.productName}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    • {new Date(sup.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-600 flex-wrap gap-y-0.5">
                                  <span>Achat : <strong className="text-slate-800">{formatCurrency(sup.costPrice)}</strong>/u</span>
                                  <span>•</span>
                                  <span>Vente : <strong className="text-emerald-700">{formatCurrency(selling)}</strong></span>
                                  {margin > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
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
                              <div className="font-extrabold text-xs text-slate-900 font-display">
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
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredSupplies.length} ligne(s) d'approvisionnement
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
