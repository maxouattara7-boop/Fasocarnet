import React, { useState, useEffect } from 'react';
import {
  Store, Crown, Key, Lock, LogOut, Search, Plus, Copy, Check, Trash2,
  MessageCircle, ArrowLeft, Sparkles, Eye, EyeOff, RefreshCw,
  BarChart3, Smartphone, Download, Users,
  MapPin, Send, CheckCircle2, Megaphone, Wallet, Database,
  X, ChevronRight, Calendar, Phone, User, Building, FileText, Clock
} from 'lucide-react';
import { adminService, AdminStats, ShopAdminDetails } from '../../db/services/adminService';
import { syncService } from '../../db/services/syncService';
import { LicenseKey, ExtendedAdminAnalytics, AdminBroadcastMessage } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AdminViewProps {
  onClose: () => void;
}

type AdminTab = 'shops' | 'analytics' | 'licenses' | 'broadcast' | 'whatsapp' | 'security';

const getInitialAdminTab = (): AdminTab => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fasocarnet_admin_tab');
    if (saved === 'shops' || saved === 'analytics' || saved === 'licenses' || saved === 'broadcast' || saved === 'whatsapp' || saved === 'security') {
      return saved as AdminTab;
    }
  }
  return 'shops';
};

export const AdminView: React.FC<AdminViewProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialAdminTab);

  const setActiveTab = (tab: AdminTab) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_tab', tab);
    }
    setActiveTabState(tab);
  };

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<ExtendedAdminAnalytics | null>(null);
  const [shops, setShops] = useState<ShopAdminDetails[]>([]);
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [broadcast, setBroadcast] = useState<AdminBroadcastMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'expired'>('all');
  const [selectedShop, setSelectedShop] = useState<ShopAdminDetails | null>(null);
  const [shopActionFeedback, setShopActionFeedback] = useState<string>('');

  const [genPlan, setGenPlan] = useState<'monthly' | 'semi-annual' | 'annual'>('monthly');
  const [genCount, setGenCount] = useState<number>(1);
  const [genNotes, setGenNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'promo'>('info');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Deposit Numbers (Orange, Moov, Wave)
  const [depositOrange, setDepositOrange] = useState('72990310');
  const [depositMoov, setDepositMoov] = useState('03901590');
  const [depositWave, setDepositWave] = useState('72990310');
  const [depositMerchant, setDepositMerchant] = useState('Maxime OUATTARA');
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');

  const handleExportAllShopsJson = () => {
    const allData = syncService.getCloudDatabase();
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasocarnet_base_complete_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Listes de Relance & Diffusion Groupée WhatsApp
  const [trialRelanceMessage, setTrialRelanceMessage] = useState(
    "Bonjour cher commerçant,\nVotre période d'essai gratuite sur l'application FasoCarnet arrive à terme.\nPour continuer à gérer votre caisse, imprimer vos reçus et sécuriser vos ventes en toute sérénité, activez votre abonnement :\n- 1 Mois : 2 000 FCFA\n- 6 Mois : 10 000 FCFA\n- 1 An : 20 000 FCFA\nPaiement Mobile Money (Orange Money / Moov / Wave) au 72990310.\nL'équipe FasoCarnet reste à votre service !"
  );
  const [paidRelanceMessage, setPaidRelanceMessage] = useState(
    "Bonjour cher abonné FasoCarnet,\nMerci pour votre confiance et votre fidélité !\nUne question, un besoin d'assistance ou une suggestion pour améliorer votre commerce ? Toute notre équipe reste à votre écoute au 72990310.\nBonnes ventes avec FasoCarnet !"
  );
  const [relanceFeedback, setRelanceFeedback] = useState('');

  // Groupes de boutiques pour diffusion groupée
  const trialShops = shops.filter(s => s.statusType === 'trial' || s.statusType === 'expired' || s.daysRemaining <= 0);
  const paidShops = shops.filter(s => s.statusType === 'active' && s.daysRemaining > 0);

  const getShopPhones = (shopList: ShopAdminDetails[]) => {
    const phones: string[] = [];
    shopList.forEach(s => {
      const cleanMain = s.phone.replace(/\D/g, '');
      if (cleanMain) {
        phones.push(cleanMain.startsWith('226') ? `+${cleanMain}` : `+226${cleanMain}`);
      }
      if (s.ownerPhone) {
        const cleanOwner = s.ownerPhone.replace(/\D/g, '');
        if (cleanOwner) {
          phones.push(cleanOwner.startsWith('226') ? `+${cleanOwner}` : `+226${cleanOwner}`);
        }
      }
    });
    return Array.from(new Set(phones));
  };

  const handleCopyGroupPhones = (groupName: string, shopList: ShopAdminDetails[]) => {
    const phones = getShopPhones(shopList);
    if (phones.length === 0) {
      setRelanceFeedback(`Aucun numéro trouvé pour la liste "${groupName}".`);
      setTimeout(() => setRelanceFeedback(''), 3000);
      return;
    }
    navigator.clipboard.writeText(phones.join(', '));
    setRelanceFeedback(`${phones.length} numéro(s) de la liste "${groupName}" copiés !`);
    setTimeout(() => setRelanceFeedback(''), 3000);
  };

  const handleCopyGroupMessage = (message: string, groupName: string) => {
    navigator.clipboard.writeText(message);
    setRelanceFeedback(`Message pour la liste "${groupName}" copié !`);
    setTimeout(() => setRelanceFeedback(''), 3000);
  };

  const handleExportGroupVCard = (groupName: string, shopList: ShopAdminDetails[]) => {
    if (shopList.length === 0) {
      setRelanceFeedback(`Aucun contact dans la liste "${groupName}".`);
      setTimeout(() => setRelanceFeedback(''), 3000);
      return;
    }
    const vcf = adminService.generateVCard(shopList);
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fasocarnet_contacts_${groupName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setRelanceFeedback(`Fichier Contacts VCF (${groupName}) téléchargé !`);
    setTimeout(() => setRelanceFeedback(''), 3000);
  };

  const handleOpenWhatsAppGroup = (message: string, groupName: string) => {
    navigator.clipboard.writeText(message);
    setRelanceFeedback(`Message pour "${groupName}" copié ! Ouverture de WhatsApp...`);
    setTimeout(() => setRelanceFeedback(''), 3000);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [s, an, sh, l, bc, dep] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getExtendedAnalytics(),
        adminService.getAllShopsWithDetails(),
        adminService.getAllLicenses(),
        adminService.getBroadcastMessage(),
        adminService.getDepositNumbers()
      ]);
      setStats(s);
      setAnalytics(an);
      setShops(sh);
      setLicenses(l);
      setBroadcast(bc);
      if (bc) {
        setBroadcastTitle(bc.title);
        setBroadcastMessage(bc.message);
        setBroadcastType(bc.type === 'promo' ? 'promo' : 'info');
      }
      if (dep) {
        setDepositOrange(dep.orangeMoney || '');
        setDepositMoov(dep.moovMoney || '');
        setDepositWave(dep.wave || '');
        setDepositMerchant(dep.merchantName || '');
      }
      // Mettre à jour selectedShop si modal ouverte
      if (selectedShop) {
        const updatedSelected = sh.find(item => item.id === selectedShop.id);
        if (updatedSelected) setSelectedShop(updatedSelected);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveDepositNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDeposit(true);
    try {
      await adminService.saveDepositNumbers({
        orangeMoney: depositOrange.trim(),
        moovMoney: depositMoov.trim(),
        wave: depositWave.trim(),
        merchantName: depositMerchant.trim()
      });
      setDepositSuccessMsg('Numéros de dépôt Mobile Money mis à jour et synchronisés avec succès !');
      setTimeout(() => setDepositSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour des numéros de dépôt.');
    } finally {
      setIsSavingDeposit(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminService.verifyPassword(passwordInput)) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Mot de passe administrateur incorrect.');
    }
  };

  const handleExtendShop = async (shopId: string, months: number) => {
    try {
      await adminService.extendShopLicense(shopId, months);
      setShopActionFeedback(`Abonnement prolongé de +${months} mois avec succès !`);
      setTimeout(() => setShopActionFeedback(''), 3500);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la prolongation.');
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (confirm(`⚠️ ATTENTION ACTION IRRÉVERSIBLE ⚠️\n\nVoulez-vous vraiment supprimer définitivement le compte de la boutique "${shopName}" ?\n\nToutes les données (ventes, dettes, clients, profil) seront définitivement effacées.`)) {
      try {
        await adminService.deleteShop(shopId);
        setSelectedShop(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression de la boutique.');
      }
    }
  };

  const handleGenerateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await adminService.generateLicenseKeys(genPlan, genCount, genNotes);
      setGenNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la génération.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLicense = async (id: string) => {
    if (confirm('Supprimer cette clé de licence ?')) {
      await adminService.deleteLicense(id);
      await loadData();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(code);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCsv = async () => {
    try {
      const csv = await adminService.exportShopsCsv();
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fasocarnet_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erreur lors de l\'exportation : ' + err.message);
    }
  };

  const handleSaveBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert('Veuillez remplir le titre et le message de l\'annonce.');
      return;
    }
    setIsSavingBroadcast(true);
    try {
      const messageObj: AdminBroadcastMessage = {
        id: `bc_${Date.now()}`,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await adminService.setBroadcastMessage(messageObj);
      setBroadcast(messageObj);
      setBroadcastSuccess('Annonce diffusée avec succès à tous les commerçants !');
      setTimeout(() => setBroadcastSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la diffusion.');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const handleDisableBroadcast = async () => {
    if (confirm('Arrêter la diffusion de cette annonce ?')) {
      await adminService.setBroadcastMessage(null);
      setBroadcast(null);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastSuccess('Annonce retirée.');
      setTimeout(() => setBroadcastSuccess(''), 3000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    try {
      adminService.setPassword(newPassword.trim());
      setPasswordSuccess('Mot de passe administrateur modifié avec succès !');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredShops = shops.filter(shop => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      shop.name.toLowerCase().includes(q) ||
      (shop.ownerName && shop.ownerName.toLowerCase().includes(q)) ||
      shop.phone.includes(q) ||
      (shop.city && shop.city.toLowerCase().includes(q)) ||
      (shop.ownerPhone && shop.ownerPhone.includes(q));

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return shop.statusType === filterStatus;
  });

  const getShopBadgeStyle = (shop: ShopAdminDetails) => {
    if (shop.statusType === 'active') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (shop.statusType === 'trial') {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    return 'bg-red-500/15 text-red-300 border-red-500/30';
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
              <Crown className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Espace Super-Admin</h2>
            <p className="text-xs text-slate-400">
              Contrôle total des boutiques, abonnements et licences FasoCarnet.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Mot de Passe Administrateur
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Code d'accès admin"
                  className="w-full pl-3 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-xs text-red-400 font-semibold bg-red-950/40 p-2.5 rounded-xl border border-red-800/50">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Accéder au Tableau de Bord</span>
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'application</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 overflow-y-auto flex flex-col">
      {/* Header Admin Responsif */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black text-white leading-tight font-display truncate">
              FasoCarnet Admin Master
            </h1>
            <span className="text-[9px] sm:text-[11px] text-emerald-400 font-bold tracking-wider uppercase font-display block truncate">
              Super-Administrateur • Contrôle Réseau
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1 sm:space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            title="Synchroniser toutes les boutiques du réseau"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline sm:inline">{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Quitter Admin</span>
          </button>
        </div>
      </header>

      {/* Navigation tabs responsives */}
      <div className="max-w-6xl w-full mx-auto p-3 sm:p-5 md:p-6 space-y-4 flex-1 pb-16">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 sm:gap-2 bg-slate-900/90 backdrop-blur p-1 sm:p-1.5 rounded-2xl border border-slate-800 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('shops')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'shops'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Boutiques ({shops.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
            <span className="truncate">Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('licenses')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'licenses'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Licences ({licenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Megaphone className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${broadcast?.isActive ? 'text-amber-400 animate-pulse' : ''}`} />
            <span className="truncate">Annonces {broadcast?.isActive ? '•' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Relances</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Sécurité & Dépôts</span>
          </button>
        </div>

        {/* TAB 1 : BOUTIQUES (AFFICHAGE MINIMALISTE + MODALE DÉTAILS) */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Total Boutiques</span>
                  <div className="text-xl sm:text-2xl font-black text-white font-display">{stats.totalShops}</div>
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-display">Abonnements Actifs</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">{stats.activeShops}</div>
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-display">En Essai (10j)</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-display">{stats.trialShops}</div>
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-wider font-display">Expirées / Relances</span>
                  <div className="text-xl sm:text-2xl font-black text-red-400 font-display">{stats.expiredShops}</div>
                </div>
              </div>
            )}

            {/* Barre de recherche et filtres */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par boutique, nom, téléphone ou ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div className="flex space-x-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar shrink-0">
                {(['all', 'active', 'trial', 'expired'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                      filterStatus === st
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'Tous' : st === 'active' ? 'Actifs' : st === 'trial' ? 'Essai' : 'Expirés'}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste épurée des boutiques (Nom, Date de création, Forfait en cours) */}
            {filteredShops.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-3xl text-center space-y-2 border border-slate-800">
                <Store className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="font-bold text-sm text-slate-300">Aucune boutique trouvée</h3>
                <p className="text-xs text-slate-500">Aucun profil ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredShops.map((shop) => {
                  const createdDate = shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue';
                  const badgeStyle = getShopBadgeStyle(shop);

                  return (
                    <div
                      key={shop.id}
                      onClick={() => setSelectedShop(shop)}
                      className="cursor-pointer bg-slate-900/90 hover:bg-slate-800/80 active:scale-[0.99] p-3 sm:p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between gap-3 group shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-white text-sm sm:text-base group-hover:text-emerald-300 transition-colors truncate">
                            {shop.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Créée le {createdDate}</span>
                          {shop.city && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">{shop.city}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border ${badgeStyle}`}>
                          {shop.statusLabel}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 : ANALYTICS & TÉLÉMÉTRIE (SIMPLIFIÉ : APPAREILS, RATIO PAYANTS/ESSAI, PROVENANCE) */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Analytics avec Export CSV */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white font-display">Télémétrie Globale & Démographie</h3>
                <p className="text-xs text-slate-400 mt-0.5">Suivi en temps réel des installations et de l'adoption</p>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl sm:rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all font-display cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exporter Données (CSV / Excel)</span>
              </button>
            </div>

            {/* 1. Métriques Clés : Installations & Abonnements */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Appareils / Installs</span>
                <div className="text-xl sm:text-2xl font-black text-white font-display">{analytics.totalInstalls}</div>
                <span className="text-[10px] text-emerald-400 font-bold block">{analytics.activeInstallsToday} actif(s) aujourd'hui</span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-display">Abonnés Payants</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">
                  {paidShops.length}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {analytics.totalInstalls > 0 ? Math.round((paidShops.length / analytics.totalInstalls) * 100) : 0}% du réseau
                </span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-display">Versions d'Essai</span>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-display">
                  {trialShops.filter(s => s.statusType === 'trial').length}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {analytics.totalInstalls > 0 ? Math.round((trialShops.filter(s => s.statusType === 'trial').length / analytics.totalInstalls) * 100) : 0}% du réseau
                </span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider font-display">Actifs (7 Derniers Jours)</span>
                <div className="text-xl sm:text-2xl font-black text-sky-400 font-display">{analytics.activeInstallsThisWeek}</div>
                <span className="text-[10px] text-slate-400 block">Sur {analytics.totalInstalls} terminaux</span>
              </div>
            </div>

            {/* 2. Répartition Abonnements Payants vs Versions d'Essai (Visual Bar) */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-white">
                  <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm font-display">Répartition des Abonnements</h4>
                    <p className="text-[11px] text-slate-400">Ratio abonnés actifs payants vs commerçants en essai</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Payants : {paidShops.length} ({shops.length > 0 ? Math.round((paidShops.length / shops.length) * 100) : 0}%)</span>
                  </span>
                  <span className="text-amber-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Essai / Expirés : {trialShops.length} ({shops.length > 0 ? Math.round((trialShops.length / shops.length) * 100) : 0}%)</span>
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${shops.length > 0 ? (paidShops.length / shops.length) * 100 : 0}%` }}
                    title={`Payants: ${paidShops.length}`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${shops.length > 0 ? (trialShops.length / shops.length) * 100 : 0}%` }}
                    title={`Essai: ${trialShops.length}`}
                  />
                </div>
              </div>
            </div>

            {/* 3. Provenance Géographique des Commerçants */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-white">
                  <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm font-display">Provenance Géographique des Commerçants</h4>
                    <p className="text-[11px] text-slate-400">Répartition par ville et localité au Burkina Faso</p>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {analytics.cityStats.length} ville(s)
                </span>
              </div>

              {analytics.cityStats.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  Aucune ville renseignée pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {analytics.cityStats.map((c) => {
                    const percentage = analytics.totalInstalls > 0 ? Math.round((c.count / analytics.totalInstalls) * 100) : 0;
                    return (
                      <div key={c.city} className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-2 hover:border-slate-600 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                            <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">{c.city}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono">
                              {c.count} {c.count > 1 ? 'boutiques' : 'boutique'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 font-bold">
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Barre de progression */}
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3 : GÉNÉRATEUR DE LICENCES */}
        {activeTab === 'licenses' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleGenerateKeys} className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center space-x-2 text-emerald-400 border-b border-slate-800 pb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-xs sm:text-sm text-white font-display">Générateur de Clés Prépayées</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Formule / Durée
                  </label>
                  <select
                    value={genPlan}
                    onChange={(e: any) => setGenPlan(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="monthly">1 Mois (2 000 FCFA)</option>
                    <option value="semi-annual">6 Mois (10 000 FCFA)</option>
                    <option value="annual">1 An (20 000 FCFA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Quantité de clés
                  </label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={1}>1 Clé</option>
                    <option value={5}>5 Clés (Lot)</option>
                    <option value={10}>10 Clés (Lot)</option>
                    <option value={25}>25 Clés (Distributeur)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Note / Destinataire (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Paiement OM 70123456"
                    value={genNotes}
                    onChange={(e) => setGenNotes(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-2 text-xs font-display cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isGenerating ? 'Génération en cours...' : '⚡ Générer les Clés d\'Activation'}</span>
              </button>
            </form>

            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-3">
                <h3 className="font-bold text-xs sm:text-sm text-white font-display">
                  Clés Créées ({licenses.length})
                </h3>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  {licenses.filter(l => !l.isUsed).length} disponible(s) • {licenses.filter(l => l.isUsed).length} utilisée(s)
                </span>
              </div>

              {licenses.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Aucune clé générée pour le moment.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto divide-y divide-slate-800">
                  {licenses.map((lic) => {
                    const waShareUrl = adminService.getWhatsAppDispatchUrl(lic);

                    return (
                      <div key={lic.id} className="pt-2.5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-emerald-400 text-xs sm:text-sm tracking-wider">
                              {lic.code}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-display ${
                              lic.isUsed 
                                ? 'bg-slate-800 text-slate-400' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {lic.isUsed ? 'Utilisée' : 'Disponible'}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 block">
                            {lic.durationDays} jours • {formatCurrency(lic.price)} 
                            {lic.notes && ` • Note: ${lic.notes}`}
                            {lic.isUsed && lic.usedByShopName && ` • Utilisée par: ${lic.usedByShopName}`}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(lic.code)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1 transition-all cursor-pointer"
                            title="Copier le code"
                          >
                            {copiedKey === lic.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === lic.code ? 'Copié !' : 'Copier'}</span>
                          </button>

                          <a
                            href={waShareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                            title="Partager au client sur WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteLicense(lic.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                            title="Supprimer cette clé de licence"
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

        {/* TAB 4 : ANNONCES & BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleSaveBroadcast} className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Megaphone className="w-5 h-5" />
                  <h3 className="font-bold text-xs sm:text-sm text-white font-display">Diffusion de Message Broadcast aux Commerçants</h3>
                </div>
                {broadcast?.isActive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase font-display border border-emerald-500/30 self-start sm:self-auto">
                    En Ligne sur les Téléphones
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Titre de l'Annonce *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 🚀 Mise à jour disponible / 🎁 Promo Annuelle"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-bold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Type d'Annonce & Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'info', label: 'ℹ️ Information', color: 'border-blue-500 bg-blue-500/20 text-blue-300' },
                      { id: 'promo', label: '🎁 Promotion Flash', color: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBroadcastType(m.id as any)}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                          broadcastType === m.id ? m.color : 'border-slate-800 text-slate-400 bg-slate-800/40 hover:text-white'
                        }`}
                      >
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Message Complet à Afficher *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ex: Profitez dès aujourd'hui du forfait annuel à 20 000 FCFA avec assistance 24/7..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
                  ></textarea>
                </div>
              </div>

              {broadcastSuccess && (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/50 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{broadcastSuccess}</span>
                </p>
              )}

              {/* Aperçu en direct */}
              <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-display">Aperçu pour le commerçant :</span>
                <div className={`p-3 rounded-xl text-xs flex items-start space-x-2.5 ${
                  broadcastType === 'promo'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                    : 'bg-blue-500/15 border border-blue-500/30 text-blue-200'
                }`}>
                  <Megaphone className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">{broadcastTitle || 'Titre de votre annonce'}</strong>
                    <span>{broadcastMessage || 'Le texte du message apparaîtra ici directement sur tous les téléphones des commerçants.'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {broadcast?.isActive && (
                  <button
                    type="button"
                    onClick={handleDisableBroadcast}
                    className="w-full sm:w-1/3 py-3 sm:py-3.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 font-bold rounded-xl sm:rounded-2xl text-xs transition-all border border-slate-700 cursor-pointer"
                  >
                    Désactiver l'Annonce
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingBroadcast}
                  className={`${broadcast?.isActive ? 'w-full sm:w-2/3' : 'w-full'} py-3 sm:py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl sm:rounded-2xl text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 font-display cursor-pointer disabled:opacity-50`}
                >
                  <Send className="w-4 h-4" />
                  <span>{isSavingBroadcast ? 'Diffusion...' : 'Diffuser sur Tous les Téléphones'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5 : RELANCES & DIFFUSION GROUPÉE WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center space-x-2.5 text-emerald-400">
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white font-display">Listes de Diffusion & Relances WhatsApp</h3>
                  <p className="text-xs text-slate-400">Relancez vos commerçants par groupe ciblé en un seul clic</p>
                </div>
              </div>

              {relanceFeedback && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-300 animate-in fade-in duration-150 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{relanceFeedback}</span>
                </div>
              )}
            </div>

            {/* LISTE 1 : ABONNÉS EN VERSION D'ESSAI */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-900/40 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-white font-display">
                      Liste 1 : Abonnés en Version d'Essai
                    </h4>
                    <p className="text-[11px] text-slate-400">Commerçants en période d'essai de 10 jours ou arrivant à expiration</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black font-mono">
                    {trialShops.length} boutique(s) • {getShopPhones(trialShops).length} contact(s)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider font-display">
                  Message de relance (Version d'Essai)
                </label>
                <textarea
                  rows={5}
                  value={trialRelanceMessage}
                  onChange={(e) => setTrialRelanceMessage(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
                  placeholder="Rédigez le message pour les abonnés en version d'essai..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyGroupPhones("Abonnés Essai", trialShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier tous les numéros pour créer une liste de diffusion WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Copier Numéros</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyGroupMessage(trialRelanceMessage, "Abonnés Essai")}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier le texte du message"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copier Message</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportGroupVCard("Abonnes_Essai", trialShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Télécharger le carnet de contacts .VCF pour votre téléphone"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Carnet (.VCF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppGroup(trialRelanceMessage, "Abonnés Essai")}
                  className="px-3 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer font-display"
                  title="Copier le message et ouvrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Relancer WhatsApp</span>
                </button>
              </div>
            </div>

            {/* LISTE 2 : ABONNÉS EN VERSION PAYANTE */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-900/40 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-white font-display">
                      Liste 2 : Abonnés en Version Payante
                    </h4>
                    <p className="text-[11px] text-slate-400">Commerçants avec une licence active (1 mois, 6 mois, 1 an)</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black font-mono">
                    {paidShops.length} boutique(s) • {getShopPhones(paidShops).length} contact(s)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider font-display">
                  Message pour les Abonnés Payants
                </label>
                <textarea
                  rows={5}
                  value={paidRelanceMessage}
                  onChange={(e) => setPaidRelanceMessage(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                  placeholder="Rédigez le message pour les abonnés payants..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyGroupPhones("Abonnés Payants", paidShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier tous les numéros pour créer une liste de diffusion WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copier Numéros</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyGroupMessage(paidRelanceMessage, "Abonnés Payants")}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier le texte du message"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copier Message</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportGroupVCard("Abonnes_Payants", paidShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Télécharger le carnet de contacts .VCF pour votre téléphone"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Carnet (.VCF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppGroup(paidRelanceMessage, "Abonnés Payants")}
                  className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer font-display"
                  title="Copier le message et ouvrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Envoyer WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6 : SÉCURITÉ & DÉPÔTS MOBILE MONEY */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* COMPTES DE DÉPÔT MOBILE MONEY */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5 text-amber-400">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white font-display">
                      Numéros de Dépôt Mobile Money (Abonnements & Licences)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ces numéros sont affichés à tous les commerçants lors du paiement de leur abonnement.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveDepositNumbers} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                  {/* Orange Money */}
                  <div className="bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-orange-400 font-display flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Orange Money</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Burkina Faso
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 72990310"
                      value={depositOrange}
                      onChange={(e) => setDepositOrange(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-black text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-[10px] text-slate-400">Numéro pour les dépôts et transferts Orange Money.</p>
                  </div>

                  {/* Moov Money */}
                  <div className="bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-blue-400 font-display flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Moov Money</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Burkina Faso
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 03901590"
                      value={depositMoov}
                      onChange={(e) => setDepositMoov(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-black text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">Numéro pour les dépôts et transferts Moov Money.</p>
                  </div>

                  {/* Wave */}
                  <div className="bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-display flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Wave</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Burkina Faso
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 72990310"
                      value={depositWave}
                      onChange={(e) => setDepositWave(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-black text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <p className="text-[10px] text-slate-400">Numéro pour les transferts et paiements Wave.</p>
                  </div>
                </div>

                {/* Nom du titulaire */}
                <div className="bg-slate-800/40 p-3.5 sm:p-4 rounded-2xl border border-slate-700/60 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 font-display flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nom du Titulaire des Comptes</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maxime OUATTARA"
                    value={depositMerchant}
                    onChange={(e) => setDepositMerchant(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Ce nom rassure le commerçant pour qu'il vérifie l'identité du destinataire avant de valider le transfert.
                  </p>
                </div>

                {depositSuccessMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-300 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{depositSuccessMsg}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingDeposit}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md transition-all font-display flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{isSavingDeposit ? 'Enregistrement en cours...' : 'Enregistrer & Synchroniser les Numéros'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ÉTAT DU CLOUD & SAUVEGARDE GLOBALE */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5 text-emerald-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-white font-display">Synchronisation Cloud & Sauvegarde</h3>
                    <p className="text-[10px] text-slate-400">Base de données PostgreSQL sécurisée en temps réel</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportAllShopsJson}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Télécharger une sauvegarde complète de toutes les boutiques au format JSON"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sauvegarde Globale (.json)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Base de Données Cloud</span>
                  <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>PostgreSQL Supabase (En ligne)</span>
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Chiffrement & Sécurité</span>
                  <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SSL 256-bit Sécurisé</span>
                  </span>
                </div>
              </div>
            </div>

            {/* MOT DE PASSE SUPER-ADMIN */}
            <form onSubmit={handleChangePassword} className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm max-w-xl">
              <div className="flex items-center space-x-2 text-emerald-400 border-b border-slate-800 pb-3">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-xs sm:text-sm text-white font-display">Changer le Mot de Passe Super-Admin</h3>
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                  Nouveau Mot de Passe Administrateur
                </label>
                <input
                  type="password"
                  required
                  placeholder="Entrez le nouveau mot de passe secret"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {passwordSuccess && (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-800/50">
                  {passwordSuccess}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl sm:rounded-2xl text-xs shadow-md transition-all font-display cursor-pointer"
              >
                Mettre à jour le mot de passe
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MODALE DE DÉTAILS COMPLETS DE LA BOUTIQUE */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header Modale */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white font-display truncate">
                    {selectedShop.name}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getShopBadgeStyle(selectedShop)}`}>
                    {selectedShop.statusLabel}
                  </span>
                </div>
                {selectedShop.description && (
                  <p className="text-xs text-emerald-400 italic">
                    « {selectedShop.description} »
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification de feedback d'action */}
            {shopActionFeedback && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-300 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{shopActionFeedback}</span>
              </div>
            )}

            {/* Grille d'informations complètes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>Téléphone Boutique</span>
                </span>
                <span className="text-sm font-bold text-white block">{selectedShop.phone}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <User className="w-3 h-3 text-emerald-400" />
                  <span>Gérant / Propriétaire</span>
                </span>
                <span className="text-sm font-bold text-white block">{selectedShop.ownerName || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3 text-emerald-400" />
                  <span>WhatsApp Gérant</span>
                </span>
                <span className="text-sm font-bold text-white block">{selectedShop.ownerPhone || 'Identique'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Ville & Localité</span>
                </span>
                <span className="text-sm font-bold text-white block">{selectedShop.city || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Building className="w-3 h-3 text-sky-400" />
                  <span>Numéro IFU</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block">{selectedShop.ifu || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <FileText className="w-3 h-3 text-sky-400" />
                  <span>Registre RCCM</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block">{selectedShop.rccm || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Échéance de l'Abonnement</span>
                </span>
                <span className="text-xs font-bold text-amber-300 block">
                  {selectedShop.formattedExpiresAt} ({selectedShop.daysRemaining} jour(s) restants)
                </span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Date de Création</span>
                </span>
                <span className="text-xs font-bold text-slate-200 block">
                  {selectedShop.createdAt ? new Date(selectedShop.createdAt).toLocaleDateString('fr-FR') : 'Inconnue'}
                </span>
              </div>
            </div>

            {/* Statistiques d'activité */}
            <div className="bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-display">
                Activité Commerciale Enregistrée
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Ventes</span>
                  <span className="text-sm font-black text-white font-mono">{selectedShop.salesCount}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-emerald-400 block font-bold">Chiffre d'Affaires</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono truncate">{formatCurrency(selectedShop.totalSalesVolume)}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Clients</span>
                  <span className="text-sm font-black text-white font-mono">{selectedShop.customersCount}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 block font-bold">Dettes en cours</span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 font-mono truncate">{formatCurrency(selectedShop.totalDebtsAmount)}</span>
                </div>
              </div>
            </div>

            {/* Actions Super-Admin sur la boutique */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 flex-1">
                  <span className="text-[11px] font-black uppercase text-slate-400 shrink-0 font-display">Prolonger :</span>
                  <button
                    type="button"
                    onClick={() => handleExtendShop(selectedShop.id, 1)}
                    className="flex-1 py-2 px-2 bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all font-display cursor-pointer text-center"
                  >
                    +1 Mois
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendShop(selectedShop.id, 6)}
                    className="flex-1 py-2 px-2 bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all font-display cursor-pointer text-center"
                  >
                    +6 Mois
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendShop(selectedShop.id, 12)}
                    className="flex-1 py-2 px-2 bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all font-display cursor-pointer text-center"
                  >
                    +1 An
                  </button>
                </div>

                <a
                  href={adminService.getWhatsAppReminderUrl(selectedShop)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer font-display shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contacter WhatsApp</span>
                </a>
              </div>

              {/* Bouton de Suppression Définitive */}
              <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteShop(selectedShop.id, selectedShop.name)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-950/40 hover:bg-red-900/80 text-red-300 hover:text-red-100 text-xs font-bold rounded-xl border border-red-800/60 flex items-center justify-center space-x-2 transition-all cursor-pointer font-display"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Supprimer définitivement ce compte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

