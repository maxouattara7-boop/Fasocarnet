import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { 
  Store, 
  Smartphone, 
  Check, 
  Save, 
  LogOut, 
  AlertTriangle, 
  PackagePlus, 
  Trash2, 
  Tag, 
  User, 
  KeyRound, 
  Crown,
  Sparkles,
  Key,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Copy,
  ArrowLeft,
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
  ArrowRight
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';
import { hashPin } from '../../utils/crypto';
import { isHapticsEnabled, setHapticsEnabled, triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { productsService } from '../../db/services/productsService';
import { subscriptionService, SUBSCRIPTION_PLANS, SubscriptionPlan, getPaymentChannels } from '../../db/services/subscriptionService';
import { syncService } from '../../db/services/syncService';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type SettingsTab = 'shop' | 'catalog' | 'subscription' | 'payments';

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
  const { shopProfile, updateShopProfile, logout } = useAppStore();

  const [activeSubTab, setActiveSubTabState] = useState<SettingsTab>(getInitialSettingsTab);

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
  const [debtAlarmEnabled, setDebtAlarmEnabled] = useState(shopProfile?.debtAlarmEnabled !== false);
  const [debtAlarmDay, setDebtAlarmDay] = useState(shopProfile?.debtAlarmDay ?? 1);
  const [pin, setNewPin] = useState(shopProfile?.pinCode || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductMinAlert, setNewProductMinAlert] = useState('5');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'low_stock'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Modal de Réapprovisionnement Rapide
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState('10');
  const [isRestocking, setIsRestocking] = useState(false);

  // Gestion de l'Abonnement & Licence
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseFeedback, setLicenseFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);

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
  }, []);

  const loadProducts = async () => {
    const list = await productsService.getAll();
    setProducts(list);
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
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
    const text = encodeURIComponent(`Bonjour support FasoCarnet, je suis le responsable de « ${shopName} ». J'ai besoin d'une assistance.`);
    window.open(`https://wa.me/22665616134?text=${text}`, '_blank');
  };

  const subInfo = subscriptionService.getSubscriptionInfo(shopProfile);
  const isPremium = subscriptionService.isPremiumActive(shopProfile);

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopProfile || !licenseInput.trim()) return;

    setIsActivatingLicense(true);
    setLicenseFeedback(null);
    try {
      const res = await subscriptionService.activateLicenseKey(shopProfile.id, licenseInput.trim());
      setLicenseFeedback(res);
      if (res.success && res.shop) {
        updateShopProfile(res.shop);
        setLicenseInput('');
      }
    } catch (err: any) {
      setLicenseFeedback({ success: false, message: err.message || "Erreur lors de l'activation." });
    } finally {
      setIsActivatingLicense(false);
    }
  };

  const handleOpenWhatsAppRenewal = (plan: SubscriptionPlan) => {
    const url = subscriptionService.getWhatsAppPaymentConfirmationUrl(plan, shopProfile?.name, shopProfile?.phone);
    window.open(url, '_blank');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newProductPrice) || 0;
    if (!newProductName.trim() || price <= 0) {
      alert("Veuillez renseigner le nom de l'article et un prix supérieur à 0.");
      return;
    }

    const stockQty = newProductStock.trim() !== '' ? Math.max(0, parseInt(newProductStock, 10) || 0) : undefined;
    const minAlert = newProductMinAlert.trim() !== '' ? Math.max(0, parseInt(newProductMinAlert, 10) || 0) : 5;

    setIsAddingProduct(true);
    try {
      await productsService.create(
        newProductName.trim(), 
        price, 
        newProductBarcode.trim() || undefined,
        undefined,
        stockQty,
        minAlert
      );
      setNewProductName('');
      setNewProductPrice('');
      setNewProductBarcode('');
      setNewProductStock('');
      setNewProductMinAlert('5');
      await loadProducts();
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
    setIsRestocking(true);
    try {
      await productsService.addStock(restockProduct.id, qty);
      setRestockProduct(null);
      setRestockQtyInput('10');
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("Erreur lors du réapprovisionnement.");
    } finally {
      setIsRestocking(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Supprimer cet article du catalogue ?")) {
      await productsService.delete(id);
      await loadProducts();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPin = pin.trim().length === 4
      ? hashPin(pin.trim())
      : (pin.trim() === '' && shopProfile?.pinCode ? shopProfile.pinCode : undefined);

    await updateShopProfile({
      name: name.trim() || 'Ma Boutique',
      description: description.trim() || undefined,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim() || undefined,
      phone: phone.trim(),
      orangeMoneyNumber: omNumber.trim() || undefined,
      moovMoneyNumber: moovNumber.trim() || undefined,
      waveNumber: waveNumber.trim() || undefined,
      ifu: ifu.trim() || undefined,
      rccm: rccm.trim() || undefined,
      logo: logo || undefined,
      debtAlarmEnabled: debtAlarmEnabled,
      debtAlarmDay: debtAlarmDay,
      pinCode: updatedPin
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    { id: 'shop', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
    { 
      id: 'catalog', 
      label: 'Articles', 
      icon: <Tag className="w-4 h-4" />, 
      badge: lowStockCount > 0 ? `${lowStockCount}⚠️` : (products.length > 0 ? products.length : undefined),
      badgeColor: lowStockCount > 0 ? 'bg-amber-500' : 'bg-emerald-600'
    },
    { 
      id: 'subscription', 
      label: 'Licence', 
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      badge: subInfo.isExpired ? '!' : (subInfo.daysRemaining <= 5 ? `${subInfo.daysRemaining}j` : undefined),
      badgeColor: subInfo.isExpired ? 'bg-red-500' : 'bg-amber-500'
    },
    { id: 'payments', label: 'Paiements', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-md mx-auto p-3.5 sm:p-4 space-y-3 pb-28">
      {/* En-tête titre */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-emerald-900">
          <Store className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base sm:text-lg font-extrabold">Paramètres</h2>
        </div>
        {savedSuccess && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1 animate-in fade-in">
            <Check className="w-3 h-3" />
            <span>Enregistré !</span>
          </span>
        )}
      </div>

      {/* SÉLECTEUR DE RUBRIQUES (4 TABS MODERNES) */}
      <div className="grid grid-cols-4 gap-1 bg-gray-200/80 p-1 rounded-xl">
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center space-y-0.5 transition-all ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className={`absolute -top-1.5 -right-2.5 text-[8px] font-black text-white px-1 py-0.2 rounded-full leading-tight ${tab.badgeColor || 'bg-emerald-500'}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* RUBRIQUE 1 : BOUTIQUE (Identité, Sécurité, Sauvegarde)   */}
      {/* ======================================================== */}
      {activeSubTab === 'shop' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Identité du Commerce */}
          <form onSubmit={handleSaveProfile} className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-extrabold text-xs tracking-tight">Identité du Commerce</h3>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                Nom de la Boutique *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: Boutique La Grâce"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                Slogan / Activité du Commerce (Reçus)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: Impression sur tous les supports, Prêt-à-porter..."
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                Nom du Gérant / Responsable
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: M. Moussa Ouédraogo"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                WhatsApp du Propriétaire (Point du soir)
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-emerald-50/40 border border-emerald-200/80 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: 70 12 34 56"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                Téléphone de la Caisse *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: 70 00 00 00"
              />
            </div>

            {/* Mentions Légales pour Reçus : IFU & RCCM */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                  N° IFU
                </label>
                <input
                  type="text"
                  value={ifu}
                  onChange={(e) => setIfu(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: 00012345A"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                  N° RCCM
                </label>
                <input
                  type="text"
                  value={rccm}
                  onChange={(e) => setRccm(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: BF-OUA-2024"
                />
              </div>
            </div>

            {/* Logo de l'entreprise */}
            <div className="pt-1 border-t border-slate-100">
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                Logo de l'Entreprise (Reçus & Tickets)
              </label>
              {logo ? (
                <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">Logo configuré</p>
                    <p className="text-[9px] text-slate-500">Apparaît sur les tickets & reçus</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogo(null)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer le logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 p-2.5 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl cursor-pointer text-xs font-bold text-emerald-700 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
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

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 active:scale-98 transition-all text-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les Coordonnées</span>
            </button>
          </form>

          {/* Configuration Alarme / Rappel Dettes */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <BellRing className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-tight text-slate-900">Alarme & Relance des Dettes</h3>
                <p className="text-[10px] text-slate-500">Rappel sonore hebdomadaire des clients à relancer</p>
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
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {debtAlarmEnabled && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 text-[11px]">Jour du rappel :</span>
                <select
                  value={debtAlarmDay}
                  onChange={async (e) => {
                    const day = parseInt(e.target.value, 10);
                    setDebtAlarmDay(day);
                    await updateShopProfile({ debtAlarmDay: day });
                  }}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={1}>Chaque Lundi (Recommandé)</option>
                  <option value={2}>Chaque Mardi</option>
                  <option value={3}>Chaque Mercredi</option>
                  <option value={4}>Chaque Jeudi</option>
                  <option value={5}>Chaque Vendredi</option>
                  <option value={6}>Chaque Samedi</option>
                  <option value={0}>Chaque Dimanche</option>
                </select>
              </div>
            )}
          </div>

          {/* Code PIN de Verrouillage */}
          <form onSubmit={handleSaveProfile} className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-extrabold text-xs tracking-tight">Verrouillage par Code PIN</h3>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-600 tracking-wider mb-0.5">
                Code PIN à 4 chiffres (optionnel)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-center tracking-widest text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="• • • •"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Mettre à jour le Code PIN</span>
            </button>
          </form>

          {/* Sons de Caisse, Annonce Vocale & Vibreur Tactile */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-tight">Sons & Retours Sensoriels</h3>
                <p className="text-[10px] text-slate-500">Sons de caisse, voix et vibration tactile</p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Option 1 : Vibreur Tactile (Haptique) */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    hapticsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hapticsEnabled ? <Vibrate className="w-3 h-3" /> : <VibrateOff className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block">Vibreur Clavier & Caisse</span>
                    <span className="text-[9px] text-slate-500">Vibration à chaque touche</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => triggerHaptic(45)}
                    className="text-[9px] font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 px-1.5 py-0.5 rounded-md border border-emerald-300/60 transition-all active:scale-95"
                  >
                    Tester
                  </button>
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

              {/* Option 2 : Carillon de Caisse */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    soundEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block">Carillon de Caisse ("Ting-Ting !")</span>
                    <span className="text-[9px] text-slate-500">Son à chaque encaissement</span>
                  </div>
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

              {/* Option 3 : Annonce Vocale */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    voiceEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <Mic className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block">Annonce Vocale du Montant</span>
                    <span className="text-[9px] text-slate-500">Ex: "Vente de 5 000 francs"</span>
                  </div>
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
            </div>
          </div>

          {/* Sauvegarde & Restauration de Secours */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <FileJson className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-tight">Sauvegarde & Restauration de Secours</h3>
                <p className="text-[10px] text-slate-500">Exportez ou importez vos données en fichier JSON</p>
              </div>
            </div>

            {backupFeedback && (
              <div className={`p-2 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 ${
                backupFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {backupFeedback.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                <span>{backupFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportBackup}
                className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{isExporting ? 'Export...' : 'Exporter (.json)'}</span>
              </button>

              <button
                type="button"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-slate-700 shrink-0" />
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

          {/* Assistance & Support Client WhatsApp */}
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 p-3.5 sm:p-4 rounded-xl text-white shadow-xs space-y-2">
            <div className="flex items-center space-x-2 border-b border-emerald-600/60 pb-1.5">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs">Besoin d'aide ou d'une licence ?</h3>
                <p className="text-[10px] text-emerald-100">Assistance officielle FasoCarnet sur WhatsApp</p>
              </div>
            </div>

            <p className="text-[10px] text-emerald-50 leading-relaxed">
              Une question, un problème technique ou besoin d'activer une nouvelle licence ? Notre équipe vous répond immédiatement.
            </p>

            <button
              type="button"
              onClick={handleContactSupport}
              className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-900 font-black rounded-xl text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Contacter le Support WhatsApp</span>
            </button>
          </div>

          {/* Déconnexion */}
          <div className="bg-red-50/70 p-3.5 sm:p-4 rounded-xl border border-red-200/70 shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-red-900 border-b border-red-200/60 pb-1.5">
              <div className="w-6 h-6 rounded-lg bg-red-100/80 border border-red-300/60 flex items-center justify-center text-red-600 shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-extrabold text-xs tracking-tight">Session du Commerce</h3>
            </div>
            <p className="text-[10px] text-red-700/90 font-medium leading-relaxed">
              Fermez la session pour changer de compte sur cet appareil.
            </p>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se Déconnecter de l'Espace</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 2 : CATALOGUE D'ARTICLES & GESTION DE STOCK     */}
      {/* ======================================================== */}
      {activeSubTab === 'catalog' && (
        !isPremium ? (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-emerald-500/30 shadow-xl text-center relative overflow-hidden">
              {/* Subtle decoration */}
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-lg mb-3 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Crown className="w-7 h-7 text-amber-400" />
                </div>
              </div>

              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Fonctionnalité FasoCarnet Pro</span>
              </span>

              <h2 className="text-lg font-black font-display text-white mb-1.5">
                Catalogue d'Articles & Stock
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto mb-4">
                Enregistrez vos articles avec leurs prix fixes, suivez vos stocks et scannez les codes-barres.
              </p>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-left space-y-2 border border-white/10 mb-4">
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-[11px]">Enregistrement illimité d'articles & prix fixes</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-[11px]">Scanner de codes-barres par caméra</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-[11px]">Suivi des stocks et alertes de réapprovisionnement</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">✓</div>
                  <span className="font-semibold text-[11px]">Vente rapide en 1 clic depuis la caisse</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('subscription')}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
              >
                <span>Activer FasoCarnet Pro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
              <p className="text-[11px] text-slate-600 font-medium">
                💡 <strong className="font-bold text-slate-800">Caisse gratuite :</strong> La saisie des ventes en Caisse, les tickets et le carnet de dettes restent 100% utilisables.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* CARTE BILAN RAPIDE */}
            <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white p-4 rounded-2xl shadow-md border border-emerald-700/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block font-display">
                    Catalogue Produits
                  </span>
                  <h3 className="text-base font-black text-white font-display">
                    {products.length} article{products.length > 1 ? 's' : ''} enregistré{products.length > 1 ? 's' : ''}
                  </h3>
                </div>
              </div>

            <div className="text-right">
              {lowStockCount > 0 ? (
                <div className="bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 rounded-xl text-[10px] font-black text-amber-300 animate-pulse flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lowStockCount} à réappro.</span>
                </div>
              ) : (
                <div className="bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-xl text-[10px] font-bold text-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stock OK</span>
                </div>
              )}
            </div>
          </div>

          {/* FORMULAIRE DE CRÉATION D'ARTICLE ÉPURÉ */}
          <form onSubmit={handleAddProduct} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <PackagePlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs text-slate-900 font-display">Ajouter un Nouvel Article</h3>
                <p className="text-[10px] text-slate-500 font-medium">Saisie rapide du nom, prix de vente et stock</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Champ 1 : Nom de l'article */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                  Nom du produit <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bic Cristal Bleu, Sac de riz 25kg, Savon BF..."
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Champ 2 & 3 : Prix & Code-Barres */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-display">
                    Prix de vente <span className="text-emerald-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
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
                      className="px-2.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs"
                      title="Scanner avec la caméra"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Champ 4 & 5 : Gestion de Stock & Alerte */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block font-display">
                  Gestion du Stock & Alertes
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-1">
                      Stock initial en boutique
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Illimité si vide"
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none placeholder:text-slate-400 placeholder:text-[10px] shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-1">
                      Alerte stock faible (seuil)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="5 par défaut"
                      value={newProductMinAlert}
                      onChange={(e) => setNewProductMinAlert(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none placeholder:text-slate-400 placeholder:text-[10px] shadow-2xs"
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

          {/* RECHERCHE ET LISTE DES ARTICLES */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-900 font-display">
                Articles en Boutique ({products.length})
              </h4>
            </div>

            {/* Barre de Recherche Rapide */}
            {products.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code-barres..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Filtres de liste (Tous / Stock Critique) */}
            {products.length > 0 && (
              <div className="flex items-center space-x-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setCatalogFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer font-display ${
                    catalogFilter === 'all'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tous ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('low_stock')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer font-display ${
                    catalogFilter === 'low_stock'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Stock critique ({lowStockCount})</span>
                </button>
              </div>
            )}

            {/* Cartes des articles */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
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
                  'Aucun article enregistré. Utilisez le formulaire ci-dessus pour ajouter votre premier produit.'
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pt-1">
                {filteredProducts.map((prod) => {
                  const hasStock = prod.stockQuantity !== undefined;
                  const isOutOfStock = hasStock && prod.stockQuantity! <= 0;
                  const isLowStock = hasStock && !isOutOfStock && prod.stockQuantity! <= (prod.minStockAlert ?? 5);

                  return (
                    <div
                      key={prod.id}
                      className="p-3 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl shadow-2xs transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Avatar Produit Stylisé */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 font-display">
                          {prod.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-extrabold text-slate-900 text-xs truncate block">{prod.name}</span>
                            {prod.barcode && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-600 rounded font-mono text-[9px] font-semibold shrink-0">
                                <Barcode className="w-2.5 h-2.5 text-slate-400" />
                                <span>{prod.barcode}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-emerald-700 font-extrabold text-xs tracking-tight font-display">
                              {formatCurrency(prod.price)}
                            </span>

                            {/* Badge de Stock Soigné */}
                            {!hasStock && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                Stock illimité
                              </span>
                            )}
                            {isOutOfStock && (
                              <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                Rupture (0)
                              </span>
                            )}
                            {isLowStock && (
                              <span className="text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                Faible ({prod.stockQuantity})
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

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        {/* Bouton Réapprovisionner */}
                        <button
                          type="button"
                          onClick={() => {
                            setRestockProduct(prod);
                            setRestockQtyInput('10');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-xl border border-emerald-200/80 text-[11px] flex items-center space-x-1 active:scale-95 transition-all shadow-2xs font-display cursor-pointer"
                          title="Réapprovisionner le stock"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Stock</span>
                        </button>

                        {/* Bouton Supprimer */}
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
        )
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 3 : ABONNEMENT & LICENCE (2 000 FCFA / MOIS)    */}
      {/* ======================================================== */}
      {activeSubTab === 'subscription' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {selectedPlanForPayment ? (
            /* ================= PAGE DE PAIEMENT DE LICENCE ================= */
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
              {/* Bouton retour */}
              <button
                type="button"
                onClick={() => setSelectedPlanForPayment(null)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour aux Formules</span>
              </button>

              {/* Récapitulatif de la formule sélectionnée */}
              <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-xl shadow-md border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-amber-400">
                    <Crown className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Formule Sélectionnée</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-400/30">
                    {selectedPlanForPayment.durationMonths} Mois
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                  <span className="text-sm font-black text-white">{selectedPlanForPayment.name}</span>
                  <span className="text-lg font-black text-emerald-400">{formatCurrency(selectedPlanForPayment.price)}</span>
                </div>

                {selectedPlanForPayment.discountText && (
                  <p className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                    🎁 {selectedPlanForPayment.discountText}
                  </p>
                )}
              </div>

              {/* Numéros de Paiement Mobile Money Officiels */}
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2.5">
                <div className="border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-xs">Comptes de Paiement Mobile Money</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Effectuez le transfert de <strong>{formatCurrency(selectedPlanForPayment.price)}</strong> vers l'un des comptes ci-dessous :
                  </p>
                </div>

                <div className="space-y-2">
                  {getPaymentChannels().map((channel) => {
                    const isCopied = copiedNumber === channel.number;
                    return (
                      <div
                        key={channel.id}
                        className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:bg-slate-100/80 transition-all"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-slate-900">{channel.name}</span>
                            <span className="text-[9px] text-slate-500 font-medium">({channel.merchantName})</span>
                          </div>
                          <span className="font-mono text-xs font-black text-emerald-800 tracking-wider block">
                            {channel.number}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyNumber(channel.number)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all shadow-xs ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-slate-700 hover:text-emerald-800 border border-slate-200'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Bouton WhatsApp de confirmation */}
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppRenewal(selectedPlanForPayment)}
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black rounded-xl text-xs shadow-xs flex items-center justify-center space-x-1.5 active:scale-98 transition-all cursor-pointer mt-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Confirmer mon paiement sur WhatsApp</span>
                </button>
              </div>

              {/* Saisie de la Clé reçue */}
              <form onSubmit={handleActivateLicense} className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 border-b border-slate-100 pb-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-xs">Activer ma Clé de Licence</h3>
                </div>
                <p className="text-[10px] text-slate-500">
                  Collez ci-dessous le code de licence reçu sur WhatsApp pour débloquer immédiatement votre boutique.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ex: FASO-1M-XXXX"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-wider uppercase focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-400 focus:placeholder:opacity-0"
                  />
                  <button
                    type="submit"
                    disabled={isActivatingLicense || !licenseInput.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold rounded-lg text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer"
                  >
                    {isActivatingLicense ? 'Validation...' : 'Activer'}
                  </button>
                </div>

                {licenseFeedback && (
                  <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 ${
                    licenseFeedback.success 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {licenseFeedback.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    )}
                    <span>{licenseFeedback.message}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* ================= LISTE DES FORMULES D'ABONNEMENT ================= */
            <>
              {/* Carte Statut Actuel */}
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-3.5 sm:p-4 rounded-xl shadow-md border border-emerald-700/50 space-y-2.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-emerald-200 tracking-wider uppercase">
                      Statut de l'Abonnement
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    subInfo.status === 'active' 
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' 
                      : subInfo.status === 'trial'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                      : 'bg-red-500/30 text-red-300 border border-red-400/40'
                  }`}>
                    {subInfo.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-700/60">
                  <div>
                    <span className="text-[10px] text-emerald-300/80 block">Temps restant</span>
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {subInfo.daysRemaining} <span className="text-[11px] font-bold text-emerald-300">jours</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-300/80 block">Valable jusqu'au</span>
                    <span className="text-xs font-bold text-amber-300">
                      {subInfo.formattedExpiresAt}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/40 text-emerald-200 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Formule active : <strong>{subInfo.planName}</strong></span>
                </div>
              </div>

              {/* Grille des Formules d'Abonnement */}
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2.5">
                <div className="flex items-center space-x-2 text-emerald-800 border-b border-slate-100 pb-2">
                  <CreditCard className="w-4 h-4" />
                  <h3 className="font-extrabold text-xs">Choisir une Formule de Licence</h3>
                </div>
                
                <p className="text-[10px] text-slate-500">
                  Cliquez sur une formule pour accéder au paiement par <strong>Orange Money</strong>, <strong>Moov Money</strong> ou <strong>Wave</strong>.
                </p>

                <div className="space-y-2 pt-0.5">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanForPayment(plan)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        plan.popular
                          ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 text-xs">{plan.name}</span>
                          {plan.popular && (
                            <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                              Populaire
                            </span>
                          )}
                        </div>
                        {plan.discountText && (
                          <span className="text-[10px] font-semibold text-emerald-700 block">
                            {plan.discountText}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {formatCurrency(plan.price)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanForPayment(plan);
                          }}
                          className="mt-0.5 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Payer ➔</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activation directe par Clé de Licence */}
              <form onSubmit={handleActivateLicense} className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 border-b border-slate-100 pb-1.5">
                  <Key className="w-4 h-4" />
                  <h3 className="font-extrabold text-xs">Activer un Code de Licence</h3>
                </div>
                
                <p className="text-[10px] text-slate-500">
                  Vous avez déjà une clé de licence ? Entrez-la ci-dessous pour activer immédiatement.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ex: FASO-1M-XXXX"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-wider uppercase focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-400 focus:placeholder:opacity-0"
                  />
                  <button
                    type="submit"
                    disabled={isActivatingLicense || !licenseInput.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold rounded-lg text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer"
                  >
                    {isActivatingLicense ? 'Validation...' : 'Activer'}
                  </button>
                </div>

                {licenseFeedback && (
                  <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 ${
                    licenseFeedback.success 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {licenseFeedback.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    )}
                    <span>{licenseFeedback.message}</span>
                  </div>
                )}
              </form>

              {/* Note sur la Garantie Hors-Ligne */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-0.5">
                <span className="font-bold flex items-center space-x-1.5 text-xs">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Garantie 100% Hors-Ligne & Données Sécurisées</span>
                </span>
                <p className="text-[10px] text-emerald-800/80 leading-relaxed">
                  Toutes vos données restent stockées sur votre appareil et ne sont jamais supprimées. L'application continue de fonctionner même sans réseau.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 4 : PAIEMENTS MOBILE MONEY                      */}
      {/* ======================================================== */}
      {activeSubTab === 'payments' && (
        <form onSubmit={handleSaveProfile} className="space-y-3 animate-in fade-in duration-150">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-extrabold text-xs tracking-tight">Numéros de Réception Mobile Money</h3>
            </div>
            <p className="text-[10px] text-slate-500">
              Ces numéros seront automatiquement insérés dans vos reçus et vos relances WhatsApp de dettes.
            </p>

            <div>
              <label className="block text-[9px] font-bold text-[#ff6600] uppercase tracking-wider mb-0.5">
                Numéro Orange Money
              </label>
              <input
                type="tel"
                value={omNumber}
                onChange={(e) => setOmNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-orange-50/40 border border-orange-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#ff6600] outline-none transition-all placeholder:text-slate-400 focus:placeholder:opacity-0"
                placeholder="Ex: 70 XX XX XX"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#005baa] uppercase tracking-wider mb-0.5">
                Numéro Moov Money
              </label>
              <input
                type="tel"
                value={moovNumber}
                onChange={(e) => setMoovNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-blue-50/40 border border-blue-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#005baa] outline-none transition-all placeholder:text-slate-400 focus:placeholder:opacity-0"
                placeholder="Ex: 60 XX XX XX"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#1dc4fe] uppercase tracking-wider mb-0.5">
                Numéro Wave
              </label>
              <input
                type="tel"
                value={waveNumber}
                onChange={(e) => setWaveNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-sky-50/40 border border-sky-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#1dc4fe] outline-none transition-all placeholder:text-slate-400 focus:placeholder:opacity-0"
                placeholder="Ex: 70 XX XX XX"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 active:scale-98 transition-all text-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les Numéros</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal de Confirmation de Déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl p-4 text-center space-y-3 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900">Confirmer la Déconnexion</h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Vous allez fermer votre session. Vos données restent conservées sur cet appareil et vous pourrez vous reconnecter en 1 clic.
              </p>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-xs active:scale-98 flex items-center justify-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
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
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Quantité à ajouter au stock *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQtyInput}
                  onChange={(e) => setRestockQtyInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-emerald-500 rounded-xl text-sm font-black text-center text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none"
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
                    className={`py-1 rounded-lg text-xs font-bold border transition-all ${
                      restockQtyInput === String(qty)
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    +{qty}
                  </button>
                ))}
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="w-1/2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-xs active:scale-98 flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isRestocking ? 'Ajout...' : 'Confirmer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
