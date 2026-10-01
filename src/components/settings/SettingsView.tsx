import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { 
  Store, 
  Smartphone, 
  Check, 
  Save, 
  AlertTriangle, 
  PackagePlus, 
  Trash2, 
  Tag, 
  User, 
  Crown,
  Sparkles,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Volume2,
  VolumeX,
  Mic,
  Vibrate,
  VibrateOff,
  Download,
  Upload,
  Headphones,
  FileJson,
  Barcode,
  Camera,
  Boxes,
  PlusCircle,
  AlertCircle,
  Search,
  X,
  Package,
  BellRing,
  ArrowRight,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Calendar
} from 'lucide-react';
import { SuppliesHistoryModal } from '../inventory/SuppliesHistoryModal';
import { suppliesService } from '../../db/services/suppliesService';
import { exportSuppliesToExcel, printSuppliesReport } from '../../utils/suppliesExporter';
import { soundEffects } from '../../utils/soundEffects';
import { hashPin, verifyHash } from '../../utils/crypto';
import { cleanPhoneNumber, formatPhoneNumberDisplay, isValidPhoneNumber } from '../../utils/phoneValidation';
import { isHapticsEnabled, setHapticsEnabled, triggerDoubleHaptic } from '../../utils/haptics';
import { productsService } from '../../db/services/productsService';
import { subscriptionService, SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../db/services/subscriptionService';
import { syncService } from '../../db/services/syncService';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { OnlinePaymentModal } from '../subscription/OnlinePaymentModal';
import { ColorPalettePicker } from '../common/ColorPalettePicker';
import { Product, StockSupply } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type SettingsTab = 'shop' | 'catalog' | 'subscription' | 'payments';
type CatalogSubTab = 'catalog' | 'supplies';

const getInitialSettingsTab = (): SettingsTab => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fasocarnet_settings_tab');
    if (saved === 'shop' || saved === 'catalog' || saved === 'subscription' || saved === 'payments') {
      return saved as SettingsTab;
    }
  }
  return 'shop';
};

