import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Zap,
  BookOpen,
  WifiOff,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { BurkinaFlag } from '../common/BurkinaFlag';
import { syncService } from '../../db/services/syncService';

export const OnboardingView: React.FC = () => {
  const { loginWithPhoneAndPin, createShop, isSyncing } = useAppStore();

  // Écran en cours : 'welcome' (Présentation express) ou 'auth' (Connexion / Création)
  const [viewStep, setViewStep] = useState<'welcome' | 'auth'>('welcome');

  // Mode dans l'écran auth : 'login' ou 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Champs Connexion
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginFailedAttempts, setLoginFailedAttempts] = useState(0);
  const [loginLockoutSeconds, setLoginLockoutSeconds] = useState(0);

  // Décompte anti-bruteforce pour la connexion
  useEffect(() => {
    if (loginLockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLoginLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLoginError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loginLockoutSeconds]);

  // Champs Création d'espace
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Ouagadougou');
  const [customCity, setCustomCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [ifu, setIfu] = useState('');
  const [rccm, setRccm] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [duplicateAccountDetected, setDuplicateAccountDetected] = useState<{ exists: boolean; shopName?: string; phone?: string } | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLockoutSeconds > 0) return;
    setLoginError('');

    try {
      const res = await loginWithPhoneAndPin(loginPhone, loginPin);
      if (!res.success) {
        const nextFailed = loginFailedAttempts + 1;
        setLoginFailedAttempts(nextFailed);
        if (nextFailed >= 5) {
          setLoginLockoutSeconds(120);
          setLoginError('5 tentatives de connexion échouées. Compte temporairement bloqué pendant 2 minutes.');
        } else if (nextFailed >= 3) {
          setLoginLockoutSeconds(30);
          setLoginError('3 tentatives de connexion échouées. Veuillez patienter 30 secondes.');
        } else {
          setLoginError(res.message || `Identifiants incorrects (${nextFailed}/3 tentatives).`);
        }
      } else {
        setLoginFailedAttempts(0);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erreur lors de la connexion.');
    }
  };

  const handlePhoneBlur = async () => {
    const clean = phone.trim().replace(/\D/g, '');
    if (clean.length < 8) {
      setDuplicateAccountDetected(null);
      return;
    }
    setIsCheckingPhone(true);
    try {
      const check = await syncService.checkPhoneRegistered(phone.trim());
      if (check.exists) {
        setDuplicateAccountDetected(check);
        setRegisterError('');
      } else {
        setDuplicateAccountDetected(null);
      }
    } catch {
      // Ignorer
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setDuplicateAccountDetected(null);

    if (!shopName.trim()) {
      setRegisterError('Veuillez renseigner le nom de votre commerce.');
      return;
    }

    if (!phone.trim()) {
      setRegisterError('Veuillez renseigner votre numéro WhatsApp.');
      return;
    }

    // 1. Vérification d'unicité : un numéro ne peut pas créer un deuxième compte
    try {
      const phoneCheck = await syncService.checkPhoneRegistered(phone.trim());
      if (phoneCheck.exists) {
        setDuplicateAccountDetected(phoneCheck);
        return;
      }
    } catch (err) {
      console.warn('Vérification unicité numéro:', err);
    }

    if (!pinCode.trim() || pinCode.trim().length < 4) {
      setRegisterError('Veuillez définir un code PIN à 4 chiffres pour sécuriser votre espace.');
      return;
    }

    const selectedCity = city === 'Autre' ? (customCity.trim() || 'Burkina Faso') : city;

    try {
      await createShop({
        name: shopName.trim(),
        description: shopDescription.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: selectedCity,
        pinCode: pinCode.trim(),
        currency: 'FCFA',
        orangeMoneyNumber: phone.trim(),
        ifu: ifu.trim() || undefined,
        rccm: rccm.trim() || undefined,
        logo: logo || undefined
      });
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('déjà associé')) {
        setDuplicateAccountDetected({ exists: true, shopName: shopName.trim(), phone: phone.trim() });
      } else {
        setRegisterError(err.message || "Erreur lors de la création de l'espace.");
      }
    }
  };

  // =========================================================================
  // 1. PAGE D'ACCUEIL & PRÉSENTATION EXPRESS DE L'APPLICATION MOBILE
  // =========================================================================
  if (viewStep === 'welcome') {
    return (
      <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-5 select-none">
        {/* En-tête / Logo & Accroche */}
        <div className="flex flex-col items-center text-center pt-2 sm:pt-4 space-y-2 animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 rounded-2xl border border-emerald-500/30 shadow-xl backdrop-blur-sm">
            <Logo size="md" showText={false} />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-400/30 rounded-full text-[10px] font-bold text-emerald-300">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>La Solution Digitale des Commerçants</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none font-display">
            FasoCarnet <span className="text-emerald-400">Mobile</span>
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed max-w-xs px-1">
            Votre caisse, vos crédits clients et vos bilans en poche. <span className="text-amber-300 font-bold">Simple, rapide et 100% hors-ligne.</span>
          </p>
        </div>

        {/* Grille des 3 Atouts Clés (Titres sur une seule ligne) */}
        <div className="w-full max-w-sm mx-auto space-y-2 py-1 animate-in fade-in slide-in-from-bottom-3 duration-600">
          {/* 1. Caisse Tactile Express */}
          <div className="bg-slate-900/85 border border-emerald-500/20 p-2.5 sm:p-3 rounded-xl flex items-center space-x-3 text-left backdrop-blur-md shadow-md">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-black text-white uppercase tracking-wider truncate whitespace-nowrap">
                Caisse Tactile Express
              </h3>
              <p className="text-[10px] text-slate-300 truncate">
                Encaissez en 3 secondes avec reçus WhatsApp
              </p>
            </div>
          </div>

          {/* 2. Carnet de Dettes Intelligent */}
          <div className="bg-slate-900/85 border border-emerald-500/20 p-2.5 sm:p-3 rounded-xl flex items-center space-x-3 text-left backdrop-blur-md shadow-md">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-black text-white uppercase tracking-wider truncate whitespace-nowrap">
                Carnet de Dettes Intelligent
              </h3>
              <p className="text-[10px] text-slate-300 truncate">
                Suivez les crédits clients et relancez en 1 clic
              </p>
            </div>
          </div>

          {/* 3. 100% Hors-Ligne */}
          <div className="bg-slate-900/85 border border-emerald-500/20 p-2.5 sm:p-3 rounded-xl flex items-center space-x-3 text-left backdrop-blur-md shadow-md">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-black text-white uppercase tracking-wider truncate whitespace-nowrap">
                100% Hors-Ligne
              </h3>
              <p className="text-[10px] text-slate-300 truncate">
                Fonctionne partout, sans coupure ni besoin de réseau
              </p>
            </div>
          </div>
        </div>

        {/* Bouton d'action Continuer & Bas de page */}
        <div className="w-full max-w-sm mx-auto pb-2 sm:pb-3 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <button
            type="button"
            data-testid="btn-continue"
            onClick={() => setViewStep('auth')}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2 border border-emerald-400/30 cursor-pointer"
          >
            <span>Continuer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-1.5">
            <BurkinaFlag size="sm" />
            <span>Conçu pour les commerçants du Burkina Faso</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. PAGE DE CONNEXION / CRÉATION D'ESPACE
  // =========================================================================
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-5 select-none">
      <div className="max-w-sm w-full mx-auto flex flex-col h-full justify-between">
        
        {/* Barre supérieure : Retour & Logo */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            data-testid="btn-back-welcome"
            onClick={() => setViewStep('welcome')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded-xl border border-emerald-700/60 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </button>
          
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-800/60 rounded-full text-[10px] font-bold text-emerald-200 border border-emerald-600/40">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>FasoCarnet</span>
          </div>
        </div>

        {/* Titre & Sélecteur d'onglets (Connexion / Créer son espace) */}
        <div className="space-y-1.5 text-center">
          <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
            Se connecter ou créer son espace
          </h2>
          <p className="text-xs font-semibold text-emerald-300/80">
            {authMode === 'login' ? 'Connexion à votre Espace' : 'Création de votre Espace'}
          </p>

          <div className="bg-emerald-900/70 backdrop-blur p-1 rounded-2xl flex border border-emerald-700/50 shadow-inner">
            <button
              type="button"
              data-testid="tab-login"
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
                setDuplicateAccountDetected(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-emerald-950 shadow-sm'
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
                setDuplicateAccountDetected(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-emerald-500 text-emerald-950 shadow-sm'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Créer un Espace</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ONGLET 1 : SE CONNECTER                                   */}
        {/* ======================================================== */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="bg-white text-slate-900 p-5 rounded-3xl shadow-2xl border border-emerald-100 my-auto space-y-4 animate-in fade-in duration-200">
            {loginError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs font-semibold text-red-700 animate-in shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Numéro de téléphone */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                required
                placeholder="Numéro de téléphone (Ex: 70 12 34 56) *"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Code PIN */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showLoginPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={8}
                placeholder="Code PIN de sécurité • • • •"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-11 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-extrabold tracking-widest text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
              />
              <button
                type="button"
                onClick={() => setShowLoginPin(!showLoginPin)}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSyncing || loginLockoutSeconds > 0}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loginLockoutSeconds > 0 ? (
                <span>Patientez {loginLockoutSeconds}s...</span>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SE CONNECTER</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* ONGLET 2 : CRÉER SON ESPACE                              */}
        {/* ======================================================== */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="bg-white text-slate-900 p-4 sm:p-5 rounded-3xl shadow-2xl border border-emerald-100 my-auto space-y-3 sm:space-y-3.5 animate-in fade-in duration-200">
            {duplicateAccountDetected ? (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 text-xs text-amber-900 animate-in fade-in shadow-sm">
                <div className="flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-amber-800 font-black text-xs">
                    !
                  </div>
                  <div>
                    <p className="font-bold text-amber-950 text-xs">Ce numéro possède déjà un compte !</p>
                    <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                      Le commerce <strong className="text-amber-950">« {duplicateAccountDetected.shopName || 'existant'} »</strong> est déjà enregistré avec ce numéro. Un même numéro ne peut pas créer plusieurs comptes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginPhone(duplicateAccountDetected.phone || phone);
                    setAuthMode('login');
                    setDuplicateAccountDetected(null);
                    setRegisterError('');
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>SE CONNECTER AVEC MON CODE PIN</span>
                </button>
              </div>
            ) : registerError ? (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs font-semibold text-red-700 animate-in shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{registerError}</span>
              </div>
            ) : null}

            {/* 1. Nom du commerce */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <Store className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                placeholder="Nom du commerce (Ex: Alimentation La Grâce) *"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Slogan / Activité (Optionnel) */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Slogan / Activité (Ex: Impression tout support, Prêt-à-porter...)"
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* 2. Numéro de téléphone WhatsApp */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                required
                placeholder="Numéro WhatsApp (Ex: 70 12 34 56) *"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (duplicateAccountDetected) setDuplicateAccountDetected(null);
                }}
                onBlur={handlePhoneBlur}
                className={`w-full pl-12 pr-10 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal ${
                  duplicateAccountDetected ? 'border-amber-400 ring-2 ring-amber-300/30' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {isCheckingPhone && (
                <div className="absolute right-3.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
              )}
            </div>

            {/* 3. Ville */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <MapPin className="w-5 h-5" />
              </div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-12 pr-10 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all appearance-none cursor-pointer"
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
              <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {city === 'Autre' && (
              <input
                type="text"
                placeholder="Précisez votre ville ou village..."
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all"
              />
            )}

            {/* 4. Code PIN de Sécurité */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={4}
                placeholder="Code PIN à 4 chiffres (Ex: 1234) *"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-11 py-2.5 sm:py-3 bg-emerald-50/30 hover:bg-emerald-50/60 focus:bg-white border border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-extrabold tracking-widest text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* 5. Email optionnel */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                placeholder="Adresse email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* 6. Accordéon Informations Légales & Logo (Optionnel) */}
            <div className="border border-emerald-200/60 rounded-2xl overflow-hidden bg-emerald-50/20">
              <button
                type="button"
                onClick={() => setShowBusinessInfo(!showBusinessInfo)}
                className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>N° IFU, RCCM & Logo (Optionnel)</span>
                </div>
                {showBusinessInfo ? (
                  <ChevronUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-emerald-600" />
                )}
              </button>

              {showBusinessInfo && (
                <div className="p-3 border-t border-emerald-100 space-y-2.5 animate-in fade-in duration-150">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Ces mentions légales et votre logo figureront directement sur l'en-tête de vos reçus et factures.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-600 mb-0.5">N° IFU</label>
                      <input
                        type="text"
                        placeholder="Ex: 00012345A"
                        value={ifu}
                        onChange={(e) => setIfu(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-600 mb-0.5">N° RCCM</label>
                      <input
                        type="text"
                        placeholder="Ex: BF-OUA-01-2024"
                        value={rccm}
                        onChange={(e) => setRccm(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Logo uploader */}
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-600 mb-1">Logo de l'entreprise</label>
                    {logo ? (
                      <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-slate-200">
                        <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-100 bg-slate-50" />
                        <span className="text-[11px] font-bold text-emerald-700 flex-1">Logo sélectionné</span>
                        <button
                          type="button"
                          onClick={() => setLogo(null)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center space-x-2 p-2 bg-white border border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl cursor-pointer text-xs font-bold text-emerald-700 transition-colors">
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
                </div>
              )}
            </div>

            {/* Bouton de validation */}
            <button
              type="submit"
              disabled={isSyncing}
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-1"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>VALIDER ET CRÉER MON ESPACE</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-[11px] text-emerald-300/70 text-center pb-1 font-medium">
          <span>Données 100% sécurisées et conservées hors-ligne</span>
        </div>

      </div>
    </div>
  );
};

