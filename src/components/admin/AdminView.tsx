import React, { useState, useEffect } from 'react';
import {
  Store, Crown, Key, Lock, LogOut, Search, Plus, Copy, Check, Trash2,
  MessageCircle, ArrowLeft, Sparkles, Eye, EyeOff, RefreshCw,
  BarChart3, Smartphone, Radio, Download, Phone, Users,
  MapPin, Send, CheckCircle2, Megaphone
} from 'lucide-react';
import { adminService, AdminStats, ShopAdminDetails } from '../../db/services/adminService';
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
  const [broadcastType, setBroadcastType] = useState<'info' | 'promo' | 'warning' | 'alert'>('info');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // WhatsApp Campaigns & Contacts
  const [whatsappFilter, setWhatsappFilter] = useState<'all' | 'expired' | 'trial' | 'active'>('all');
  const [whatsappSearch, setWhatsappSearch] = useState('');
  const [whatsappTemplateType, setWhatsappTemplateType] = useState<'reminder' | 'promo' | 'update' | 'custom'>('reminder');
  const [whatsappCustomText, setWhatsappCustomText] = useState(
    'Bonjour {nom_boutique},\nVotre abonnement FasoCarnet arrive à échéance le {date_fin}.\nPour continuer à gérer vos ventes et reçus WhatsApp en toute sérénité, renouvelez votre licence :\n- 1 Mois : 2 000 FCFA\n- 6 Mois : 10 000 FCFA\n- 1 An : 20 000 FCFA\nPaiement Orange Money / Moov / Wave au 72990310.\nMerci de votre confiance !'
  );
  const [copiedShopMessageId, setCopiedShopMessageId] = useState<string | null>(null);
  const [whatsappCopyFeedback, setWhatsappCopyFeedback] = useState('');

  const getTemplateText = (type: 'reminder' | 'promo' | 'update' | 'custom') => {
    switch (type) {
      case 'reminder':
        return 'Bonjour {nom_boutique},\nVotre abonnement FasoCarnet arrive à échéance le {date_fin}.\nPour continuer à gérer vos ventes et reçus WhatsApp en toute sérénité, renouvelez votre licence :\n- 1 Mois : 2 000 FCFA\n- 6 Mois : 10 000 FCFA\n- 1 An : 20 000 FCFA\nPaiement Orange Money / Moov / Wave au 72990310.\nMerci de votre confiance !';
      case 'promo':
        return 'Offre Spéciale FasoCarnet pour {nom_boutique} !\nBénéficiez aujourd\'hui d\'une réduction exceptionnelle sur votre abonnement annuel (20 000 FCFA au lieu de 24 000 FCFA) avec assistance 24/7 incluse.\nContactez le support au 72990310 pour activer votre promotion.';
      case 'update':
        return 'Chère boutique {nom_boutique},\nUne nouvelle mise à jour de FasoCarnet Mobile est disponible avec des nouveautés pour booster vos ventes et sécuriser vos comptes !\nOuvrez votre application pour découvrir les améliorations.';
      case 'custom':
        return whatsappCustomText;
    }
  };

  const handleExportVCard = () => {
    const vcf = adminService.generateVCard(filteredWhatsappShops);
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fasocarnet_contacts_whatsapp_${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setWhatsappCopyFeedback('Fichier Contacts VCF téléchargé !');
    setTimeout(() => setWhatsappCopyFeedback(''), 3000);
  };

  const handleCopyAllPhones = () => {
    const phones: string[] = [];
    filteredWhatsappShops.forEach(s => {
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
    const unique = Array.from(new Set(phones));
    navigator.clipboard.writeText(unique.join(', '));
    setWhatsappCopyFeedback(`${unique.length} numéros WhatsApp copiés !`);
    setTimeout(() => setWhatsappCopyFeedback(''), 3000);
  };

  const filteredWhatsappShops = shops.filter(s => {
    const matchesSearch = !whatsappSearch.trim() || 
      s.name.toLowerCase().includes(whatsappSearch.toLowerCase()) ||
      s.phone.includes(whatsappSearch) ||
      (s.ownerPhone && s.ownerPhone.includes(whatsappSearch)) ||
      (s.city && s.city.toLowerCase().includes(whatsappSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (whatsappFilter === 'expired') {
      return s.daysRemaining <= 0 || s.statusType === 'expired';
    }
    if (whatsappFilter === 'trial') {
      return s.statusType === 'trial';
    }
    if (whatsappFilter === 'active') {
      return s.statusType === 'active' || s.daysRemaining > 0;
    }
    return true;
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [s, an, sh, l, bc] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getExtendedAnalytics(),
        adminService.getAllShopsWithDetails(),
        adminService.getAllLicenses(),
        adminService.getBroadcastMessage()
      ]);
      setStats(s);
      setAnalytics(an);
      setShops(sh);
      setLicenses(l);
      setBroadcast(bc);
      if (bc) {
        setBroadcastTitle(bc.title);
        setBroadcastMessage(bc.message);
        setBroadcastType(bc.type);
      }
    } finally {
      setIsRefreshing(false);
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
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la prolongation.');
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement la boutique ' + shopName + ' ?')) {
      await adminService.deleteShop(shopId);
      await loadData();
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
                  placeholder="Code d'accès admin (défaut: faso2026)"
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
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Accéder au Tableau de Bord</span>
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1.5"
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
      {/* Header Admin */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black text-white leading-tight font-display truncate">
              FasoCarnet Admin Master
            </h1>
            <span className="text-[9px] sm:text-[11px] text-emerald-400 font-bold tracking-wider uppercase font-display block truncate">
              Super-Administrateur • Contrôle Total
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

      {/* Navigation tabs */}
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
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Sécurité</span>
          </button>
        </div>

        {/* TAB 1 : BOUTIQUES & CRM */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Total Boutiques</span>
                  <div className="text-xl sm:text-2xl font-black text-white font-display">{stats.totalShops}</div>
                </div>

                <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-display">Abonnements Actifs</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">{stats.activeShops}</div>
                </div>

                <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-display">En Essai (10j)</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-display">{stats.trialShops}</div>
                </div>

                <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
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

            {/* Liste des boutiques */}
            {filteredShops.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-3xl text-center space-y-2 border border-slate-800">
                <Store className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="font-bold text-sm text-slate-300">Aucune boutique trouvée</h3>
                <p className="text-xs text-slate-500">Aucun profil ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredShops.map((shop) => {
                  const waReminderUrl = adminService.getWhatsAppReminderUrl(shop);

                  return (
                    <div
                      key={shop.id}
                      className={`bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all space-y-3 ${
                        shop.statusType === 'active'
                          ? 'border-slate-800 hover:border-emerald-500/50'
                          : shop.statusType === 'trial'
                          ? 'border-slate-800 hover:border-amber-500/50'
                          : 'border-red-900/60 bg-red-950/10'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-white text-sm sm:text-base tracking-tight font-display truncate">{shop.name}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider font-display shrink-0 ${
                                shop.statusType === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : shop.statusType === 'trial'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}
                            >
                              {shop.statusLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                            <span>📞 {shop.phone}</span>
                            {shop.ownerName && <span>👤 Patron : <strong className="text-slate-200">{shop.ownerName}</strong></span>}
                            {shop.city && <span>📍 <strong className="text-slate-300">{shop.city}</strong></span>}
                            <span>⏳ Expire : <strong className="text-slate-200">{shop.formattedExpiresAt}</strong> ({shop.daysRemaining}j)</span>
                          </div>
                        </div>

                        <div className="text-left lg:text-right bg-slate-800/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-700/60 shrink-0 flex lg:block justify-between items-center">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-black block font-display">Chiffre d'Affaires</span>
                            <span className="text-sm sm:text-base font-black text-emerald-400 font-display">{formatCurrency(shop.totalSalesVolume)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block lg:mt-0.5">{shop.salesCount} vente(s) • {shop.customersCount} client(s)</span>
                        </div>
                      </div>

                      {/* Actions Rapides */}
                      <div className="pt-2.5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 shrink-0">Prolonger :</span>
                          <button
                            type="button"
                            onClick={() => handleExtendShop(shop.id, 1)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[10px] font-bold rounded-lg border border-slate-700 transition-all font-display cursor-pointer"
                          >
                            +1 Mois
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExtendShop(shop.id, 6)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[10px] font-bold rounded-lg border border-slate-700 transition-all font-display cursor-pointer"
                          >
                            +6 Mois
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExtendShop(shop.id, 12)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[10px] font-bold rounded-lg border border-slate-700 transition-all font-display cursor-pointer"
                          >
                            +1 An
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2 w-full md:w-auto justify-between md:justify-end">
                          <a
                            href={waReminderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Relancer WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteShop(shop.id, shop.name)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                            title="Supprimer la boutique"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 : ANALYTICS & TÉLÉMÉTRIE */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Analytics avec Export CSV */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white font-display">Télémétrie Globale & Démographie</h3>
                <p className="text-xs text-slate-400 mt-0.5">Données d'utilisation en temps réel de tous les appareils connectés</p>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all font-display cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exporter Données (CSV / Excel)</span>
              </button>
            </div>

            {/* Cartes KPIs Réseau */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Appareils / Installs</span>
                <div className="text-xl sm:text-2xl font-black text-white font-display">{analytics.totalInstalls}</div>
                <span className="text-[10px] text-emerald-400 font-bold block">{analytics.activeInstallsToday} actif(s) aujourd'hui</span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-display">Volume Total Réseau</span>
                <div className="text-base sm:text-xl font-black text-emerald-400 font-display truncate">{formatCurrency(analytics.totalNetworkSalesVolume)}</div>
                <span className="text-[10px] text-slate-400 block">{analytics.totalNetworkSalesCount} transactions</span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-display">Dettes en Circulation</span>
                <div className="text-base sm:text-xl font-black text-amber-400 font-display truncate">{formatCurrency(analytics.totalNetworkDebtsVolume)}</div>
                <span className="text-[10px] text-slate-400 block">{analytics.totalNetworkCustomersCount} clients au total</span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider font-display">Actifs (7 Derniers Jours)</span>
                <div className="text-xl sm:text-2xl font-black text-sky-400 font-display">{analytics.activeInstallsThisWeek}</div>
                <span className="text-[10px] text-slate-400 block">Sur {analytics.totalInstalls} terminaux</span>
              </div>
            </div>

            {/* Graphiques Répartition Opérateurs & Plateformes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Opérateurs Télécom & Mobile Money */}
              <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 text-white border-b border-slate-800 pb-3">
                  <Radio className="w-5 h-5 text-orange-400" />
                  <h4 className="font-bold text-xs sm:text-sm font-display">Répartition par Opérateur (Burkina Faso)</h4>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Orange */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-orange-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600]"></span>
                        <span>Orange Burkina Faso</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.operatorStats.orange} ({analytics.totalInstalls ? Math.round((analytics.operatorStats.orange / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ff6600] rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? (analytics.operatorStats.orange / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Moov Africa */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-blue-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#005baa]"></span>
                        <span>Moov Africa Burkina</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.operatorStats.moov} ({analytics.totalInstalls ? Math.round((analytics.operatorStats.moov / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005baa] rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? (analytics.operatorStats.moov / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Telecel */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-red-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        <span>Telecel Faso</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.operatorStats.telecel} ({analytics.totalInstalls ? Math.round((analytics.operatorStats.telecel / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? (analytics.operatorStats.telecel / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Autre */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                        <span>Autre / Non Déterminé</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.operatorStats.other} ({analytics.totalInstalls ? Math.round((analytics.operatorStats.other / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? (analytics.operatorStats.other / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Répartition par Plateforme OS */}
              <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 text-white border-b border-slate-800 pb-3">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-xs sm:text-sm font-display">Plateformes & Appareils</h4>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Android APK / Mobile */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-emerald-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Android (APK / Web Mobile)</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.platformStats.android + analytics.platformStats.webMobile} ({analytics.totalInstalls ? Math.round(((analytics.platformStats.android + analytics.platformStats.webMobile) / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? ((analytics.platformStats.android + analytics.platformStats.webMobile) / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* iOS */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-sky-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                        <span>Apple iOS (iPhone / iPad)</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.platformStats.ios} ({analytics.totalInstalls ? Math.round((analytics.platformStats.ios / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? (analytics.platformStats.ios / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-purple-400 flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                        <span>Ordinateur PC / Mac / Chrome</span>
                      </span>
                      <span className="text-slate-300 font-mono font-black">
                        {analytics.platformStats.desktop} ({analytics.totalInstalls ? Math.round((analytics.platformStats.desktop / analytics.totalInstalls) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.totalInstalls ? (analytics.platformStats.desktop / analytics.totalInstalls) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Villes & Provenance Démographique */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center space-x-2 text-white border-b border-slate-800 pb-3">
                <MapPin className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-xs sm:text-sm font-display">Provenance Géographique (Villes)</h4>
              </div>

              {analytics.cityStats.length === 0 ? (
                <p className="text-xs text-slate-500">Aucune ville renseignée pour le moment.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                  {analytics.cityStats.map((c) => (
                    <div key={c.city} className="bg-slate-800/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-700/60 flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-200 truncate">{c.city}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono shrink-0">
                        {c.count}
                      </span>
                    </div>
                  ))}
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'info', label: 'ℹ️ Info', color: 'border-blue-500 bg-blue-500/20 text-blue-300' },
                      { id: 'promo', label: '🎁 Promo', color: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' },
                      { id: 'warning', label: '⚠️ Attention', color: 'border-amber-500 bg-amber-500/20 text-amber-300' },
                      { id: 'alert', label: '🚨 Urgence', color: 'border-red-500 bg-red-500/20 text-red-300' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBroadcastType(m.id as any)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                          broadcastType === m.id ? m.color : 'border-slate-800 text-slate-400 bg-slate-800/40 hover:text-white'
                        }`}
                      >
                        {m.label}
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
                    : broadcastType === 'warning'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200'
                    : broadcastType === 'alert'
                    ? 'bg-red-500/15 border border-red-500/30 text-red-200'
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

        {/* TAB 5 : RELANCES & CAMPAGNES WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header & Exportation Carnet / Numéros */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5 text-emerald-400">
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm text-white font-display">Collecte & Campagnes WhatsApp</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400">Relances ciblées, promotions et diffusion de masse sur les numéros commerçants</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleExportVCard}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                    title="Télécharger tous les contacts dans un fichier .vcf pour l'importer sur votre smartphone"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter Carnet (.VCF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAllPhones}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                    title="Copier tous les numéros au format international (+226...)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier Numéros</span>
                  </button>
                </div>
              </div>

              {whatsappCopyFeedback && (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-800/50 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{whatsappCopyFeedback}</span>
                </p>
              )}

              {/* Métriques rapides des contacts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-display">Total Contacts</span>
                  <div className="text-lg sm:text-xl font-black text-white font-display">{shops.length} boutiques</div>
                </div>

                <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block font-display">À Relancer (Expirés)</span>
                  <div className="text-lg sm:text-xl font-black text-red-400 font-display">
                    {shops.filter(s => s.daysRemaining <= 0 || s.statusType === 'expired').length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block font-display">En Essai</span>
                  <div className="text-lg sm:text-xl font-black text-amber-400 font-display">
                    {shops.filter(s => s.statusType === 'trial').length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block font-display">Licences Actives</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 font-display">
                    {shops.filter(s => s.statusType === 'active' || s.daysRemaining > 0).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Générateur de Modèle de Message */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center space-x-2 text-emerald-400 border-b border-slate-800 pb-3">
                <Send className="w-4 h-4" />
                <h4 className="font-bold text-xs text-white uppercase tracking-wider font-display">
                  Modèle de Message de Campagne
                </h4>
              </div>

              {/* Sélection du Type de Message */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'reminder', label: '⏳ Relance Expiration' },
                  { id: 'promo', label: '🎁 Promotion Flash' },
                  { id: 'update', label: '🚀 Nouvelle Version' },
                  { id: 'custom', label: '✍️ Message Libre' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setWhatsappTemplateType(t.id as any);
                      if (t.id !== 'custom') {
                        setWhatsappCustomText(getTemplateText(t.id as any));
                      }
                    }}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      whatsappTemplateType === t.id
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Éditeur de Message */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                  Contenu du Message (Variables disponibles : <code className="text-emerald-400">{`{nom_boutique}`}</code>, <code className="text-emerald-400">{`{date_fin}`}</code>, <code className="text-emerald-400">{`{jours_restants}`}</code>, <code className="text-emerald-400">{`{ville}`}</code>)
                </label>
                <textarea
                  rows={4}
                  value={whatsappTemplateType === 'custom' ? whatsappCustomText : getTemplateText(whatsappTemplateType)}
                  onChange={(e) => {
                    setWhatsappCustomText(e.target.value);
                    if (whatsappTemplateType !== 'custom') {
                      setWhatsappTemplateType('custom');
                    }
                  }}
                  className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                  placeholder="Rédigez ici votre message personnalisé..."
                />
              </div>
            </div>

            {/* Liste Filtrée des Commerçants et Actions Individuelles */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider font-display">
                    Destinataires Ciblés ({filteredWhatsappShops.length})
                  </h4>
                </div>

                {/* Filtres de Statut */}
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'expired', label: 'À Relancer' },
                    { id: 'trial', label: 'Essai' },
                    { id: 'active', label: 'Actifs' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setWhatsappFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        whatsappFilter === f.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recherche rapide */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrer par boutique, numéro, patron ou ville..."
                  value={whatsappSearch}
                  onChange={(e) => setWhatsappSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              {/* Cartes Commerçants WhatsApp */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredWhatsappShops.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Aucun contact ne correspond à ce filtre.</p>
                ) : (
                  filteredWhatsappShops.map((shop) => {
                    const currentTemplate = whatsappTemplateType === 'custom' ? whatsappCustomText : getTemplateText(whatsappTemplateType);
                    const whatsappUrl = adminService.getCustomWhatsAppUrl(shop.phone, currentTemplate, shop);
                    const ownerWhatsappUrl = shop.ownerPhone ? adminService.getCustomWhatsAppUrl(shop.ownerPhone, currentTemplate, shop) : null;

                    return (
                      <div
                        key={shop.id}
                        className="p-3 sm:p-3.5 bg-slate-950/60 rounded-xl sm:rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-white text-xs sm:text-sm font-display truncate">{shop.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              shop.daysRemaining <= 0
                                ? 'bg-red-900/60 text-red-300 border border-red-700/50'
                                : shop.statusType === 'trial'
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                                : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                            }`}>
                              {shop.statusLabel} ({shop.daysRemaining >= 0 ? `${shop.daysRemaining}j` : 'Expiré'})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center space-x-1 text-slate-300">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{shop.phone}</span>
                            </span>

                            {shop.ownerPhone && (
                              <span className="flex items-center space-x-1 text-amber-300">
                                <span>Patron:</span>
                                <span>{shop.ownerPhone}</span>
                              </span>
                            )}

                            {shop.city && (
                              <span className="flex items-center space-x-1 text-slate-500">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{shop.city}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Boutons d'Action WhatsApp */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2 shrink-0 self-start md:self-center">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-sm flex items-center space-x-1.5 active:scale-95 transition-all font-display cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Relancer WhatsApp</span>
                          </a>

                          {ownerWhatsappUrl && (
                            <a
                              href={ownerWhatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-2 bg-slate-800 hover:bg-amber-900/50 text-amber-300 border border-slate-700 text-xs rounded-xl flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                              title="Envoyer au propriétaire / patron"
                            >
                              <span>Patron</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const cleanMsg = currentTemplate
                                .replace(/{nom_boutique}/g, shop.name || '')
                                .replace(/{telephone}/g, shop.phone || '')
                                .replace(/{proprietaire}/g, shop.ownerName || shop.name || '')
                                .replace(/{statut}/g, shop.statusLabel || '')
                                .replace(/{jours_restants}/g, String(shop.daysRemaining >= 0 ? shop.daysRemaining : 0))
                                .replace(/{date_fin}/g, shop.formattedExpiresAt || '')
                                .replace(/{ville}/g, shop.city || 'Burkina Faso');
                              navigator.clipboard.writeText(cleanMsg);
                              setCopiedShopMessageId(shop.id);
                              setTimeout(() => setCopiedShopMessageId(null), 2500);
                            }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                            title="Copier le message personnalisé pour cette boutique"
                          >
                            {copiedShopMessageId === shop.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6 : SÉCURITÉ ADMIN */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleChangePassword} className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm max-w-xl">
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
    </div>
  );
};