export const SettingsView: React.FC = () => {
  const { shopProfile, updateShopProfile } = useAppStore();

  const [activeSubTab, setActiveSubTabState] = useState<SettingsTab>(getInitialSettingsTab);
  const [catalogSubTab, setCatalogSubTab] = useState<CatalogSubTab>('catalog');

  const setActiveSubTab = (tab: SettingsTab) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_settings_tab', tab);
    }
    setActiveSubTabState(tab);
  };

  // Profil boutique
  const [name, setName] = useState(shopProfile?.name || '');
  const [description, setDescription] = useState(shopProfile?.description || '');
  const [ownerName, setOwnerName] = useState(shopProfile?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(shopProfile?.ownerPhone || '');
  const [phone, setPhone] = useState(shopProfile?.phone || '');
  const [omNumber, setOmNumber] = useState(shopProfile?.orangeMoneyNumber || '');
  const [moovNumber, setMoovNumber] = useState(shopProfile?.moovMoneyNumber || '');
  const [waveNumber, setWaveNumber] = useState(shopProfile?.waveNumber || '');
  const [ifu, setIfu] = useState(shopProfile?.ifu || '');
  const [rccm, setRccm] = useState(shopProfile?.rccm || '');
  const [logo, setLogo] = useState<string | null>(shopProfile?.logo || null);
  const [primaryColor, setPrimaryColor] = useState<string>(shopProfile?.primaryColor || '#047857');
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<'58mm' | '80mm'>(shopProfile?.receiptPaperWidth || '58mm');
  const [debtAlarmEnabled, setDebtAlarmEnabled] = useState(shopProfile?.debtAlarmEnabled !== false);
  const [debtAlarmDay, setDebtAlarmDay] = useState(shopProfile?.debtAlarmDay ?? 1);
  const [pin, setNewPin] = useState(shopProfile?.pinCode || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [confirmPinError, setConfirmPinError] = useState('');

  useEffect(() => {
    if (shopProfile) {
      setName(shopProfile.name || '');
      setDescription(shopProfile.description || '');
      setOwnerName(shopProfile.ownerName || '');
      setOwnerPhone(shopProfile.ownerPhone || '');
      setPhone(shopProfile.phone || '');
      setOmNumber(shopProfile.orangeMoneyNumber || '');
      setMoovNumber(shopProfile.moovMoneyNumber || '');
      setWaveNumber(shopProfile.waveNumber || '');
      setIfu(shopProfile.ifu || '');
      setRccm(shopProfile.rccm || '');
      setLogo(shopProfile.logo || null);
      setPrimaryColor(shopProfile.primaryColor || '#047857');
      setReceiptPaperWidth(shopProfile.receiptPaperWidth || '58mm');
      setDebtAlarmEnabled(shopProfile.debtAlarmEnabled !== false);
      setDebtAlarmDay(shopProfile.debtAlarmDay ?? 1);
      setNewPin(shopProfile.pinCode || '');
    }
  }, [shopProfile]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 180;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.85);
          setLogo(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Gestion du Catalogue d'Articles & Stock
  const [products, setProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCostPrice, setNewProductCostPrice] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductMinAlert, setNewProductMinAlert] = useState('5');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSuppliesHistoryModalOpen, setIsSuppliesHistoryModalOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'low_stock'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Gestion des Approvisionnements
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

  // Modal de Réapprovisionnement Rapide
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState('10');
  const [restockCostPriceInput, setRestockCostPriceInput] = useState('');
  const [restockSellingPriceInput, setRestockSellingPriceInput] = useState('');
  const [restockSupplierInput, setRestockSupplierInput] = useState('');
  const [restockNotesInput, setRestockNotesInput] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  // Gestion de l'Abonnement en ligne
  const [isOnlinePaymentModalOpen, setIsOnlinePaymentModalOpen] = useState(false);
  const [planForOnlinePayment, setPlanForOnlinePayment] = useState<SubscriptionPlan | undefined>(undefined);

  // Retours Sonores, Vocaux et Vibreur Tactile
  const [soundEnabled, setSoundEnabledState] = useState(() => soundEffects.getSoundEnabled());
  const [voiceEnabled, setVoiceEnabledState] = useState(() => soundEffects.getVoiceEnabled());
  const [hapticsEnabled, setHapticsEnabledState] = useState(() => isHapticsEnabled());

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    soundEffects.setSoundEnabled(next);
    if (next) {
      soundEffects.playCashRegisterChime();
    }
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabledState(next);
    soundEffects.setVoiceEnabled(next);
    if (next) {
      soundEffects.speakSaleConfirmation(5000);
    }
  };

  const toggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabledState(next);
    setHapticsEnabled(next);
    if (next) {
      triggerDoubleHaptic();
    }
  };

  useEffect(() => {
    loadProducts();
    loadSupplies();

    const handleDbUpdated = () => {
      loadProducts();
      loadSupplies();
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleExportBackup = async () => {
    if (!shopProfile) return;
    setIsExporting(true);
    setBackupFeedback(null);
    try {
      const json = await syncService.exportBackupData(shopProfile.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = shopProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sauvegarde_fasocarnet_${safeName}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupFeedback({ success: true, message: 'Sauvegarde exportée avec succès !' });
      setTimeout(() => setBackupFeedback(null), 4000);
    } catch (err: any) {
      setBackupFeedback({ success: false, message: err.message || "Erreur lors de l'exportation." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setBackupFeedback(null);
    try {
      const text = await file.text();
      const res = await syncService.importBackupData(text);
      setBackupFeedback({ success: res.success, message: res.message });
      if (res.success && res.shop) {
        updateShopProfile(res.shop);
        await loadProducts();
        await loadSupplies();
      }
      setTimeout(() => setBackupFeedback(null), 5000);
    } catch (err: any) {
      console.error(err);
      setBackupFeedback({ success: false, message: 'Erreur lors de la restauration du fichier.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleContactSupport = () => {
    const shopName = shopProfile?.name || 'Mon commerce';
    const text = encodeURIComponent(`Bonjour support FasoCarnet, je suis le responsable de « ${shopName} ». J'ai besoin d'une assistance pour mon abonnement.`);
    window.open(`https://wa.me/22665616134?text=${text}`, '_blank');
  };

  const subInfo = subscriptionService.getSubscriptionInfo(shopProfile);
  const isPremium = subscriptionService.isPremiumActive(shopProfile);

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
        costPrice
      );
      setNewProductName('');
      setNewProductCostPrice('');
      setNewProductPrice('');
      setNewProductBarcode('');
      setNewProductStock('');
      setNewProductMinAlert('5');
      await loadProducts();
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

  const executeSaveProfile = async () => {
    const updatedPin = pin.trim().length === 4
      ? hashPin(pin.trim())
      : (pin.trim() === '' && shopProfile?.pinCode ? shopProfile.pinCode : undefined);

    await updateShopProfile({
      name: name.trim() || 'Ma Boutique',
      description: description.trim() || undefined,
      ownerName: ownerName.trim(),
      ownerPhone: cleanPhoneNumber(ownerPhone) || undefined,
      phone: cleanPhoneNumber(phone),
      orangeMoneyNumber: cleanPhoneNumber(omNumber) || undefined,
      moovMoneyNumber: cleanPhoneNumber(moovNumber) || undefined,
      waveNumber: cleanPhoneNumber(waveNumber) || undefined,
      ifu: ifu.trim() || undefined,
      rccm: rccm.trim() || undefined,
      logo: logo || undefined,
      primaryColor: primaryColor || undefined,
      receiptPaperWidth: receiptPaperWidth || '58mm',
      debtAlarmEnabled: debtAlarmEnabled,
      debtAlarmDay: debtAlarmDay,
      pinCode: updatedPin
    });
    setSavedSuccess(true);
    setPhoneError(null);
    setShowPaymentConfirmModal(false);
    setConfirmPinInput('');
    setConfirmPinError('');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    // Validation stricte des numéros
    if (phone.trim()) {
      const res = isValidPhoneNumber(phone);
      if (!res.isValid) {
        setPhoneError(`Téléphone Caisse : ${res.message}`);
        return;
      }
    }
    if (ownerPhone.trim()) {
      const res = isValidPhoneNumber(ownerPhone);
      if (!res.isValid) {
        setPhoneError(`WhatsApp Propriétaire : ${res.message}`);
        return;
      }
    }
    if (omNumber.trim()) {
      const res = isValidPhoneNumber(omNumber);
      if (!res.isValid) {
        setPhoneError(`Numéro Orange Money : ${res.message}`);
        return;
      }
    }
    if (moovNumber.trim()) {
      const res = isValidPhoneNumber(moovNumber);
      if (!res.isValid) {
        setPhoneError(`Numéro Moov Money : ${res.message}`);
        return;
      }
    }
    if (waveNumber.trim()) {
      const res = isValidPhoneNumber(waveNumber);
      if (!res.isValid) {
        setPhoneError(`Numéro Wave : ${res.message}`);
        return;
      }
    }

    // Sécurité : si modification des numéros marchands, demander confirmation
    if (activeSubTab === 'payments') {
      const hasChanged =
        cleanPhoneNumber(omNumber) !== (shopProfile?.orangeMoneyNumber || '') ||
        cleanPhoneNumber(moovNumber) !== (shopProfile?.moovMoneyNumber || '') ||
        cleanPhoneNumber(waveNumber) !== (shopProfile?.waveNumber || '');

      if (hasChanged) {
        setShowPaymentConfirmModal(true);
        return;
      }
    }

    await executeSaveProfile();
  };

  const handleConfirmPaymentSave = async () => {
    if (shopProfile?.pinCode) {
      if (!confirmPinInput) {
        setConfirmPinError('Veuillez saisir votre code PIN.');
        return;
      }
      const isValid = verifyHash(confirmPinInput, shopProfile.pinCode);
      if (!isValid) {
        setConfirmPinError('Code PIN incorrect.');
        return;
      }
    }
    await executeSaveProfile();
  };

  const lowStockCount = products.filter(
    (p) => p.stockQuantity !== undefined && p.stockQuantity <= (p.minStockAlert ?? 5)
  ).length;

  const filteredProducts = products.filter((p) => {
    const matchesFilter = catalogFilter === 'all' || (p.stockQuantity !== undefined && p.stockQuantity <= (p.minStockAlert ?? 5));
    const cleanSearch = catalogSearch.trim().toLowerCase();
    const matchesSearch = !cleanSearch || 
      p.name.toLowerCase().includes(cleanSearch) || 
      (p.barcode && p.barcode.toLowerCase().includes(cleanSearch));
    return matchesFilter && matchesSearch;
  });

  // Approvisionnements filtrés
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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    { id: 'shop', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
    { 
      id: 'catalog', 
      label: 'Articles & Stock', 
      icon: <Tag className="w-4 h-4" />, 
      badge: lowStockCount > 0 ? `${lowStockCount}⚠️` : (products.length > 0 ? products.length : undefined),
      badgeColor: lowStockCount > 0 ? 'bg-amber-500' : 'bg-emerald-600'
    },
    { 
      id: 'subscription', 
      label: 'Licence & Abonnement', 
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      badge: subInfo.isExpired ? '!' : (subInfo.daysRemaining <= 5 ? `${subInfo.daysRemaining}j` : undefined),
      badgeColor: subInfo.isExpired ? 'bg-red-500' : 'bg-amber-500'
    },
    { id: 'payments', label: 'Paiements Mobile Money', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-12 space-y-6">
      {/* En-tête titre avec statut de sauvegarde */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3 text-slate-900">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-inner">
            <Store className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900">Ma Boutique & Paramètres</h2>
            <p className="text-xs text-slate-500 font-medium">Gestion complète du commerce, du catalogue d'articles, des approvisionnements et de la licence</p>
          </div>
        </div>
        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 animate-in fade-in shadow-xs border border-emerald-200">
            <Check className="w-4 h-4" />
            <span>Modifications enregistrées !</span>
          </span>
        )}
      </div>

      {/* SÉLECTEUR DE RUBRIQUES ÉTENDU SUR TOUTE LA LARGEUR */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-200/90 p-1.5 rounded-2xl shadow-2xs">
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`w-full py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-emerald-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className={`absolute -top-2.5 -right-3 text-[9px] font-black text-white px-1.5 py-0.2 rounded-full leading-tight ${tab.badgeColor || 'bg-emerald-500'}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="font-display truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* RUBRIQUE 1 : BOUTIQUE (Identité, Sécurité, Sauvegarde)   */}
      {/* ======================================================== */}
      {activeSubTab === 'shop' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start animate-in fade-in duration-150">
          {/* Formulaire Identité du Commerce */}
          <form onSubmit={handleSaveProfile} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 text-emerald-900 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight font-display text-slate-900">Identité du Commerce</h3>
                <p className="text-[10px] text-slate-500 font-medium">Informations imprimées sur vos reçus et tickets de caisse</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                Nom de la Boutique *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: Boutique La Grâce"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                Slogan / Activité du Commerce
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: Vente de tissus, prêt-à-porter & accessoires"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                  Nom du Gérant / Responsable
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                    placeholder="Ex: M. Moussa Ouédraogo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                  Téléphone Caisse *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhoneError(null);
                    setPhone(cleanPhoneNumber(e.target.value));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: 70 00 00 00"
                />
              </div>
            </div>

            {phoneError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs font-semibold animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{phoneError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                WhatsApp du Propriétaire (Point du soir & alertes)
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => {
                  setPhoneError(null);
                  setOwnerPhone(cleanPhoneNumber(e.target.value));
                }}
                className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: 70 12 34 56"
              />
            </div>

            {/* Mentions Légales pour Reçus : IFU & RCCM */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                  N° IFU
                </label>
                <input
                  type="text"
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: 00012345A"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1 font-display">
                  N° RCCM
                </label>
                <input
                  type="text"
                  value={rccm}
                  onChange={(e) => setRccm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: BF-OUA-2024"
                />
              </div>
            </div>

            {/* Logo de l'entreprise */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1.5 font-display">
                Logo de l'Entreprise (Reçus & Factures)
              </label>
              {logo ? (
                <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Logo configuré</p>
                    <p className="text-[10px] text-slate-500">Apparaît sur les tickets & factures imprimées</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogo(null)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Supprimer le logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 p-3 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl cursor-pointer text-xs font-bold text-emerald-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Importer un logo (PNG / JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Couleur de marque & Thème des reçus/factures */}
            <div className="pt-2 border-t border-slate-100">
              <ColorPalettePicker
                selectedColor={primaryColor}
                onChange={setPrimaryColor}
                shopName={name}
                showPreview={true}
              />
            </div>

            {/* Format d'impression des Tickets de Caisse (Rouleau Thermique) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-[10px] font-bold uppercase text-slate-600 tracking-wider font-display">
                Format des Tickets de Caisse (Rouleau Thermique)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setReceiptPaperWidth('58mm')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    receiptPaperWidth === '58mm'
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 font-display">Rouleau 58 mm</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      receiptPaperWidth === '58mm' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      Par défaut
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Mini-imprimantes portables Bluetooth de poche (Le standard le plus économique)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptPaperWidth('80mm')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    receiptPaperWidth === '80mm'
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 font-display">Rouleau 80 mm</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      receiptPaperWidth === '80mm' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      Large
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Imprimantes de caisse de comptoir (Epson, Xprinter, supermarchés)
                  </p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-xs flex items-center justify-center space-x-2 active:scale-98 transition-all text-xs sm:text-sm cursor-pointer font-display"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Coordonnées</span>
            </button>
          </form>

          {/* Colonne de droite : Paramètres avancés, sécurité & sauvegarde */}
          <div className="space-y-4">
            {/* Alarme Dettes */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-tight text-slate-900 font-display">Alarme & Relance des Dettes</h3>
                  <p className="text-[10px] text-slate-500">Rappel automatique hebdomadaire des clients débiteurs</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Activer l'alarme automatique</p>
                  <p className="text-[10px] text-slate-500">Alerte sonore et modale chaque semaine</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = !debtAlarmEnabled;
                    setDebtAlarmEnabled(nextVal);
                    await updateShopProfile({ debtAlarmEnabled: nextVal });
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    debtAlarmEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                </button>
              </div>
            </div>

            {/* Retours Sonores & Vocaux */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-tight text-slate-900 font-display">Sons & Retours Tactiles</h3>
                  <p className="text-[10px] text-slate-500">Confirmation audio et vibration lors des encaissements</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-semibold text-slate-800">Bruitage de caisse enregistreuse</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      soundEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mic className={`w-4 h-4 ${voiceEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-800">Synthèse vocale du montant</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      voiceEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {hapticsEnabled ? <Vibrate className="w-4 h-4 text-emerald-600" /> : <VibrateOff className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-semibold text-slate-800">Vibration tactile (Mobile)</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHaptics}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      hapticsEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sauvegarde & Restauration */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-tight text-slate-900 font-display">Sauvegarde & Restauration de Secours</h3>
                  <p className="text-[10px] text-slate-500">Exportez ou restaurez vos données complètes en fichier JSON</p>
                </div>
              </div>

              {backupFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  backupFeedback.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {backupFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{backupFeedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportBackup}
                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{isExporting ? 'Export...' : 'Exporter (.json)'}</span>
                </button>

                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>{isImporting ? 'Lecture...' : 'Restaurer (.json)'}</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>

            {/* Assistance WhatsApp */}
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 p-4 sm:p-5 rounded-3xl text-white shadow-xs space-y-3">
              <div className="flex items-center space-x-2.5 border-b border-emerald-700/60 pb-2">
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs font-display">Besoin d'aide ou d'une assistance ?</h3>
                  <p className="text-[10px] text-emerald-200">Support officiel FasoCarnet disponible 7j/7</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContactSupport}
                className="w-full py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 font-black rounded-xl text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer font-display"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Contacter le Support WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 2 : ARTICLES & APPROVISIONNEMENTS               */}
      {/* ======================================================== */}
      {activeSubTab === 'catalog' && (
        !isPremium ? (
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
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
                Enregistrez vos articles avec prix d'achat et de vente, suivez le journal d'approvisionnement par date, téléchargez vos bordereaux et scannez les codes-barres.
              </p>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-left space-y-2.5 border border-white/10 mb-5">
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-xs">Catalogue illimité et calcul automatique des marges</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-xs">Journal des approvisionnements par jour avec export Excel / CSV</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-xs">Impression directe des bordereaux de réception</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-xs">Scanner de codes-barres et alertes stock critique</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('subscription')}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
              >
                <span>Activer FasoCarnet Pro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* SOUS-NAVIGATION ARTICLES : CATALOGUE VS APPROVISIONNEMENTS */}
            <div className="w-full grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setCatalogSubTab('catalog')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center space-x-2 transition-all cursor-pointer font-display ${
                  catalogSubTab === 'catalog'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Catalogue & Création d'Articles</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full ml-1">
                  {products.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCatalogSubTab('supplies')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center space-x-2 transition-all cursor-pointer font-display ${
                  catalogSubTab === 'supplies'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <span>Approvisionnements & Journal</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full ml-1">
                  {suppliesList.length}
                </span>
              </button>
            </div>

            {/* VUE 1 : CATALOGUE D'ARTICLES */}
            {catalogSubTab === 'catalog' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start animate-in fade-in duration-150">
                {/* FORMULAIRE DE CRÉATION D'ARTICLE (5 colonnes) */}
                <form onSubmit={handleAddProduct} className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                      <PackagePlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 font-display">Ajouter un Nouvel Article</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Saisie du nom, prix d'achat, prix de vente et stock</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Nom du produit */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                        Désignation du produit <span className="text-emerald-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Bic Cristal Bleu, Sac de riz 25kg, Savon BF..."
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                      />
                    </div>

                    {/* Prix d'Achat & Prix de Vente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                          Prix d'achat <span className="text-slate-400 text-[9px] font-normal">(coût)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            placeholder="Ex: 350"
                            value={newProductCostPrice}
                            onChange={(e) => setNewProductCostPrice(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none">
                            FCFA
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                          Prix de vente <span className="text-emerald-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Ex: 500"
                            value={newProductPrice}
                            onChange={(e) => setNewProductPrice(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none">
                            FCFA
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Marge unitaire en direct */}
                    {parseFloat(newProductPrice) > 0 && parseFloat(newProductCostPrice) > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs animate-in fade-in duration-150">
                        <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                          <span>Marge bénéficiaire unitaire :</span>
                        </div>
                        <span className="font-black text-amber-900 font-display">
                          +{formatCurrency(parseFloat(newProductPrice) - parseFloat(newProductCostPrice))}
                          {' '}(+{Math.round(((parseFloat(newProductPrice) - parseFloat(newProductCostPrice)) / parseFloat(newProductCostPrice)) * 100)}%)
                        </span>
                      </div>
                    )}

                    {/* Code-barres */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                        Code-barres <span className="text-slate-400 text-[9px] font-normal">(optionnel)</span>
                      </label>
                      <div className="flex space-x-1.5">
                        <div className="relative flex-1">
                          <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Scan / code"
                            value={newProductBarcode}
                            onChange={(e) => setNewProductBarcode(e.target.value)}
                            className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsBarcodeModalOpen(true)}
                          className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs"
                          title="Scanner avec la caméra"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stock initial & Seuil d'alerte */}
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block font-display">
                        Gestion du Stock & Alertes
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 mb-1">
                            Stock initial <span className="text-emerald-600">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="Ex: 10, 50..."
                            value={newProductStock}
                            onChange={(e) => setNewProductStock(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 mb-1">
                            Seuil alerte stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="5"
                            value={newProductMinAlert}
                            onChange={(e) => setNewProductMinAlert(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingProduct}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50 font-display"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isAddingProduct ? 'Enregistrement...' : 'Enregistrer l\'Article'}</span>
                  </button>
                </form>

                {/* LISTE ET RECHERCHE DES ARTICLES (7 colonnes) */}
                <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  {/* KPI Overview */}
                  <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white p-4 rounded-2xl shadow-md border border-emerald-700/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block font-display">
                          Articles Enregistrés
                        </span>
                        <h3 className="text-base font-black text-white font-display">
                          {products.length} référence{products.length > 1 ? 's' : ''} en stock
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      {lowStockCount > 0 ? (
                        <div className="bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-xl text-[10px] font-black text-amber-300 animate-pulse flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lowStockCount} à réappro.</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-xl text-[10px] font-bold text-emerald-300 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Stock optimal</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recherche & Filtres */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom d'article ou code-barres..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
                      />
                      {catalogSearch && (
                        <button
                          type="button"
                          onClick={() => setCatalogSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCatalogFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display ${
                          catalogFilter === 'all'
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tous les articles ({products.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogFilter('low_stock')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer font-display ${
                          catalogFilter === 'low_stock'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Stock critique ({lowStockCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Grille / Liste des articles */}
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                      {catalogFilter === 'low_stock' ? (
                        <>
                          <span className="text-emerald-700 font-bold block text-sm">🎉 Aucun stock critique</span>
                          <p className="text-[11px] text-slate-500">Tous vos articles ont un stock suffisant.</p>
                        </>
                      ) : catalogSearch ? (
                        <>
                          <span className="font-bold block">Aucun résultat pour « {catalogSearch} »</span>
                          <p className="text-[11px]">Vérifiez l'orthographe du nom ou le code-barres.</p>
                        </>
                      ) : (
                        'Aucun article enregistré. Utilisez le formulaire ci-contre pour ajouter votre premier produit.'
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {filteredProducts.map((prod) => {
                        const hasStock = prod.stockQuantity !== undefined;
                        const isOutOfStock = hasStock && prod.stockQuantity! <= 0;
                        const isLowStock = hasStock && !isOutOfStock && prod.stockQuantity! <= (prod.minStockAlert ?? 5);

                        return (
                          <div
                            key={prod.id}
                            className="p-3.5 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl shadow-2xs transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 font-display">
                                {prod.name.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate block">{prod.name}</span>
                                  {prod.barcode && (
                                    <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-600 rounded font-mono text-[9px] font-semibold shrink-0">
                                      <Barcode className="w-2.5 h-2.5 text-slate-400" />
                                      <span>{prod.barcode}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-xs">
                                  <span className="text-emerald-700 font-extrabold tracking-tight font-display">
                                    {formatCurrency(prod.price)}
                                  </span>

                                  {prod.costPrice !== undefined && prod.costPrice > 0 && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      (Coût: {formatCurrency(prod.costPrice)})
                                    </span>
                                  )}

                                  {/* Badge de Stock */}
                                  {isOutOfStock && (
                                    <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                      Rupture (0)
                                    </span>
                                  )}
                                  {isLowStock && (
                                    <span className="text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                      Stock faible ({prod.stockQuantity})
                                    </span>
                                  )}
                                  {hasStock && !isOutOfStock && !isLowStock && (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      Stock: {prod.stockQuantity}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRestockProduct(prod);
                                  setRestockQtyInput('10');
                                }}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-xl border border-emerald-200/80 text-xs flex items-center space-x-1 active:scale-95 transition-all shadow-2xs font-display cursor-pointer"
                                title="Réapprovisionner le stock"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Réappro</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
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
              </div>
            )}

            {/* VUE 2 : APPROVISIONNEMENTS & JOURNAL DES ENTRÉES */}
            {catalogSubTab === 'supplies' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start animate-in fade-in duration-150">
                {/* FORMULAIRE D'APPROVISIONNEMENT (5 colonnes) */}
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
                    {/* Sélection du produit */}
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

                    {/* Quantité à ajouter */}
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
                      {/* Raccourcis rapides */}
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

                    {/* Prix d'Achat & Prix de Vente pour cet Arrivage */}
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

                    {/* Fournisseur & Notes */}
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

                    {/* Coût total estimé */}
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
                    disabled={isSubmittingSupply}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50 font-display"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isSubmittingSupply ? 'Enregistrement...' : 'Valider l\'Entrée en Stock'}</span>
                  </button>
                </form>

                {/* JOURNAL DES ENTRÉES & EXPORT DU BORDEREAU (7 colonnes) */}
                <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  {/* Barre d'actions & Export */}
                  <div className="flex items-center justify-between flex-wrap gap-2.5">
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

                  {/* Filtres par Date & Recherche */}
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

                  {/* Synthèse du Filtre Actuel */}
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

                  {/* Liste des Entrées d'Approvisionnement */}
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
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 3 : ABONNEMENT & LICENCE (2 000 FCFA / MOIS)    */}
      {/* ======================================================== */}
      {activeSubTab === 'subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start animate-in fade-in duration-150">
          {/* Carte Statut Actuel */}
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-6 rounded-3xl shadow-md border border-emerald-700/50 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-emerald-200 tracking-wider uppercase font-display">
                  Statut de votre compte
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                subInfo.status === 'active' 
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' 
                  : subInfo.status === 'trial'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                  : 'bg-red-500/30 text-red-300 border border-red-400/40'
              }`}>
                {subInfo.statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-700/60">
              <div>
                <span className="text-xs text-emerald-300/80 block font-medium">Temps restant</span>
                <span className="text-3xl font-black text-white font-display">
                  {subInfo.daysRemaining} <span className="text-sm font-bold text-emerald-300">jours</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-300/80 block font-medium">Valable jusqu'au</span>
                <span className="text-sm font-black text-amber-300 font-display">
                  {subInfo.formattedExpiresAt}
                </span>
              </div>
            </div>

            <div className="text-xs bg-emerald-950/70 p-3 rounded-2xl border border-emerald-700/40 text-emerald-200 flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Formule active : <strong>{subInfo.planName}</strong></span>
            </div>
          </div>

          {/* Formules d'Abonnement */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-emerald-900">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm font-display">Prolonger ma Licence</h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <Zap className="w-3 h-3 text-emerald-700" />
                <span>Activation instantanée</span>
              </span>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Prolongez votre accès en 1 clic par <strong>Orange Money</strong>, <strong>Moov Money</strong> ou <strong>Wave</strong>.
            </p>

            <div className="space-y-2.5 pt-1">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    setPlanForOnlinePayment(plan);
                    setIsOnlinePaymentModalOpen(true);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    plan.popular
                      ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 shadow-xs ring-1 ring-emerald-400/40'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm font-display">{plan.name}</span>
                      {plan.popular && (
                        <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider">
                          Populaire
                        </span>
                      )}
                    </div>
                    {plan.discountText && (
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        🎁 {plan.discountText}
                      </span>
                    )}
                  </div>

                  <div className="text-right flex items-center space-x-3">
                    <span className="text-sm sm:text-base font-black text-slate-900 font-display">
                      {formatCurrency(plan.price)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlanForOnlinePayment(plan);
                        setIsOnlinePaymentModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer active:scale-95 transition-all font-display"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>Payer ➔</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleContactSupport}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Besoin d'aide pour votre abonnement ? Contactez le support WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 4 : PAIEMENTS MOBILE MONEY                      */}
      {/* ======================================================== */}
      {activeSubTab === 'payments' && (
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start animate-in fade-in duration-150">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight font-display text-slate-900">Numéros de Réception Marchand</h3>
                <p className="text-[10px] text-slate-500">Pour recevoir les règlements de vos clients</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ces numéros seront automatiquement insérés dans vos reçus et vos relances WhatsApp de dettes.
            </p>

            {phoneError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs font-semibold animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{phoneError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#ff6600] uppercase tracking-wider mb-1 font-display">
                Numéro Orange Money (Burkina Faso)
              </label>
              <input
                type="tel"
                value={omNumber}
                onChange={(e) => {
                  setPhoneError(null);
                  setOmNumber(cleanPhoneNumber(e.target.value));
                }}
                className="w-full px-3 py-2 bg-orange-50/40 border border-orange-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#ff6600]/30 outline-none transition-all placeholder:text-slate-400"
                placeholder="Ex: 70 12 34 56"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#005baa] uppercase tracking-wider mb-1 font-display">
                Numéro Moov Money (Burkina Faso)
              </label>
              <input
                type="tel"
                value={moovNumber}
                onChange={(e) => {
                  setPhoneError(null);
                  setMoovNumber(cleanPhoneNumber(e.target.value));
                }}
                className="w-full px-3 py-2 bg-blue-50/40 border border-blue-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#005baa]/30 outline-none transition-all placeholder:text-slate-400"
                placeholder="Ex: 60 12 34 56"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#1dc4fe] uppercase tracking-wider mb-1 font-display">
                Numéro Wave
              </label>
              <input
                type="tel"
                value={waveNumber}
                onChange={(e) => {
                  setPhoneError(null);
                  setWaveNumber(cleanPhoneNumber(e.target.value));
                }}
                className="w-full px-3 py-2 bg-sky-50/40 border border-sky-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1dc4fe]/30 outline-none transition-all placeholder:text-slate-400"
                placeholder="Ex: 70 12 34 56"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs flex items-center justify-center space-x-2 active:scale-98 transition-all text-xs sm:text-sm cursor-pointer font-display"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Numéros de Paiement</span>
            </button>
          </div>

          {/* Aperçu Reçu */}
          <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200/80 space-y-3">
            <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider font-display">
              Aperçu sur vos Reçus Clients
            </h4>
            <p className="text-xs text-slate-500">
              Voici comment vos moyens de paiement apparaîtront en bas de chaque ticket et facture :
            </p>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 font-mono text-xs">
              <div className="border-b border-slate-100 pb-1.5 text-center font-bold text-slate-800">
                MOYENS DE PAIEMENT ACCEPTÉS
              </div>
              <div className="flex justify-between">
                <span className="text-[#ff6600] font-bold">Orange Money :</span>
                <span>{omNumber ? formatPhoneNumberDisplay(omNumber) : 'Non configuré'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#005baa] font-bold">Moov Money :</span>
                <span>{moovNumber ? formatPhoneNumberDisplay(moovNumber) : 'Non configuré'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1dc4fe] font-bold">Wave :</span>
                <span>{waveNumber ? formatPhoneNumberDisplay(waveNumber) : 'Non configuré'}</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Modal de Sécurité pour Modification des Numéros Marchands */}
      {showPaymentConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-5 space-y-3.5 animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-center space-x-2.5 text-amber-800">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-tight text-slate-900 font-display">Confirmation de Sécurité</h3>
                <p className="text-[10px] text-slate-500 font-medium">Modification des numéros de paiement</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vous êtes sur le point de modifier les numéros sur lesquels vos clients effectuent leurs paiements Mobile Money.
            </p>

            <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5 border border-slate-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#ff6600]">Orange Money :</span>
                <span className="font-mono font-semibold">{formatPhoneNumberDisplay(omNumber) || '(Aucun)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#005baa]">Moov Money :</span>
                <span className="font-mono font-semibold">{formatPhoneNumberDisplay(moovNumber) || '(Aucun)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#1dc4fe]">Wave :</span>
                <span className="font-mono font-semibold">{formatPhoneNumberDisplay(waveNumber) || '(Aucun)'}</span>
              </div>
            </div>

            {shopProfile?.pinCode && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                  Saisissez votre code PIN (4 chiffres) :
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => {
                    setConfirmPinError('');
                    setConfirmPinInput(cleanPhoneNumber(e.target.value));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono font-black tracking-widest outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="••••"
                  autoFocus
                />
                {confirmPinError && (
                  <p className="text-[10px] font-bold text-red-600 text-center">{confirmPinError}</p>
                )}
              </div>
            )}

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentConfirmModal(false);
                  setConfirmPinInput('');
                  setConfirmPinError('');
                }}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentSave}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner Code-Barres Caméra */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={(code) => {
          setNewProductBarcode(code);
          setIsBarcodeModalOpen(false);
          triggerDoubleHaptic();
        }}
      />

      {/* Modal de Réapprovisionnement Rapide de Stock */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl p-4 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-black text-slate-900">Réapprovisionner le Stock</h3>
                <p className="text-[11px] font-bold text-emerald-700 truncate">
                  {restockProduct.name}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Stock actuel :</span>
                <span className="font-extrabold text-slate-900">
                  {restockProduct.stockQuantity !== undefined ? `${restockProduct.stockQuantity} unité(s)` : 'Non suivi'}
                </span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Prix unitaire :</span>
                <span>{formatCurrency(restockProduct.price)}</span>
              </div>
            </div>

            <form onSubmit={handleApplyRestockModal} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                  Quantité à ajouter au stock *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQtyInput}
                  onChange={(e) => setRestockQtyInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-emerald-500 rounded-xl text-sm font-black text-center text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none font-display"
                  placeholder="Ex: 10"
                  autoFocus
                />
              </div>

              {/* Boutons de raccourcis rapides */}
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 20, 50].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setRestockQtyInput(String(qty))}
                    className={`py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer font-display ${
                      restockQtyInput === String(qty)
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    +{qty}
                  </button>
                ))}
              </div>

              {/* Prix d'achat & Prix de vente pour cet arrivage */}
              <div className="grid grid-cols-2 gap-2 pt-1">
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

              {/* Fournisseur & Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-1">
                    Fournisseur <span className="text-slate-400 font-normal">(opt.)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Grossiste Ouaga"
                    value={restockSupplierInput}
                    onChange={(e) => setRestockSupplierInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-1">
                    Notes / N° Facture <span className="text-slate-400 font-normal">(opt.)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Arrivage du matin"
                    value={restockNotesInput}
                    onChange={(e) => setRestockNotesInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Coût total estimé du réassort */}
              {parseInt(restockQtyInput, 10) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900 text-[11px]">Coût total arrivage :</span>
                  <span className="font-black text-emerald-800 font-display">
                    {formatCurrency(
                      parseInt(restockQtyInput, 10) * 
                      (parseFloat(restockCostPriceInput) || restockProduct.costPrice || 0)
                    )}
                  </span>
                </div>
              )}

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRestockProduct(null);
                    setRestockCostPriceInput('');
                    setRestockSellingPriceInput('');
                    setRestockSupplierInput('');
                    setRestockNotesInput('');
                  }}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer font-display"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="w-1/2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-xs active:scale-98 flex items-center justify-center space-x-1 disabled:opacity-50 cursor-pointer font-display"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isRestocking ? 'Ajout...' : 'Valider Entrée'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique & Export des Approvisionnements */}
      <SuppliesHistoryModal
        isOpen={isSuppliesHistoryModalOpen}
        onClose={() => setIsSuppliesHistoryModalOpen(false)}
        onSupplyUpdated={() => {
          loadProducts();
          loadSupplies();
        }}
      />

      {/* Modal de Paiement Automatique Instantané (PayTech) */}
      <OnlinePaymentModal
        isOpen={isOnlinePaymentModalOpen}
        onClose={() => setIsOnlinePaymentModalOpen(false)}
        shopProfile={shopProfile}
        initialPlan={planForOnlinePayment}
        onSubscriptionSuccess={(updatedShop) => {
          updateShopProfile(updatedShop);
        }}
      />
    </div>
  );
};
