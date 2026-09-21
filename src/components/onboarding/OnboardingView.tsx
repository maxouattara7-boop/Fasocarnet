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
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Zap,
  BookOpen,
  WifiOff
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { BurkinaFlag } from '../common/BurkinaFlag';

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

  // Champs Création d'espace
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Ouagadougou');
  const [customCity, setCustomCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
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
        orangeMoneyNumber: phone.trim()
      });
    } catch (err: any) {
      console.error(err);
      setRegisterError(err.message || "Erreur lors de la création de l'espace.");
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
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white flex flex-col justify-between p-3.5 sm:p-4 select-none">
      <div className="max-w-sm w-full mx-auto flex flex-col h-full justify-between">
        
        {/* Barre supérieure : Retour & Logo */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            data-testid="btn-back-welcome"
            onClick={() => setViewStep('welcome')}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded-xl border border-emerald-700/60 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </button>
          
          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-800/60 rounded-full text-[10px] font-bold text-emerald-200 border border-emerald-600/40">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>FasoCarnet</span>
          </div>
        </div>

        {/* Titre & Sélecteur d'onglets (Connexion / Créer son espace) */}
        <div className="space-y-1.5 pt-0.5 text-center">
          <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
            Se connecter ou créer son espace
          </h2>
          <p className="text-[11px] font-semibold text-emerald-300/80">
            {authMode === 'login' ? 'Connexion à votre Espace' : 'Création de votre Espace'}
          </p>

          <div className="bg-emerald-900/80 p-1 rounded-xl flex border border-emerald-700/60 shadow-md">
            <button
              type="button"
              data-testid="tab-login"
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Connexion</span>
            </button>

            <button
              type="button"
              data-testid="tab-register"
              onClick={() => {
                setAuthMode('register');
                setRegisterError('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-emerald-500 text-emerald-950 shadow-sm'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Créer un Espace</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ONGLET 1 : SE CONNECTER                                   */}
        {/* ======================================================== */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="bg-white text-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xl space-y-2.5 border border-emerald-100 my-auto animate-in fade-in duration-150">
            {loginError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-1.5 text-xs font-semibold text-red-700 animate-in shake">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Numéro de téléphone */}
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                required
                placeholder="Numéro de téléphone (Ex: 70 12 34 56) *"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            {/* Code PIN */}
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showLoginPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={8}
                placeholder="Code PIN de sécurité • • • •"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-8.5 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold tracking-widest text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowLoginPin(!showLoginPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
              >
                {showLoginPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSyncing}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
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
          <form onSubmit={handleRegisterSubmit} className="bg-white text-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xl space-y-2 border border-emerald-100 my-auto animate-in fade-in duration-150">
            {registerError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-1.5 text-xs font-semibold text-red-700 animate-in shake">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            {/* 1. Nom du commerce */}
            <div className="relative">
              <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="Nom du commerce (Ex: Alimentation La Grâce) *"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            {/* 2. Numéro de téléphone WhatsApp */}
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                required
                placeholder="Numéro WhatsApp (Ex: 70 12 34 56) *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            {/* 3. Ville */}
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all"
              />
            )}

            {/* 4. Code PIN de Sécurité */}
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={4}
                placeholder="Code PIN à 4 chiffres (Ex: 1234) *"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-8.5 pr-9 py-2 bg-emerald-50/40 border border-emerald-200/80 rounded-xl text-xs font-extrabold tracking-widest text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 5. Email optionnel */}
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                placeholder="Adresse email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            {/* Bouton de validation */}
            <button
              type="submit"
              disabled={isSyncing}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VALIDER ET CRÉER MON ESPACE</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-[10px] text-emerald-300/70 text-center pb-1">
          <span>Données 100% sécurisées et conservées hors-ligne</span>
        </div>

      </div>
    </div>
  );
};

