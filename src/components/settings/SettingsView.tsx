import React, { useState, useEffect } from 'react';
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
  Globe,
  Share2,
  Download
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';
import { isHapticsEnabled, setHapticsEnabled, triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { productsService } from '../../db/services/productsService';
import { subscriptionService, SUBSCRIPTION_PLANS, SubscriptionPlan, OFFICIAL_PAYMENT_CHANNELS } from '../../db/services/subscriptionService';
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
  const [ownerName, setOwnerName] = useState(shopProfile?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(shopProfile?.ownerPhone || '');
  const [phone, setPhone] = useState(shopProfile?.phone || '');
  const [omNumber, setOmNumber] = useState(shopProfile?.orangeMoneyNumber || '');
  const [moovNumber, setMoovNumber] = useState(shopProfile?.moovMoneyNumber || '');
  const [waveNumber, setWaveNumber] = useState(shopProfile?.waveNumber || '');
  const [pin, setNewPin] = useState(shopProfile?.pinCode || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Gestion du Catalogue d'Articles
  const [products, setProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

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

  const subInfo = subscriptionService.getSubscriptionInfo(shopProfile);

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

    setIsAddingProduct(true);
    try {
      await productsService.create(newProductName.trim(), price);
      setNewProductName('');
      setNewProductPrice('');
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de l'article.");
    } finally {
      setIsAddingProduct(false);
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
    await updateShopProfile({
      name: name.trim() || 'Ma Boutique',
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim() || undefined,
      phone: phone.trim(),
      orangeMoneyNumber: omNumber.trim() || undefined,
      moovMoneyNumber: moovNumber.trim() || undefined,
      waveNumber: waveNumber.trim() || undefined,
      pinCode: pin.trim().length === 4 ? pin.trim() : undefined
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    { id: 'shop', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
    { id: 'catalog', label: 'Articles', icon: <Tag className="w-4 h-4" />, badge: products.length },
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
          <form onSubmit={handleSaveProfile} className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900 border-b border-slate-100 pb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm tracking-tight">Identité du Commerce</h3>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-700 tracking-wider mb-1">
                Nom de la Boutique / Commerce *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: Boutique La Grâce"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Nom du Responsable / Gérant
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  placeholder="Ex: M. Moussa Ouédraogo"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Numéro WhatsApp du Patron / Propriétaire
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-4 py-3 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: 70 12 34 56 (Pour recevoir le point du soir)"
              />
              <span className="text-[10px] text-emerald-700 font-semibold mt-1.5 block">
                Le gérant pourra envoyer le bilan du jour directement sur ce numéro en 1 clic.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Téléphone de la Caisse / Boutique *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: 70 00 00 00"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Coordonnées</span>
            </button>
          </form>

          {/* Code PIN de Verrouillage */}
          <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3.5">
            <div className="flex items-center space-x-2.5 text-emerald-900 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm tracking-tight">Verrouillage par Code PIN</h3>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Code PIN à 4 chiffres (Laisser vide pour désactiver)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-extrabold text-center tracking-widest text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                placeholder="• • • •"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Mettre à jour le Code PIN</span>
            </button>
          </form>

          {/* Sons de Caisse, Annonce Vocale & Vibreur Tactile */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-emerald-900 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight">Sons & Retours Sensoriels</h3>
                <p className="text-[11px] text-slate-500 font-medium">Confirmation sonore, vocale et vibration tactile de saisie</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1 : Vibreur Tactile (Haptique) */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    hapticsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {hapticsEnabled ? <Vibrate className="w-3.5 h-3.5" /> : <VibrateOff className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Vibreur Tactile Clavier & Caisse</span>
                    <span className="text-[10px] text-slate-500">Vibration à chaque touche tapée et action de calcul</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => triggerHaptic(45)}
                    className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 px-2 py-1 rounded-lg border border-emerald-300/60 transition-all active:scale-95"
                    title="Tester la vibration"
                  >
                    Tester
                  </button>
                  <button
                    type="button"
                    onClick={toggleHaptics}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      hapticsEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4.5 h-4.5 rounded-full shadow-md" />
                  </button>
                </div>
              </div>

              {/* Option 2 : Carillon de Caisse */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    soundEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Carillon de Caisse ("Ting-Ting !")</span>
                    <span className="text-[10px] text-slate-500">Joue un son valorisant à chaque vente encaissée</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    soundEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4.5 h-4.5 rounded-full shadow-md" />
                </button>
              </div>

              {/* Option 3 : Annonce Vocale */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    voiceEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Annonce Vocale du Montant</span>
                    <span className="text-[10px] text-slate-500">Ex: "Vente de 5 000 francs enregistrée"</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    voiceEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4.5 h-4.5 rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>

          {/* Application Mobile & Site Vitrine */}
          <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800/60 shadow-md space-y-3.5">
            <div className="flex items-center space-x-2.5 text-emerald-300 border-b border-emerald-800/80 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-900/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-white">Application Mobile & Site Web</h3>
                <p className="text-[11px] text-emerald-300/80 font-medium">Partagez l'APK Android ou le site aux collègues commerçants</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([
                    'FasoCarnet APK Mobile Application - Edition Android Professionnelle\nVersion: 1.2.0\nhttps://fasocarnet.com'
                  ], { type: 'application/vnd.android.package-archive' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'FasoCarnet-v1.2.0-Android.apk';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger APK</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  "Découvrez FasoCarnet, l'application mobile de caisse et de gestion des dettes pour commerçants au Burkina Faso ! Téléchargez l'APK gratuit ici : https://fasocarnet.com"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all border border-emerald-700/40 active:scale-95 shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partager WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Déconnexion */}
          <div className="bg-red-50/70 p-6 rounded-3xl border border-red-200/70 shadow-sm space-y-3">
            <div className="flex items-center space-x-2.5 text-red-900 border-b border-red-200/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-red-100/80 border border-red-300/60 flex items-center justify-center text-red-600 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm tracking-tight">Session du Commerce</h3>
            </div>
            <p className="text-xs text-red-700/90 font-medium leading-relaxed">
              Fermez la session pour revenir à la page d'accueil ou changer de commerce sur cet appareil.
            </p>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-red-600/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Se Déconnecter de l'Espace</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RUBRIQUE 2 : CATALOGUE D'ARTICLES FAVORIS                */}
      {/* ======================================================== */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5 text-emerald-900">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm tracking-tight">Mes Articles Fréquents</h3>
              </div>
              <span className="text-xs bg-emerald-100/80 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                {products.length} enregistré(s)
              </span>
            </div>

            {/* Formulaire d'ajout rapide */}
            <form onSubmit={handleAddProduct} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Ajouter un produit au catalogue</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nom de l'article (ex: Sac de riz 25kg)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                />
                <input
                  type="number"
                  placeholder="Prix en FCFA (ex: 18500)"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isAddingProduct}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <PackagePlus className="w-4 h-4" />
                <span>{isAddingProduct ? 'Ajout en cours...' : '+ Ajouter au Catalogue'}</span>
              </button>
            </form>

            {/* Liste des articles */}
            {products.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                Aucun article enregistré. Ajoutez vos premiers produits ci-dessus.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto divide-y divide-slate-100 pt-1">
                {products.map((prod) => (
                  <div key={prod.id} className="pt-2.5 pb-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">{prod.name}</span>
                      <span className="text-emerald-700 font-black tracking-tight">{formatCurrency(prod.price)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Supprimer"
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

      {/* ======================================================== */}
      {/* RUBRIQUE 3 : ABONNEMENT & LICENCE (2 000 FCFA / MOIS)    */}
      {/* ======================================================== */}
      {activeSubTab === 'subscription' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {selectedPlanForPayment ? (
            /* ================= PAGE DE PAIEMENT DE LICENCE ================= */
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
              {/* Bouton retour */}
              <button
                type="button"
                onClick={() => setSelectedPlanForPayment(null)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour aux Formules</span>
              </button>

              {/* Récapitulatif de la formule sélectionnée */}
              <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <Crown className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Formule Sélectionnée</span>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    {selectedPlanForPayment.durationMonths} Mois
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                  <span className="text-lg font-black text-white">{selectedPlanForPayment.name}</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(selectedPlanForPayment.price)}</span>
                </div>

                {selectedPlanForPayment.discountText && (
                  <p className="text-xs text-amber-300 font-semibold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    🎁 {selectedPlanForPayment.discountText}
                  </p>
                )}
              </div>

              {/* Numéros de Paiement Mobile Money Officiels */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
                <div className="border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-sm">Comptes de Paiement Mobile Money</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Effectuez le transfert de <strong>{formatCurrency(selectedPlanForPayment.price)}</strong> vers l'un des comptes ci-dessous :
                  </p>
                </div>

                <div className="space-y-2.5">
                  {OFFICIAL_PAYMENT_CHANNELS.map((channel) => {
                    const isCopied = copiedNumber === channel.number;
                    return (
                      <div
                        key={channel.id}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between hover:bg-gray-100/80 transition-all"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-gray-900">{channel.name}</span>
                            <span className="text-[10px] text-gray-500 font-medium">({channel.merchantName})</span>
                          </div>
                          <span className="font-mono text-sm font-black text-emerald-800 tracking-wider block">
                            {channel.number}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyNumber(channel.number)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-gray-700 hover:text-emerald-800 border border-gray-200'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
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
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black rounded-2xl text-xs shadow-md shadow-[#25D366]/20 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer mt-3"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Confirmer mon paiement sur WhatsApp</span>
                </button>
              </div>

              {/* Saisie de la Clé reçue */}
              <form onSubmit={handleActivateLicense} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 border-b border-gray-100 pb-2">
                  <Key className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm">Activer ma Clé de Licence</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Collez ci-dessous le code de licence reçu sur WhatsApp pour débloquer immédiatement votre boutique.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ex: FASO-1M-XXXX"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isActivatingLicense || !licenseInput.trim()}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold rounded-xl text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    {isActivatingLicense ? 'Validation...' : 'Activer'}
                  </button>
                </div>

                {licenseFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                    licenseFeedback.success 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {licenseFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
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
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-5 rounded-3xl shadow-xl border border-emerald-700/50 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-28 h-28 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-emerald-200 tracking-wider uppercase">
                      Statut de l'Abonnement
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    subInfo.status === 'active' 
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' 
                      : subInfo.status === 'trial'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                      : 'bg-red-500/30 text-red-300 border border-red-400/40'
                  }`}>
                    {subInfo.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-emerald-700/60">
                  <div>
                    <span className="text-[11px] text-emerald-300/80 block">Temps restant</span>
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {subInfo.daysRemaining} <span className="text-xs font-bold text-emerald-300">jours</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-300/80 block">Valable jusqu'au</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-300">
                      {subInfo.formattedExpiresAt}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/40 text-emerald-200 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Formule active : <strong>{subInfo.planName}</strong></span>
                </div>
              </div>

              {/* Grille des Formules d'Abonnement */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
                <div className="flex items-center space-x-2 text-emerald-800 border-b border-gray-100 pb-2.5">
                  <CreditCard className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Choisir une Formule de Licence</h3>
                </div>
                
                <p className="text-xs text-gray-500">
                  Cliquez sur une formule pour accéder à la page de paiement par <strong>Orange Money</strong>, <strong>Moov Money</strong> ou <strong>Wave</strong>.
                </p>

                <div className="space-y-2.5 pt-1">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanForPayment(plan)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        plan.popular
                          ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 text-sm">{plan.name}</span>
                          {plan.popular && (
                            <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              Populaire
                            </span>
                          )}
                        </div>
                        {plan.discountText && (
                          <span className="text-[11px] font-semibold text-emerald-700 block">
                            {plan.discountText}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-gray-900 block">
                          {formatCurrency(plan.price)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanForPayment(plan);
                          }}
                          className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Payer ➔</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activation directe par Clé de Licence */}
              <form onSubmit={handleActivateLicense} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 border-b border-gray-100 pb-2.5">
                  <Key className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Activer un Code de Licence</h3>
                </div>
                
                <p className="text-xs text-gray-500">
                  Vous avez déjà une clé de licence ? Entrez-la ci-dessous pour activer immédiatement.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ex: FASO-1M-XXXX"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isActivatingLicense || !licenseInput.trim()}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold rounded-xl text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    {isActivatingLicense ? 'Validation...' : 'Activer'}
                  </button>
                </div>

                {licenseFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                    licenseFeedback.success 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {licenseFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{licenseFeedback.message}</span>
                  </div>
                )}
              </form>

              {/* Note sur la Garantie Hors-Ligne */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <span className="font-bold flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Garantie 100% Hors-Ligne & Données Sécurisées</span>
                </span>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  Toutes vos données (ventes, articles, clients et dettes) restent stockées sur votre appareil et ne sont jamais supprimées. L'application continue de fonctionner même en cas de coupure de réseau.
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
        <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-emerald-800 border-b border-gray-100 pb-3">
              <Smartphone className="w-5 h-5" />
              <h3 className="font-bold text-sm">Numéros de Réception Mobile Money</h3>
            </div>
            <p className="text-xs text-gray-500">
              Ces numéros seront automatiquement insérés dans vos reçus et vos relances WhatsApp de dettes.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#ff6600] uppercase mb-1">
                Numéro Orange Money
              </label>
              <input
                type="tel"
                value={omNumber}
                onChange={(e) => setOmNumber(e.target.value)}
                className="w-full p-3 bg-orange-50/50 border border-orange-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#ff6600] outline-none"
                placeholder="Ex: 70 XX XX XX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#005baa] uppercase mb-1">
                Numéro Moov Money
              </label>
              <input
                type="tel"
                value={moovNumber}
                onChange={(e) => setMoovNumber(e.target.value)}
                className="w-full p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#005baa] outline-none"
                placeholder="Ex: 60 XX XX XX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1dc4fe] uppercase mb-1">
                Numéro Wave
              </label>
              <input
                type="tel"
                value={waveNumber}
                onChange={(e) => setWaveNumber(e.target.value)}
                className="w-full p-3 bg-sky-50/50 border border-sky-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#1dc4fe] outline-none"
                placeholder="Ex: 70 XX XX XX"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Numéros</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal de Confirmation de Déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">Confirmer la Déconnexion</h3>
              <p className="text-xs text-gray-500 mt-1">
                Vous allez fermer votre session. Vos données restent conservées sur cet appareil et vous pourrez vous reconnecter en 1 clic.
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs shadow-md active:scale-98 flex items-center justify-center space-x-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
