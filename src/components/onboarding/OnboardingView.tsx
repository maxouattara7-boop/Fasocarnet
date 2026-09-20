import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { 
  Store, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Zap,
  BookOpen,
  WifiOff,
  Download,
  Globe
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { BurkinaFlag } from '../common/BurkinaFlag';
import { LandingPageView } from '../landing/LandingPageView';

export const OnboardingView: React.FC = () => {
  const { loginWithPhoneAndPin, createShop, isSyncing } = useAppStore();

  // Écran en cours : 'landing' (Vitrine complète), 'welcome' (Présentation express) ou 'auth' (Connexion / Création)
  const [viewStep, setViewStep] = useState<'welcome' | 'landing' | 'auth'>('welcome');

  // Mode dans l'écran auth : 'login' ou 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Champs Connexion
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Champs Création d'espace
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Ouagadougou');
  const [customCity, setCustomCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showMobileMoney, setShowMobileMoney] = useState(false);
  const [omNumber, setOmNumber] = useState('');
  const [moovNumber, setMoovNumber] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await loginWithPhoneAndPin(loginPhone, loginPin);
      if (!res.success) {
        setLoginError(res.message || 'Identifiants incorrects.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erreur lors de la connexion.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!shopName.trim()) {
      setRegisterError('Veuillez renseigner le nom de votre commerce.');
      return;
    }

    if (!phone.trim()) {
      setRegisterError('Veuillez renseigner votre numéro WhatsApp.');
      return;
    }

    if (!pinCode.trim() || pinCode.trim().length < 4) {
      setRegisterError('Veuillez définir un code PIN à 4 chiffres pour sécuriser votre espace.');
      return;
    }

    const selectedCity = city === 'Autre' ? (customCity.trim() || 'Burkina Faso') : city;

    try {
      await createShop({
        name: shopName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: selectedCity,
        pinCode: pinCode.trim(),
        currency: 'FCFA',
        orangeMoneyNumber: omNumber.trim() || phone.trim(),
        moovMoneyNumber: moovNumber.trim() || undefined,
        waveNumber: waveNumber.trim() || undefined
      });
    } catch (err: any) {
      console.error(err);
      setRegisterError(err.message || "Erreur lors de la création de l'espace.");
    }
  };

  // =========================================================================
  // 0. SITE VITRINE / LANDING PAGE AVEC TÉLÉCHARGEMENT APK
  // =========================================================================
  if (viewStep === 'landing') {
    return <LandingPageView onOpenApp={() => setViewStep('welcome')} />;
  }

  // =========================================================================
  // 1. PAGE D'ACCUEIL & PRÉSENTATION EXPRESS DE L'APPLICATION
  // =========================================================================
  if (viewStep === 'welcome') {
    const handleDownloadApk = () => {
      const element = document.createElement('a');
      const file = new Blob([
        'FasoCarnet APK Mobile Application - Edition Android Professionnelle\nVersion: 1.2.0\nhttps://fasocarnet.com'
      ], { type: 'application/vnd.android.package-archive' });
      element.href = URL.createObjectURL(file);
      element.download = 'FasoCarnet-v1.2.0-Android.apk';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-md w-full mx-auto my-auto py-6 space-y-5 flex flex-col items-center text-center">
          
          {/* Bouton vers la vitrine complète */}
          <div className="w-full flex items-center justify-between animate-in fade-in duration-300">
            <button
              type="button"
              onClick={() => setViewStep('landing')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-all cursor-pointer shadow-xs"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voir le Site Vitrine</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadApk}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-400/30 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Télécharger l'APK</span>
            </button>
          </div>

          {/* Logo & Badge */}
          <div className="space-y-3 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-3 bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 rounded-3xl border border-emerald-500/30 shadow-2xl backdrop-blur-sm">
              <Logo size="lg" showText={false} />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-emerald-500/15 border border-emerald-400/30 rounded-full text-xs font-bold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>La Solution Digitale des Commerçants</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none pt-1 font-display">
              FasoCarnet <span className="text-emerald-400">Mobile</span>
            </h1>

            {/* Phrase d'accroche */}
            <p className="text-sm sm:text-base text-emerald-100/90 font-medium leading-relaxed max-w-sm px-2">
              Votre caisse, vos crédits clients et vos bilans en poche. <span className="text-amber-300 font-bold">Simple, rapide et 100% hors-ligne.</span>
            </p>
          </div>

          {/* Grille des 3 Atouts Clés */}
          <div className="w-full space-y-2.5 pt-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900/80 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center space-x-3.5 text-left backdrop-blur-md shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Caisse Tactile Express</h3>
                <p className="text-[11px] text-slate-300 line-clamp-1">Encaissez en 3 secondes avec reçus WhatsApp</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center space-x-3.5 text-left backdrop-blur-md shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Carnet de Dettes Intelligent</h3>
                <p className="text-[11px] text-slate-300 line-clamp-1">Suivez les crédits clients et relancez en 1 clic</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center space-x-3.5 text-left backdrop-blur-md shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
                <WifiOff className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">100% Hors-Ligne & Multi-Écrans</h3>
                <p className="text-[11px] text-slate-300 line-clamp-1">Vos données synchronisées sur vos téléphones</p>
              </div>
            </div>
          </div>

          {/* Bouton d'action Continuer */}
          <div className="w-full pt-2 animate-in fade-in slide-in-from-bottom-6 duration-1000 space-y-2">
            <button
              type="button"
              data-testid="btn-continue"
              onClick={() => setViewStep('auth')}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-base shadow-xl shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2.5 border border-emerald-400/30 cursor-pointer"
            >
              <span>Continuer</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-center space-x-1.5">
              <BurkinaFlag size="sm" />
              <span>Conçu pour les commerçants du Burkina Faso</span>
            </p>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. PAGE DE CONNEXION / CRÉATION D'ESPACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-md w-full mx-auto my-auto py-4 space-y-4">
        
        {/* Barre de retour vers l'accueil */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            data-testid="btn-back-welcome"
            onClick={() => setViewStep('welcome')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded-xl border border-emerald-700/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </button>
          
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-800/60 rounded-full text-[11px] font-bold text-emerald-200 border border-emerald-600/40">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>FasoCarnet</span>
          </div>
        </div>

        {/* Titre de l'étape */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Se connecter ou créer son espace
          </h2>
          <p className="text-xs text-emerald-200/80">
            Accédez à vos données ou configurez votre boutique
          </p>
        </div>

        {/* Sélecteur d'onglets (Connexion / Créer son espace) */}
        <div className="bg-emerald-900/80 p-1 rounded-2xl flex border border-emerald-700/60 shadow-lg">
          <button
            type="button"
            data-testid="tab-login"
            onClick={() => {
              setAuthMode('login');
              setLoginError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
              authMode === 'login'
                ? 'bg-white text-emerald-950 shadow-md scale-[1.02]'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Connexion</span>
          </button>

          <button
            type="button"
            data-testid="tab-register"
            onClick={() => {
              setAuthMode('register');
              setRegisterError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
              authMode === 'register'
                ? 'bg-emerald-500 text-emerald-950 shadow-md scale-[1.02]'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Créer un Espace</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ONGLET 1 : SE CONNECTER                                   */}
        {/* ======================================================== */}
        {authMode === 'login' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <form onSubmit={handleLoginSubmit} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-emerald-100">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold tracking-tight">Connexion à votre Espace</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  Connectez cet appareil à votre commerce pour retrouver immédiatement toutes vos données synchronisées.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs font-semibold text-red-700 animate-in shake shadow-xs">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Numéro de téléphone */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Numéro de Téléphone *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 70 12 34 56"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Code PIN */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Code PIN de Sécurité *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showLoginPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={8}
                    placeholder="• • • •"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-extrabold tracking-widest text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPin(!showLoginPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors"
                  >
                    {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connexion & Synchronisation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SE CONNECTER</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* ONGLET 2 : CRÉER SON ESPACE                              */}
        {/* ======================================================== */}
        {authMode === 'register' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <form onSubmit={handleRegisterSubmit} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-emerald-100">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold tracking-tight">Créer votre Espace Commerce</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  Renseignez ces informations pour configurer votre caisse tactile et votre carnet de crédits.
                </p>
              </div>

              {registerError && (
                <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs font-semibold text-red-700 animate-in shake shadow-xs">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{registerError}</span>
                </div>
              )}

              {/* 1. Nom du commerce */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Nom du Commerce / Boutique *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alimentation La Grâce, Kiosque Faso..."
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* 2. Numéro de téléphone WhatsApp */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Numéro WhatsApp / Téléphone *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 70 12 34 56"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* 3. Email (Optionnel) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider">
                    Adresse Email
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                    Optionnel
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Ex: contact@moncommerce.bf"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* 4. Ville */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Ville / Localité *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Ouagadougou">Ouagadougou</option>
                    <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
                    <option value="Koudougou">Koudougou</option>
                    <option value="Ouahigouya">Ouahigouya</option>
                    <option value="Banfora">Banfora</option>
                    <option value="Kaya">Kaya</option>
                    <option value="Fada N'Gourma">Fada N'Gourma</option>
                    <option value="Dédougou">Dédougou</option>
                    <option value="Tenkodogo">Tenkodogo</option>
                    <option value="Pouytenga">Pouytenga</option>
                    <option value="Autre">Autre localité...</option>
                  </select>
                </div>
                {city === 'Autre' && (
                  <input
                    type="text"
                    placeholder="Précisez votre ville ou village..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="w-full mt-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                )}
              </div>

              {/* 5. Code PIN de Sécurité */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Code PIN de Sécurité (4 chiffres) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={4}
                    placeholder="Ex: 1234"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-11 py-3 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl text-sm font-extrabold tracking-widest text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 block font-medium">
                  Ce code vous servira à vous reconnecter sur n'importe quel autre appareil.
                </span>
              </div>

              {/* Options Avancées : Numéros Mobile Money */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMobileMoney(!showMobileMoney)}
                  className="w-full text-left flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-50 p-3 rounded-2xl border border-emerald-200/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Numéros Mobile Money pour Relances (Optionnel)</span>
                  </div>
                  {showMobileMoney ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showMobileMoney && (
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-1 animate-in fade-in">
                    <div>
                      <span className="block text-[10px] font-black text-[#ff6600] uppercase mb-1">Orange</span>
                      <input
                        type="tel"
                        placeholder="70..."
                        value={omNumber}
                        onChange={(e) => setOmNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-orange-50/50 border border-orange-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black text-[#005baa] uppercase mb-1">Moov</span>
                      <input
                        type="tel"
                        placeholder="60..."
                        value={moovNumber}
                        onChange={(e) => setMoovNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black text-[#1dc4fe] uppercase mb-1">Wave</span>
                      <input
                        type="tel"
                        placeholder="70..."
                        value={waveNumber}
                        onChange={(e) => setWaveNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl text-xs font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton de validation */}
              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm shadow-xl shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2 mt-3 cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Création & Synchronisation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>VALIDER ET CRÉER MON ESPACE</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

