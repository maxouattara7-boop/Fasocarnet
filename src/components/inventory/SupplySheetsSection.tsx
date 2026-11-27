import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Product, ShopProfile, StockSupply, SupplyBatch } from '../../types';
import { suppliesService } from '../../db/services/suppliesService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportSuppliesToExcel, printSuppliesReport } from '../../utils/suppliesExporter';

interface DraftLine {
  tempId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
}

interface SupplySheetsSectionProps {
  products: Product[];
  suppliesList: StockSupply[];
  shopProfile: ShopProfile | null;
  onRefreshAll: () => Promise<void>;
}

export const SupplySheetsSection: React.FC<SupplySheetsSectionProps> = ({
  products,
  suppliesList,
  shopProfile,
  onRefreshAll,
}) => {
  // En-tête de la fiche (préalable)
  const [supplyDate, setSupplyDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Saisie d'une ligne d'article dans la fiche
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qtyInput, setQtyInput] = useState<string>('10');
  const [costInput, setCostInput] = useState<string>('');
  const [sellInput, setSellInput] = useState<string>('');
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtres & consultation de l'historique des fiches
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<SupplyBatch | null>(null);

  const batches = useMemo(
    () => suppliesService.groupIntoBatches(suppliesList),
    [suppliesList]
  );

  const knownSuppliers = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliesList) {
      if (s.supplierName?.trim()) set.add(s.supplierName.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [suppliesList]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const b of batches) set.add(b.supplyDate);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [batches]);

  const filteredBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return batches.filter((b) => {
      if (dateFilter !== 'all' && b.supplyDate !== dateFilter) return false;
      if (!q) return true;
      const inHeader =
        b.batchRef.toLowerCase().includes(q) ||
        (b.supplierName || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q);
      const inItems = b.items.some((it) =>
        it.productName.toLowerCase().includes(q)
      );
      return inHeader || inItems;
    });
  }, [batches, dateFilter, searchQuery]);

  const filteredFlatSupplies = useMemo(
    () => filteredBatches.flatMap((b) => b.items),
    [filteredBatches]
  );

  const totalFilteredQty = useMemo(
    () => filteredBatches.reduce((s, b) => s + b.totalQuantity, 0),
    [filteredBatches]
  );

  const totalFilteredCost = useMemo(
    () => filteredBatches.reduce((s, b) => s + b.totalCost, 0),
    [filteredBatches]
  );

  const draftTotalCost = useMemo(
    () => draftLines.reduce((s, l) => s + l.quantity * l.costPrice, 0),
    [draftLines]
  );

  const handleAddLineToSheet = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Veuillez saisir une quantité valide (>= 1).');
      return;
    }
    const cost = parseFloat(costInput) || product.costPrice || 0;
    const sell = sellInput ? parseFloat(sellInput) : undefined;

    setDraftLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.productId === product.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: copy[existingIdx].quantity + qty,
          costPrice: cost,
          sellingPrice: sell,
        };
        return copy;
      }
      return [
        ...prev,
        {
          tempId: `${product.id}_${Date.now()}`,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          costPrice: cost,
          sellingPrice: sell,
        },
      ];
    });

    setSelectedProductId('');
    setQtyInput('10');
    setCostInput('');
    setSellInput('');
  };

  const handleRemoveDraftLine = (tempId: string) => {
    setDraftLines((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('Veuillez renseigner le nom du fournisseur sur la fiche.');
      return;
    }

    // Si l'utilisateur a sélectionné un article sans cliquer sur "Ajouter à la fiche", l'inclure automatiquement
    let finalLines = [...draftLines];
    if (selectedProductId) {
      const product = products.find((p) => p.id === selectedProductId);
      const qty = parseInt(qtyInput, 10);
      if (product && !isNaN(qty) && qty > 0) {
        const cost = parseFloat(costInput) || product.costPrice || 0;
        const sell = sellInput ? parseFloat(sellInput) : undefined;
        const existingIdx = finalLines.findIndex((l) => l.productId === product.id);
        if (existingIdx >= 0) {
          finalLines[existingIdx] = {
            ...finalLines[existingIdx],
            quantity: finalLines[existingIdx].quantity + qty,
            costPrice: cost,
            sellingPrice: sell,
          };
        } else {
          finalLines.push({
            tempId: `${product.id}_${Date.now()}`,
            productId: product.id,
            productName: product.name,
            quantity: qty,
            costPrice: cost,
            sellingPrice: sell,
          });
        }
      }
    }

    if (finalLines.length === 0) {
      alert('Ajoutez au moins un article à la fiche avant de valider.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await suppliesService.recordBatchSupply({
        supplyDate,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: finalLines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          costPrice: l.costPrice,
          sellingPrice: l.sellingPrice,
        })),
      });

      setDraftLines([]);
      setSelectedProductId('');
      setQtyInput('10');
      setCostInput('');
      setSellInput('');
      setSupplierName('');
      setSupplierPhone('');
      setNotes('');
      await onRefreshAll();

      setFeedback(
        `Fiche ${created.batchRef} enregistrée (${created.items.length} article${
          created.items.length > 1 ? 's' : ''
        } • +${created.totalQuantity} unités) !`
      );
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erreur lors de l'enregistrement de la fiche.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batch: SupplyBatch) => {
    if (
      confirm(
        `Supprimer la fiche ${batch.batchRef} (${batch.items.length} ligne(s)) ?\nRemarque : cela ne retire pas automatiquement le stock actuel.`
      )
    ) {
      await suppliesService.deleteBatch(batch.batchId);
      if (selectedBatch?.batchId === batch.batchId) {
        setSelectedBatch(null);
      }
      await onRefreshAll();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start animate-in fade-in duration-150">
      {/* COLONNE GAUCHE (5 COLS) : NOUVELLE FICHE D'APPROVISIONNEMENT */}
      <form
        onSubmit={handleSubmitBatch}
        className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4"
      >
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 font-display">
              Nouvelle Fiche d'Approvisionnement
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              1. Renseignez la fiche (Date, Fournisseur) • 2. Ajoutez les articles
            </p>
          </div>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* ÉTAPE 1 : EN-TÊTE PRÉALABLE DE LA FICHE */}
        <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 font-display">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>1. En-tête de la Fiche</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Date <span className="text-emerald-600">*</span>
              </label>
              <input
                type="date"
                required
                value={supplyDate}
                onChange={(e) => setSupplyDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Fournisseur <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                required
                list="known-suppliers-list"
                placeholder="Ex: Grossiste Ouaga"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
              />
              <datalist id="known-suppliers-list">
                {knownSuppliers.map((sup) => (
                  <option key={sup} value={sup} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tél. Fournisseur <span className="text-slate-400 font-normal">(opt.)</span>
              </label>
              <input
                type="tel"
                placeholder="Ex: 70 00 00 00"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                N° Bordereau / Notes <span className="text-slate-400 font-normal">(opt.)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: BL #4092"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ÉTAPE 2 : AJOUT DES ARTICLES À LA FICHE */}
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Articles reçus dans cette fiche</span>
          </div>

          <div>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const pId = e.target.value;
                setSelectedProductId(pId);
                const p = products.find((prod) => prod.id === pId);
                if (p) {
                  setCostInput(p.costPrice ? String(p.costPrice) : '');
                  setSellInput(String(p.price));
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="">-- Sélectionner un article du catalogue --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stockQuantity ?? 0}) - {formatCurrency(p.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Quantité
              </label>
              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-black text-center text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Coût achat (u)
              </label>
              <input
                type="number"
                min="0"
                placeholder="FCFA"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">
                Prix vente (u)
              </label>
              <input
                type="number"
                min="1"
                placeholder="FCFA"
                value={sellInput}
                onChange={(e) => setSellInput(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedProductId}
            onClick={handleAddLineToSheet}
            className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 font-display"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Ajouter l'article à la fiche</span>
          </button>
        </div>

        {/* LISTE DES ARTICLES DANS LA FICHE EN COURS */}
        {draftLines.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
              <span>Articles dans la fiche ({draftLines.length})</span>
              <span className="text-emerald-700 font-display">
                Total : {formatCurrency(draftTotalCost)}
              </span>
            </div>
            <div className="divide-y divide-slate-200/70 max-h-44 overflow-y-auto">
              {draftLines.map((line) => (
                <div
                  key={line.tempId}
                  className="py-1.5 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">
                      {line.productName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      +{line.quantity} u × {formatCurrency(line.costPrice)} ={' '}
                      <strong className="text-slate-800">
                        {formatCurrency(line.quantity * line.costPrice)}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDraftLine(line.tempId)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                    title="Retirer de la fiche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (draftLines.length === 0 && !selectedProductId)}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-xl shadow-xs flex items-center justify-center space-x-2 active:scale-98 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50 font-display"
        >
          <ClipboardList className="w-4 h-4" />
          <span>
            {isSubmitting
              ? 'Enregistrement...'
              : `Valider la Fiche (${draftLines.length + (selectedProductId && !draftLines.some((l) => l.productId === selectedProductId) ? 1 : 0)} article${
                  draftLines.length + (selectedProductId && !draftLines.some((l) => l.productId === selectedProductId) ? 1 : 0) > 1 ? 's' : ''
                })`}
          </span>
        </button>
      </form>

      {/* COLONNE DROITE (7 COLS) : LISTE DES FICHES D'APPROVISIONNEMENT */}
      <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-black text-sm text-slate-900 font-display">
              Fiches d'Approvisionnement ({filteredBatches.length})
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Retracez chaque arrivage par date et fournisseur
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() =>
                exportSuppliesToExcel({
                  supplies: filteredFlatSupplies,
                  dateString: dateFilter === 'all' ? undefined : dateFilter,
                  shopProfile,
                })
              }
              disabled={filteredFlatSupplies.length === 0}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer font-display disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (.csv)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                printSuppliesReport({
                  supplies: filteredFlatSupplies,
                  dateString: dateFilter === 'all' ? undefined : dateFilter,
                  shopProfile,
                })
              }
              disabled={filteredFlatSupplies.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer font-display disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        {/* FILTRES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtrer par Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="all">Toutes les dates ({batches.length} fiches)</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Rechercher Fiche / Fournisseur / Article
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Ex: APP-, Grossiste, Riz..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* RÉSUMÉ FILTRÉ */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800">
              {dateFilter === 'all' ? 'Toutes les fiches' : `Fiches du ${dateFilter}`}
            </span>
          </div>
          <div className="flex items-center space-x-3 font-display">
            <span className="text-slate-600">
              Unités reçues : <strong className="text-slate-900">+{totalFilteredQty}</strong>
            </span>
            <span className="text-emerald-700 font-black">
              Total : {formatCurrency(totalFilteredCost)}
            </span>
          </div>
        </div>

        {/* LISTE DES FICHES */}
        {filteredBatches.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="font-bold text-slate-700 block text-sm">
              Aucune fiche d'approvisionnement
            </span>
            <p className="text-[11px] text-slate-500">
              Remplissez la fiche ci-contre (Date, Fournisseur, Articles) pour créer votre premier bon.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredBatches.map((batch) => (
              <div
                key={batch.batchId}
                onClick={() => setSelectedBatch(batch)}
                className="p-3.5 bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-sm rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md font-mono font-bold text-[10px]">
                      {batch.batchRef}
                    </span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {batch.supplierName || 'Fournisseur non précisé'}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] font-display">
                      {batch.items.length} article{batch.items.length > 1 ? 's' : ''} • +{batch.totalQuantity} u
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 truncate">
                    {batch.items.map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>
                      Date :{' '}
                      <strong className="text-slate-600">
                        {new Date(batch.supplyDate + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </strong>
                    </span>
                    {batch.notes && <span>• {batch.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-700 font-display block">
                      {formatCurrency(batch.totalCost)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold inline-flex items-center gap-0.5 group-hover:underline">
                      <Eye className="w-3 h-3" />
                      Voir fiche
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBatch(batch);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Supprimer cette fiche"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALE DÉTAIL D'UNE FICHE D'APPROVISIONNEMENT */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-white/15 rounded-md font-mono font-bold text-xs">
                    {selectedBatch.batchRef}
                  </span>
                  <h3 className="font-black text-sm sm:text-base font-display">
                    Fiche d'Approvisionnement
                  </h3>
                </div>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Date : {new Date(selectedBatch.supplyDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Infos Fournisseur */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Fournisseur
                  </span>
                  <span className="font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedBatch.supplierName || 'Non renseigné'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Téléphone / Notes
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    {selectedBatch.supplierPhone && (
                      <>
                        <Phone className="w-3 h-3 text-slate-400" />
                        {selectedBatch.supplierPhone}
                      </>
                    )}
                    {!selectedBatch.supplierPhone && (selectedBatch.notes || '—')}
                  </span>
                </div>
                {selectedBatch.supplierPhone && selectedBatch.notes && (
                  <div className="col-span-2 text-[11px] text-slate-500 border-t border-slate-200 pt-1.5">
                    Notes : <strong>{selectedBatch.notes}</strong>
                  </div>
                )}
              </div>

              {/* Tableau des articles de la fiche */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2">Article</th>
                      <th className="text-center px-2 py-2">Qté</th>
                      <th className="text-right px-2 py-2">Coût u.</th>
                      <th className="text-right px-3 py-2">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBatch.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="px-2 py-2.5 text-center font-black text-emerald-700">
                          +{item.quantity}
                        </td>
                        <td className="px-2 py-2.5 text-right text-slate-600">
                          {formatCurrency(item.costPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 font-display">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50/70 border-t border-emerald-200 font-black text-xs">
                    <tr>
                      <td className="px-3 py-2.5 text-emerald-950">TOTAL FICHE</td>
                      <td className="px-2 py-2.5 text-center text-emerald-800">
                        +{selectedBatch.totalQuantity}
                      </td>
                      <td />
                      <td className="px-3 py-2.5 text-right text-emerald-800 text-sm font-display">
                        {formatCurrency(selectedBatch.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                Saisie enregistrée le {formatDateTime(selectedBatch.createdAt)}
              </div>

              {/* Actions sur la fiche */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    exportSuppliesToExcel({
                      supplies: selectedBatch.items,
                      dateString: selectedBatch.supplyDate,
                      shopProfile,
                    })
                  }
                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exporter (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printSuppliesReport({
                      supplies: selectedBatch.items,
                      dateString: selectedBatch.supplyDate,
                      shopProfile,
                    })
                  }
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer Fiche</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
