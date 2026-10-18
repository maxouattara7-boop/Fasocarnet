import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Package,
  Boxes,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  Plus,
  Minus,
  PackagePlus,
  Trash2,
  Barcode,
  Camera,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Sparkles,
  Crown,
  ArrowRight
} from 'lucide-react';
import { Product, StockSupply } from '../../types';
import { productsService } from '../../db/services/productsService';
import { suppliesService } from '../../db/services/suppliesService';
import { subscriptionService } from '../../db/services/subscriptionService';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { compressImage } from '../../utils/imageCompressor';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { exportSuppliesToExcel, printSuppliesReport } from '../../utils/suppliesExporter';

type CatalogSubTab = 'catalog' | 'supplies';

export const InventoryView: React.FC = () => {
  const { shopProfile, loadCurrentShop, setActiveTab } = useAppStore();

  const [catalogSubTab, setCatalogSubTab] = useState<CatalogSubTab>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  // Modal Ajout Article
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCostPrice, setNewProductCostPrice] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductMinAlert, setNewProductMinAlert] = useState('5');
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [isCompressingProductImage, setIsCompressingProductImage] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Approvisionnements
  const [suppliesList, setSuppliesList] = useState<StockSupply[]>([]);
  const [supplyDateFilter, setSupplyDateFilter] = useState<string>('all');
  const [supplySearch, setSupplySearch] = useState<string>('');
  const [selectedSupplyProductId, setSelectedSupplyProductId] = useState<string>('');
  const [supplyQtyInput, setSupplyQtyInput] = useState<string>('10');
  const [supplyCostPriceInput, setSupplyCostPriceInput] = useState<string>('');
  const [supplySellingPriceInput, setSupplySellingPriceInput] = useState<string>('');
  const [supplySupplierInput, setSupplySupplierInput] = useState<string>('');
  const [supplyNotesInput, setSupplyNotesInput] = useState<string>('');
  const [isSubmittingSupply, setIsSubmittingSupply] = useState(false);
  const [supplySuccessFeedback, setSupplySuccessFeedback] = useState<string | null>(null);

  // Modal Réapprovisionnement Rapide
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState('10');
  const [restockCostPriceInput, setRestockCostPriceInput] = useState('');
  const [restockSellingPriceInput, setRestockSellingPriceInput] = useState('');
  const [restockSupplierInput, setRestockSupplierInput] = useState('');
  const [restockNotesInput, setRestockNotesInput] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  const isPremium = subscriptionService.isPremiumActive(shopProfile);

  useEffect(() => {
    loadProducts();
    loadSupplies();

    const handleDbUpdated = () => {
      loadProducts();
      loadSupplies();
      loadCurrentShop();
    };
    window.addEventListener('fasocarnet_database_updated', handleDbUpdated);
    return () => {
      window.removeEventListener('fasocarnet_database_updated', handleDbUpdated);
    };
  }, []);

  const loadProducts = async () => {
    const list = await productsService.getAll();
    setProducts(list);
  };

  const loadSupplies = async () => {
    const list = await suppliesService.getAll();
    setSuppliesList(list);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingProductImage(true);
    try {
      const compressedDataUrl = await compressImage(file, 256, 256, 0.85);
      setNewProductImage(compressedDataUrl);
    } catch (err) {
      console.warn('Erreur compression photo article:', err);
    } finally {
      setIsCompressingProductImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newProductPrice) || 0;
    const costPrice = parseFloat(newProductCostPrice) || undefined;
    if (!newProductName.trim() || price <= 0) {
      alert("Veuillez renseigner le nom de l'article et un prix de vente supérieur à 0.");
      return;
    }

    if (newProductStock.trim() === '' || isNaN(parseInt(newProductStock, 10)) || parseInt(newProductStock, 10) < 0) {
      alert("Veuillez renseigner la quantité initiale en stock pour cet article (au moins 0).");
      return;
    }

    const stockQty = Math.max(0, parseInt(newProductStock, 10) || 0);
    const minAlert = newProductMinAlert.trim() !== '' ? Math.max(0, parseInt(newProductMinAlert, 10) || 0) : 5;

    setIsAddingProduct(true);
    try {
      await productsService.create(
        newProductName.trim(),
        price,
        newProductBarcode.trim() || undefined,
        undefined,
        stockQty,
        minAlert,
        costPrice,
        newProductImage || undefined
      );
      setNewProductName('');
      setNewProductCostPrice('');
      setNewProductPrice('');
      setNewProductBarcode('');
      setNewProductStock('');
      setNewProductMinAlert('5');
      setNewProductImage(null);
      await loadProducts();
      setIsAddProductModalOpen(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de l'article.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleApplyRestockModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    const qty = parseInt(restockQtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("Veuillez indiquer une quantité valide à ajouter.");
      return;
    }
    const cost = parseFloat(restockCostPriceInput) || restockProduct.costPrice || 0;
    const selling = parseFloat(restockSellingPriceInput) || restockProduct.price;

    setIsRestocking(true);
    try {
      await suppliesService.recordSupply({
        productId: restockProduct.id,
        quantity: qty,
        costPrice: cost,
        sellingPrice: selling,
        supplierName: restockSupplierInput,
        notes: restockNotesInput
      });
      setRestockProduct(null);
      setRestockQtyInput('10');
      setRestockCostPriceInput('');
      setRestockSellingPriceInput('');
      setRestockSupplierInput('');
      setRestockNotesInput('');
      await loadProducts();
      await loadSupplies();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de l'approvisionnement.");
    } finally {
      setIsRestocking(false);
    }
  };

  const handleRecordDedicatedSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplyProductId) {
      alert("Veuillez sélectionner un article à approvisionner.");
      return;
    }
    const targetProd = products.find(p => p.id === selectedSupplyProductId);
    if (!targetProd) return;

    const qty = parseInt(supplyQtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("Veuillez indiquer une quantité valide à ajouter.");
      return;
    }
    const cost = parseFloat(supplyCostPriceInput) || targetProd.costPrice || 0;
    const selling = parseFloat(supplySellingPriceInput) || targetProd.price;

    setIsSubmittingSupply(true);
    try {
      await suppliesService.recordSupply({
        productId: targetProd.id,
        quantity: qty,
        costPrice: cost,
        sellingPrice: selling,
        supplierName: supplySupplierInput.trim() || undefined,
        notes: supplyNotesInput.trim() || undefined
      });

      setSelectedSupplyProductId('');
      setSupplyQtyInput('10');
      setSupplyCostPriceInput('');
      setSupplySellingPriceInput('');
      setSupplySupplierInput('');
      setSupplyNotesInput('');
      await loadProducts();
      await loadSupplies();
      setSupplySuccessFeedback(`Approvisionnement de ${qty}x ${targetProd.name} validé avec succès !`);
      setTimeout(() => setSupplySuccessFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de l'approvisionnement.");
    } finally {
      setIsSubmittingSupply(false);
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (confirm("Supprimer cette entrée d'approvisionnement ? (Remarque : cela n'annule pas automatiquement le stock actuel)")) {
      await suppliesService.delete(id);
      await loadSupplies();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Supprimer cet article du catalogue ?")) {
      await productsService.delete(id);
      await loadProducts();
    }
  };

  const lowStockCount = products.filter(
    (p) => p.stockQuantity !== undefined && p.stockQuantity > 0 && p.stockQuantity <= (p.minStockAlert ?? 5)
  ).length;

  const outOfStockCount = products.filter(
    (p) => p.stockQuantity !== undefined && p.stockQuantity <= 0
  ).length;

  const totalStockUnits = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);

  const filteredProducts = products.filter((p) => {
    let matchesFilter = true;
    if (catalogFilter === 'low_stock') {
      matchesFilter = p.stockQuantity !== undefined && p.stockQuantity > 0 && p.stockQuantity <= (p.minStockAlert ?? 5);
    } else if (catalogFilter === 'out_of_stock') {
      matchesFilter = p.stockQuantity !== undefined && p.stockQuantity <= 0;
    }
    const cleanSearch = catalogSearch.trim().toLowerCase();
    const matchesSearch = !cleanSearch ||
      p.name.toLowerCase().includes(cleanSearch) ||
      (p.barcode && p.barcode.toLowerCase().includes(cleanSearch));
    return matchesFilter && matchesSearch;
  });

  const filteredSupplies = suppliesList.filter((s) => {
    const matchesDate = supplyDateFilter === 'all' || s.createdAt.startsWith(supplyDateFilter);
    const cleanSearch = supplySearch.trim().toLowerCase();
    const matchesSearch = !cleanSearch ||
      s.productName.toLowerCase().includes(cleanSearch) ||
      (s.supplierName && s.supplierName.toLowerCase().includes(cleanSearch)) ||
      (s.notes && s.notes.toLowerCase().includes(cleanSearch));
    return matchesDate && matchesSearch;
  });

  const availableSupplyDates = Array.from(
    new Set(suppliesList.map((s) => s.createdAt.slice(0, 10)))
  ).sort().reverse();

  const totalFilteredSupplyQty = filteredSupplies.reduce((acc, s) => acc + s.quantity, 0);
  const totalFilteredSupplyCost = filteredSupplies.reduce((acc, s) => acc + s.totalCost, 0);

  if (!isPremium) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 animate-in fade-in duration-150">
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-xl text-center relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-lg mb-3 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Fonctionnalité FasoCarnet Pro</span>
          </span>

          <h2 className="text-xl font-black font-display text-white mb-2">
            Catalogue d'Articles & Approvisionnements
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto mb-5">
            Enregistrez vos articles avec photo, code-barres, prix d'achat et marge bénéficiaire, et suivez vos réapprovisionnements en direct.
          </p>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
          >
            <span>Activer ma Licence FasoCarnet Pro</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-12 space-y-6">
      {/* EN-TÊTE DE LA VUE ARTICLES & ACTIONS PRINCIPALES */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 font-bold shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
              Catalogue des Articles & Gestion des Stocks
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Gérez votre inventaire, calculez automatiquement vos marges bénéficiaires et suivez les approvisionnements.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full flex items-center space-x-1.5 animate-in fade-in shadow-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Article enregistré !</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsAddProductModalOpen(true)}
            className="py-3 px-5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer font-display shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nouvel Article</span>
          </button>
        </div>
      </div>

      {/* 3 CARTES KPI SYNTHÉTIQUES EN EN-TÊTE (HARMONISÉES AVEC LES AUTRES VUES) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* KPI 1 : Total Références */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Package className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-display">
            Références Enregistrées
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-display tracking-tight my-1">
            {products.length}
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full mt-1">
            Articles au catalogue
          </span>
        </div>

        {/* KPI 2 : Total Unités en Stock */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 hover:border-teal-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Boxes className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 font-display">
            Unités en Stock Total
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-teal-700 font-display tracking-tight my-1">
            {totalStockUnits}
          </div>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full mt-1">
            Quantité cumulée en rayon
          </span>
        </div>

        {/* KPI 3 : État du Stock & Ruptures */}
        <div className={`p-5 sm:p-6 rounded-3xl shadow-xs border transition-all flex flex-col items-center justify-center text-center group ${
          outOfStockCount > 0
            ? 'bg-red-50/40 border-red-200 hover:border-red-400'
            : lowStockCount > 0
            ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
            : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
        }`}>
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0 ${
            outOfStockCount > 0
              ? 'bg-red-100 text-red-700 border-red-200'
              : lowStockCount > 0
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
          }`}>
            {outOfStockCount > 0 ? (
              <AlertCircle className="w-5 h-5 stroke-[2.2]" />
            ) : lowStockCount > 0 ? (
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            )}
          </div>
          <span className={`text-[11px] font-black uppercase tracking-wider font-display ${
            outOfStockCount > 0 ? 'text-red-700' : lowStockCount > 0 ? 'text-amber-800' : 'text-emerald-800'
          }`}>
            Santé des Stocks
          </span>
          <div className={`text-xl sm:text-2xl lg:text-3xl font-black font-display tracking-tight my-1 ${
            outOfStockCount > 0 ? 'text-red-700' : lowStockCount > 0 ? 'text-amber-800' : 'text-emerald-700'
          }`}>
            {outOfStockCount > 0
              ? `${outOfStockCount} Rupture${outOfStockCount > 1 ? 's' : ''}`
              : lowStockCount > 0
              ? `${lowStockCount} Critique${lowStockCount > 1 ? 's' : ''}`
              : 'Stock Optimal'}
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1 border ${
            outOfStockCount > 0
              ? 'bg-red-100 text-red-800 border-red-200'
              : lowStockCount > 0
              ? 'bg-amber-100 text-amber-900 border-amber-200'
              : 'bg-emerald-100 text-emerald-900 border-emerald-200'
          }`}>
            {outOfStockCount > 0
              ? 'Réapprovisionnement urgent'
              : lowStockCount > 0
              ? 'Seuil minimum atteint'
              : 'Aucune rupture'}
          </span>
        </div>
      </div>

      {/* SÉLECTEUR D'ONGLETS INTERNES : CATALOGUE VS JOURNAL APPROVISIONNEMENTS */}
      <div className="w-full grid grid-cols-2 gap-2 bg-slate-200/90 p-1.5 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => setCatalogSubTab('catalog')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer font-display ${
            catalogSubTab === 'catalog'
              ? 'bg-white text-emerald-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>Catalogue & Fiches Articles</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full ml-1">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCatalogSubTab('supplies')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer font-display ${
            catalogSubTab === 'supplies'
              ? 'bg-white text-emerald-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <PackagePlus className="w-4 h-4 text-emerald-600" />
          <span>Arrivages & Approvisionnements</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full ml-1">
            {suppliesList.length}
          </span>
        </button>
      </div>

      {/* VUE 1 : CATALOGUE D'ARTICLES */}
      {catalogSubTab === 'catalog' && (
        <div className="space-y-5 w-full animate-in fade-in duration-150">
          {/* BARRE DE RECHERCHE ET FILTRES RAPIDES */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par nom d'article ou code-barres..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Pastilles de filtres segmentés */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => setCatalogFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-display ${
                  catalogFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tous ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalogFilter('low_stock')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-display ${
                  catalogFilter === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Stock critique ({lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setCatalogFilter('out_of_stock')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-display ${
                  catalogFilter === 'out_of_stock'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                En rupture ({outOfStockCount})
              </button>
            </div>
          </div>

          {/* GRILLE DES ARTICLES */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 font-display">
                  {catalogSearch ? 'Aucun article correspondant à votre recherche' : 'Aucun article dans cette catégorie'}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {catalogSearch ? 'Essayez avec un autre mot-clé ou effacez la recherche.' : 'Cliquez sur "+ Nouvel Article" pour ajouter un produit à votre catalogue.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stockQuantity !== undefined && prod.stockQuantity <= 0;
                const isLowStock = prod.stockQuantity !== undefined && prod.stockQuantity > 0 && prod.stockQuantity <= (prod.minStockAlert ?? 5);
                const unitProfit = prod.costPrice !== undefined ? Math.round(prod.price - prod.costPrice) : null;
                const profitMarginPercent = prod.costPrice !== undefined && prod.costPrice > 0 ? Math.round(((prod.price - prod.costPrice) / prod.costPrice) * 100) : null;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all p-4.5 flex flex-col justify-between space-y-3 group"
                  >
                    {/* Haut de la fiche : Image + Nom + Code-barres + Statut stock */}
                    <div className="flex items-start space-x-3.5">
                      <div className="relative group/photo shrink-0">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg flex items-center justify-center shadow-xs font-display">
                            {prod.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <label
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-white text-slate-600 hover:text-emerald-700 rounded-full shadow-xs border border-slate-200 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 opacity-70 group-hover/photo:opacity-100"
                          title={prod.imageUrl ? "Changer la photo" : "Ajouter une photo"}
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const compressed = await compressImage(file, 256, 256, 0.85);
                                await productsService.update(prod.id, { imageUrl: compressed });
                                await loadProducts();
                              } catch (err) {
                                console.warn('Erreur mise à jour photo article:', err);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-black text-slate-900 text-sm truncate font-display group-hover:text-emerald-900 transition-colors">
                          {prod.name}
                        </h4>

                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {prod.barcode && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[9px] font-mono font-semibold">
                              <Barcode className="w-2.5 h-2.5 text-slate-400" />
                              <span>{prod.barcode}</span>
                            </span>
                          )}

                          {isOutOfStock ? (
                            <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md inline-flex items-center space-x-1 font-display">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              <span>Rupture (0)</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center space-x-1 font-display">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Critique ({prod.stockQuantity})</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center space-x-1 font-display">
                              <span>En stock : {prod.stockQuantity}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Zone Financière : Prix de vente, Coût & Marge */}
                    <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">
                          Prix de vente
                        </span>
                        <span className="text-sm font-black text-emerald-800 font-display">
                          {formatCurrency(prod.price)}
                        </span>
                      </div>

                      {prod.costPrice !== undefined && prod.costPrice > 0 && (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">
                            Coût : {formatCurrency(prod.costPrice)}
                          </span>
                          {unitProfit !== null && (
                            <span className="font-extrabold text-amber-800 text-[10px]">
                              Marge : +{formatCurrency(unitProfit)} {profitMarginPercent !== null ? `(+${profitMarginPercent}%)` : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions rapides de la carte */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setRestockProduct(prod);
                          setRestockQtyInput('10');
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-xl border border-emerald-200 text-xs flex items-center space-x-1 active:scale-95 transition-all shadow-2xs font-display cursor-pointer"
                        title="Réapprovisionner le stock"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Réapprovisionner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Supprimer du catalogue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : JOURNAL DES APPROVISIONNEMENTS */}
      {catalogSubTab === 'supplies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start animate-in fade-in duration-150">
          {/* FORMULAIRE NOUVEL APPROVISIONNEMENT (5 colonnes) */}
          <form onSubmit={handleRecordDedicatedSupply} className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <PackagePlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 font-display">Nouvel Approvisionnement</h3>
                <p className="text-[10px] text-slate-500 font-medium">Enregistrez un arrivage d'articles et actualisez vos stocks</p>
              </div>
            </div>

            {supplySuccessFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{supplySuccessFeedback}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                  Choisir l'Article à Approvisionner <span className="text-emerald-600">*</span>
                </label>
                <select
                  required
                  value={selectedSupplyProductId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedSupplyProductId(pId);
                    const p = products.find(prod => prod.id === pId);
                    if (p) {
                      if (p.costPrice) setSupplyCostPriceInput(String(p.costPrice));
                      setSupplySellingPriceInput(String(p.price));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="">-- Sélectionner un produit du catalogue --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actuel: {p.stockQuantity ?? 0}) - {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                  Quantité Ajoutée au Stock <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={supplyQtyInput}
                  onChange={(e) => setSupplyQtyInput(e.target.value)}
                  placeholder="Ex: 10, 50, 100..."
                  className="w-full px-3 py-2 bg-white border-2 border-emerald-500/80 rounded-xl text-sm font-black text-center text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none font-display shadow-2xs"
                />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[5, 10, 20, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setSupplyQtyInput(String(qty))}
                      className={`py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer font-display ${
                        supplyQtyInput === String(qty)
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Prix d'achat unitaire (coût)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 350"
                      value={supplyCostPriceInput}
                      onChange={(e) => setSupplyCostPriceInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none">
                      FCFA
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Prix de vente unitaire
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 500"
                      value={supplySellingPriceInput}
                      onChange={(e) => setSupplySellingPriceInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none">
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Nom du Fournisseur <span className="text-slate-400 text-[9px] font-normal">(opt.)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Grossiste Ouaga"
                    value={supplySupplierInput}
                    onChange={(e) => setSupplySupplierInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Notes / N° Facture <span className="text-slate-400 text-[9px] font-normal">(opt.)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Facture #4092"
                    value={supplyNotesInput}
                    onChange={(e) => setSupplyNotesInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {parseInt(supplyQtyInput, 10) > 0 && parseFloat(supplyCostPriceInput) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">Coût total d'investissement :</span>
                  <span className="font-black text-emerald-800 text-sm font-display">
                    {formatCurrency(parseInt(supplyQtyInput, 10) * parseFloat(supplyCostPriceInput))}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingSupply || !selectedSupplyProductId}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-xl shadow-xs flex items-center justify-center space-x-2 active:scale-98 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50 font-display"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{isSubmittingSupply ? 'Enregistrement...' : 'Valider l\'Approvisionnement'}</span>
            </button>
          </form>

          {/* HISTORIQUE DU JOURNAL DES ARRIVAGES (7 colonnes) */}
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 font-display">
                  Journal des Entrées & Approvisionnements
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Historique quotidien téléchargeable et imprimable
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => exportSuppliesToExcel({
                    supplies: filteredSupplies,
                    dateString: supplyDateFilter === 'all' ? undefined : supplyDateFilter,
                    shopProfile
                  })}
                  disabled={filteredSupplies.length === 0}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer font-display disabled:opacity-50"
                  title="Télécharger le bordereau en fichier CSV / Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Télécharger (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => printSuppliesReport({
                    supplies: filteredSupplies,
                    dateString: supplyDateFilter === 'all' ? undefined : supplyDateFilter,
                    shopProfile
                  })}
                  disabled={filteredSupplies.length === 0}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer font-display disabled:opacity-50"
                  title="Imprimer le bordereau de réception"
                >
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-display">
                  Filtrer par Date d'Arrivage
                </label>
                <select
                  value={supplyDateFilter}
                  onChange={(e) => setSupplyDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="all">Toutes les dates ({suppliesList.length} arrivages)</option>
                  {availableSupplyDates.map((d) => (
                    <option key={d} value={d}>
                      {new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-display">
                  Recherche par Article / Fournisseur
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex: Riz, Grossiste..."
                    value={supplySearch}
                    onChange={(e) => setSupplySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800">
                  {supplyDateFilter === 'all' ? 'Tous les arrivages' : `Arrivage du ${supplyDateFilter}`}
                </span>
              </div>
              <div className="flex items-center space-x-3 font-display">
                <span className="text-slate-600">
                  Quantité reçue : <strong className="text-slate-900">+{totalFilteredSupplyQty}</strong>
                </span>
                <span className="text-emerald-700 font-black">
                  Investissement : {formatCurrency(totalFilteredSupplyCost)}
                </span>
              </div>
            </div>

            {filteredSupplies.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <PackagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="font-bold text-slate-700 block text-sm">Aucun approvisionnement enregistré</span>
                <p className="text-[11px] text-slate-500">Utilisez le formulaire ci-contre pour enregistrer votre premier arrivage.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {filteredSupplies.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl shadow-2xs transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-black text-slate-900 text-xs sm:text-sm">{s.productName}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] font-display">
                          +{s.quantity} unités
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-500 flex-wrap">
                        <span>Coût unitaire : <strong className="text-slate-800">{formatCurrency(s.costPrice)}</strong></span>
                        <span>Total ligne : <strong className="text-emerald-700 font-display">{formatCurrency(s.totalCost)}</strong></span>
                        {s.supplierName && <span>Fournisseur : <em>{s.supplierName}</em></span>}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        Enregistré le {formatDateTime(s.createdAt)} {s.notes ? `• ${s.notes}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSupply(s.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer ml-2 shrink-0"
                      title="Supprimer cette entrée"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL AJOUT NOUVEL ARTICLE */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 font-display">
                    Ajouter un Nouvel Article
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Renseignez la fiche produit, les prix et la quantité initiale
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center space-x-3.5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="relative group shrink-0">
                  {newProductImage ? (
                    <img
                      src={newProductImage}
                      alt="Aperçu article"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-dashed border-emerald-300 text-emerald-600 flex flex-col items-center justify-center text-center p-1">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[8px] font-bold uppercase leading-tight">Photo</span>
                    </div>
                  )}
                  {isCompressingProductImage && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white text-[9px] font-bold">
                      ...
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Photo de l'article <span className="text-slate-400 text-[10px] font-normal">(optionnel)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-2xs font-display">
                      <span>{newProductImage ? 'Changer' : 'Prendre / Importer'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="hidden"
                      />
                    </label>
                    {newProductImage && (
                      <button
                        type="button"
                        onClick={() => setNewProductImage(null)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                  Nom de l'Article <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Savon liquide 500ml, Sac de Riz 25kg..."
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none shadow-2xs"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Prix de Vente (FCFA) <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 1000"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-emerald-700 focus:bg-white focus:border-emerald-500 outline-none font-display shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Prix d'Achat Unitaire (Coût)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 750"
                    value={newProductCostPrice}
                    onChange={(e) => setNewProductCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none font-display shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                  Code-barres / Référence
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Ex: 615110000000 ou scanner avec la caméra"
                    value={newProductBarcode}
                    onChange={(e) => setNewProductBarcode(e.target.value)}
                    className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsBarcodeModalOpen(true)}
                    className="absolute right-1.5 p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Scanner un code-barres"
                  >
                    <Barcode className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-1 font-display">
                      Quantité initiale en stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Ex: 20"
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-1 font-display">
                      Seuil alerte stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="5"
                      value={newProductMinAlert}
                      onChange={(e) => setNewProductMinAlert(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer font-display"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAddingProduct}
                  className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50 font-display"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isAddingProduct ? 'Enregistrement...' : 'Enregistrer l\'Article'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SCANNER CODE-BARRES */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={(code) => {
          setNewProductBarcode(code);
          setIsBarcodeModalOpen(false);
          triggerDoubleHaptic();
        }}
      />

      {/* MODAL DE RÉAPPROVISIONNEMENT RAPIDE */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100">
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 font-display">
                  Réapprovisionner le Stock
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fiche Produit simplifiée */}
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-3 flex items-center space-x-3 shadow-2xs">
              {restockProduct.imageUrl ? (
                <img
                  src={restockProduct.imageUrl}
                  alt={restockProduct.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs shrink-0">
                  <Package className="w-6 h-6 stroke-[2]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight truncate font-display">
                  {restockProduct.name}
                </h4>
                <p className="font-black text-sm text-emerald-600 mt-0.5 font-display">
                  {formatCurrency(restockProduct.price)}
                </p>
                <span className="text-[10px] font-bold text-slate-500">
                  Stock actuel : {restockProduct.stockQuantity !== undefined ? `${restockProduct.stockQuantity} unité(s)` : 'Non suivi'}
                </span>
              </div>
            </div>

            <form onSubmit={handleApplyRestockModal} className="space-y-4">
              {/* Stepper épuré : [-]  [Chiffre]  [+] */}
              <div className="py-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 text-center font-display tracking-wider">
                  Quantité à ajouter au stock *
                </label>
                <div className="flex items-center justify-center space-x-5">
                  {/* Bouton Moins */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      const current = parseInt(restockQtyInput, 10) || 0;
                      setRestockQtyInput(String(Math.max(1, current - 1)));
                    }}
                    className="w-14 h-14 rounded-2xl border-2 border-slate-200/90 bg-white hover:bg-rose-50/50 text-slate-800 active:bg-rose-600 active:border-rose-600 active:text-white flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
                    title="Diminuer d'une unité"
                  >
                    <Minus className="w-6 h-6 stroke-[3]" />
                  </button>

                  {/* Chiffre au milieu */}
                  <div className="flex flex-col items-center justify-center min-w-[70px]">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={restockQtyInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setRestockQtyInput(val === '' ? '1' : val);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-24 text-center text-4xl sm:text-5xl font-black text-slate-950 font-display bg-transparent border-0 focus:outline-none focus:ring-0 select-all p-0 leading-none cursor-text tracking-tight"
                      autoFocus
                    />
                    <span className="text-[10px] font-extrabold text-slate-400 mt-1 uppercase tracking-wider font-display">
                      Unités
                    </span>
                  </div>

                  {/* Bouton Plus */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      const current = parseInt(restockQtyInput, 10) || 0;
                      setRestockQtyInput(String(Math.max(1, current + 1)));
                    }}
                    className="w-14 h-14 rounded-2xl border-2 border-emerald-700 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-md shadow-emerald-700/20"
                    title="Ajouter une unité"
                  >
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Paramètres optionnels de prix */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-1">
                    Prix d'achat unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={restockProduct.costPrice ? String(restockProduct.costPrice) : 'Ex: 350'}
                    value={restockCostPriceInput}
                    onChange={(e) => setRestockCostPriceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-1">
                    Prix de vente (FCFA)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={String(restockProduct.price)}
                    value={restockSellingPriceInput}
                    onChange={(e) => setRestockSellingPriceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-1">
                  Nom du fournisseur (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Grossiste Ouaga"
                  value={restockSupplierInput}
                  onChange={(e) => setRestockSupplierInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer font-display"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="w-1/2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer font-display disabled:opacity-50"
                >
                  {isRestocking ? 'Ajout...' : 'Ajouter au Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
