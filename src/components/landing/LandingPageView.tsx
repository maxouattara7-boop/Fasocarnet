import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  WifiOff, 
  Users, 
  MessageCircle, 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  X,
  ShieldCheck,
  Zap,
  FileText,
  HelpCircle,
  LogIn,
  Download,
  Smartphone,
  Laptop,
  Apple,
  Sparkles,
  Store,
  Share2,
  PlusSquare,
  ArrowRight
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { CURRENT_APP_VERSION } from '../../services/updateService';
import { useAppStore } from '../../store/appStore';

interface LandingPageViewProps {
  onOpenApp?: (mode?: 'login' | 'register') => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onOpenApp }) => {
  const { shopProfile } = useAppStore();
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showCguModal, setShowCguModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [pwaPlatformTab, setPwaPlatformTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleLaunchApp = (mode?: 'login' | 'register') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_web_app_opened', 'true');
    }
    if (onOpenApp) {
      onOpenApp(mode);
    } else {
      window.location.href = mode ? `/?mode=app&auth=${mode}` : '/?mode=app';
    }
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.warn('PWA prompt error:', err);
      }
    }
    setShowPwaInstallModal(true);
  };

  const faqs = [
    {
      q: "L'application fonctionne-t-elle sans connexion Internet ?",
      a: "Oui, à 100% ! Vous pouvez enregistrer vos encaissements, imprimer vos reçus de caisse et noter les crédits de vos clients toute la journée sans aucune connexion 4G ni Wi-Fi. Dès que votre appareil capte du réseau, toutes vos données sont sauvegardées en arrière-plan sur le Cloud sécurisé."
    },
    {
      q: "Qu'est-ce que la version PWA (Application Web Progressive) ?",
      a: "La PWA est la technologie la plus moderne et polyvalente : c'est une véritable application qui s'installe directement sur votre écran d'accueil sans passer par le Play Store ni l'App Store. Elle est ultra-légère (moins de 5 Mo), s'adapte à tous les téléphones (Android, iPhone) et ordinateurs (PC, Mac), et fonctionne intégralement hors-ligne."
    },
    {
      q: "Comment installer FasoCarnet sur mon téléphone ou mon ordinateur ?",
      a: "C'est instantané en 1 clic ! Cliquez sur 'Installer l'Application' ou 'Se Connecter'. Sur Android, confirmez simplement 'Ajouter à l'écran d'accueil'. Sur iPhone, appuyez sur le bouton Partager de Safari puis 'Sur l'écran d'accueil'. Sur PC, cliquez sur l'icône Installer dans la barre d'adresse de Chrome ou Edge."
    },
    {
      q: "Combien coûte FasoCarnet après les 10 jours d'essai gratuit ?",
      a: "L'abonnement est de seulement 2 000 FCFA par mois (moins de 70 FCFA par jour !). Nous proposons aussi la formule 6 mois à 10 000 FCFA avec saisie gratuite de tout votre catalogue d'articles par notre équipe directement dans votre boutique, ou 1 an à 20 000 FCFA avec 2 mois offerts. Paiement simple par Orange Money, Moov Money ou Wave."
    },
    {
      q: "Puis-je imprimer sur une imprimante thermique Bluetooth ?",
      a: "Absolument ! FasoCarnet est 100% compatible avec toutes les imprimantes de caisse thermiques 58mm et 80mm Bluetooth et USB, et génère également des reçus propres à partager sur WhatsApp en 1 clic."
    },
    {
      q: "Que se passe-t-il si je perds, casse ou change de téléphone ?",
      a: "Aucune perte de données ! Vos articles, vos ventes et vos dettes sont sauvegardés dans votre espace Cloud sécurisé. Sur votre nouveau téléphone ou ordinateur, il vous suffit de saisir votre numéro de téléphone et votre code PIN secret pour tout récupérer immédiatement."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. BARRE DE NAVIGATION RESPONSIVE                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo & Marque */}
          <div 
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="group-hover:scale-105 transition-transform shrink-0">
              <Logo size="sm" showText={false} />
            </div>
            <div className="text-left">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 block leading-none font-display">
                Faso<span className="text-emerald-600">Carnet</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-0.5">
                Caisse &amp; Carnet Digital
              </span>
            </div>
          </div>

          {/* Liens Desktop */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Fonctionnalités</a>
            <a href="#pwa" className="hover:text-emerald-600 transition-colors">Version PWA Universelle</a>
            <a href="#tarifs" className="hover:text-emerald-600 transition-colors">Tarifs</a>
            <button 
              type="button" 
              onClick={() => setShowFaqModal(true)} 
              className="hover:text-emerald-600 transition-colors font-medium cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Boutons d'Action dans la barre */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {shopProfile ? (
              <button
                type="button"
                onClick={() => handleLaunchApp()}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 active:scale-95 transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
              >
                <Store className="w-4 h-4 text-amber-300" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{shopProfile.name}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleLaunchApp('login')}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Connexion</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('register')}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 active:scale-95 transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
                >
                  <Sparkles className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="hidden xs:inline">10 Jours Gratuits</span>
                  <span className="xs:hidden">Essai</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SECTION HÉROS : FOCUS VERSION PWA MULTI-SUPPORTS & CONNEXION          */}
      {/* ========================================================================= */}
      <main className="flex-1">
        <section className="bg-gradient-to-b from-emerald-50/60 via-white to-slate-50/70 py-8 sm:py-14 lg:py-20 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
              
              {/* Colonne Gauche : Présentation PWA & Actions */}
              <div className="flex-1 text-center lg:text-left space-y-5 sm:space-y-6">
                
                {/* Badge d'accroche PWA */}
                <div className="inline-flex items-center px-3.5 sm:px-4 py-1.5 bg-white rounded-full border border-emerald-300 shadow-xs">
                  <span className="text-emerald-800 font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Application PWA Universelle • 100% Hors-Ligne</span>
                  </span>
                </div>

                {/* Titre Principal */}
                <div className="space-y-3 sm:space-y-4">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] font-display">
                    La caisse &amp; carnet digital pour <span className="text-emerald-600">tous vos appareils</span>
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
                    Conçue sur-mesure pour les commerçants du Burkina et de la sous-région. S'installe en 1 clic sur votre écran d'accueil sans passer par le Play Store, ultra-légère et <strong>100% opérationnelle sans connexion Internet</strong>.
                  </p>
                </div>

                {/* Puces des Supports Universels */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Android</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                    <Apple className="w-3.5 h-3.5 text-slate-800" />
                    <span>iPhone &amp; iPad</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                    <Laptop className="w-3.5 h-3.5 text-blue-600" />
                    <span>PC Windows &amp; Mac</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800">
                    <WifiOff className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Zéro Connexion Requise</span>
                  </span>
                </div>

                {/* Bloc Actions : Connexion & Installation PWA */}
                <div className="pt-2 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                    
                    {shopProfile ? (
                      <button
                        type="button"
                        onClick={() => handleLaunchApp()}
                        className="w-full sm:w-auto px-8 sm:px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-base sm:text-lg shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-3 active:scale-95 transition-all cursor-pointer group text-center"
                      >
                        <Store className="w-5 h-5 text-amber-300" />
                        <span>Accéder à ma Caisse ({shopProfile.name})</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <>
                        {/* Bouton 1 : Connexion Immédiate */}
                        <button
                          type="button"
                          onClick={() => handleLaunchApp('login')}
                          className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-sm sm:text-base shadow-xl flex items-center justify-center space-x-2.5 active:scale-95 transition-all cursor-pointer group text-center"
                        >
                          <LogIn className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>Se Connecter à mon Espace</span>
                        </button>

                        {/* Bouton 2 : Démarrer / Installer PWA */}
                        <button
                          type="button"
                          onClick={handleInstallPwa}
                          className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 active:scale-95 transition-all cursor-pointer text-center"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                          <span>Installer sur mon Écran (PWA)</span>
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium flex items-center justify-center lg:justify-start space-x-1.5 sm:space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Version {CURRENT_APP_VERSION} • 10 jours gratuits sans engagement • Moins de 5 Mo d'espace</span>
                  </p>
                </div>

                {/* 4 Puces de réassurance rapides */}
                <div className="pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs font-semibold text-slate-700 text-left">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Caisse tactile &amp; Reçus WhatsApp en 3 clics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Carnet de dettes avec relance automatique</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Bilan journalier et bénéfice net du soir</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-appareils : Synchronisation temps-réel</span>
                  </div>
                </div>
              </div>

              {/* Colonne Droite : Mockup Interactif Responsive */}
              <div className="flex-1 w-full flex items-center justify-center pt-4 lg:pt-0">
                <div className="relative w-full max-w-[280px] xs:max-w-[310px] sm:max-w-[340px]">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-transparent rounded-[48px] blur-2xl pointer-events-none" />

                  <div className="relative bg-slate-900 border-[10px] border-slate-900 rounded-[44px] shadow-2xl overflow-hidden ring-1 ring-slate-800">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-32 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
                      <div className="w-10 h-1.5 bg-slate-800 rounded-full" />
                    </div>

                    <div className="bg-slate-950 text-white p-4 pt-7 space-y-4 select-none">
                      
                      {/* Header Caisse */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <Logo size="sm" showText={false} />
                            <span className="font-black text-sm text-white font-display">Faso<span className="text-emerald-400">Carnet</span></span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold block">Mode PWA Hors-Ligne</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-full">
                          ● ACTIF
                        </span>
                      </div>

                      {/* Écran Calcul */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-right space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Vente en cours : 5 000 + 7 500
                        </span>
                        <div className="text-2xl font-black text-white font-display tracking-tight flex items-baseline justify-end space-x-1">
                          <span className="text-emerald-400">12 500</span>
                          <span className="text-xs text-slate-400">FCFA</span>
                        </div>
                      </div>

                      {/* Clavier Tactile Caisse Rapide */}
                      <div className="grid grid-cols-4 gap-2 text-center text-sm font-black">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">7</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">8</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">9</div>
                        <div className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl">÷</div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">4</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">5</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">6</div>
                        <div className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl">×</div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">1</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">2</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">3</div>
                        <div className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl">-</div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">C</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">0</div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">00</div>
                        <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-xl font-black">+</div>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleLaunchApp('login')}
                          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95 transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 fill-slate-950" />
                          <span>ENCAISSER DIRECTEMENT</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. SECTION PWA : LES 4 SUPER-POUVOIRS DU MODÈLE UNIVERSEL                */}
        {/* ========================================================================= */}
        <section id="pwa" className="py-12 sm:py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-3.5 py-1.5 rounded-full inline-block">
                ⚡ TECHNOLOGIE PROGRESSIVE WEB APP (PWA)
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display">
                Pourquoi la PWA est le meilleur choix pour votre commerce ?
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed font-normal">
                Plus besoin d'encombrer la mémoire de votre téléphone avec des fichiers lourds ou des mises à jour compliquées.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-black text-base text-slate-900 font-display">Polyvalence Totale</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fonctionne à l'identique sur Android, iPhone (iOS), tablette tactile, ordinateur portable et PC fixe.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black">
                  <WifiOff className="w-6 h-6" />
                </div>
                <h3 className="font-black text-base text-slate-900 font-display">100% Hors-Ligne</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Continuez à enregistrer vos ventes même sans connexion 4G, en zone blanche ou pendant les coupures de réseau.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-black text-base text-slate-900 font-display">Moins de 5 Mo</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ne sature pas votre stockage. S'ouvre instantanément comme une application native sans ralentissement.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-black text-base text-slate-900 font-display">Sauvegarde Automatique</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dès que le réseau revient, vos données se synchronisent automatiquement. Si vous changez de téléphone, rien n'est perdu.
                </p>
              </div>

            </div>

            {/* Bannière Guide d'Installation */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-xl sm:text-2xl font-black font-display text-white">
                  Installez FasoCarnet sur votre écran en 10 secondes
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200 max-w-xl">
                  Accédez à votre caisse directement depuis votre écran d'accueil avec une vraie icône d'application.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Voir le Guide d'Installation</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchApp('login')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all"
                >
                  <LogIn className="w-4 h-4 text-emerald-300" />
                  <span>Se Connecter</span>
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. SECTION FONCTIONNALITÉS CLÉS                                           */}
        {/* ========================================================================= */}
        <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full inline-block">
                💼 FONCTIONNALITÉS TERRAIN
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display">
                Tout ce qu'il vous faut pour gérer votre boutique
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              
              <div className="bg-slate-50 p-6 sm:p-7 rounded-3xl border border-slate-200 space-y-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <Calculator className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 font-display">Caisse Tactile &amp; Reçus</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tapez le montant ou choisissez l'article dans votre catalogue. En 1 clic, imprimez un ticket thermique ou partagez une image HD sur WhatsApp.
                </p>
              </div>

              <div className="bg-slate-50 p-6 sm:p-7 rounded-3xl border border-slate-200 space-y-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 font-display">Carnet de Dettes &amp; Relance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Finis les cahiers perdus. Enregistrez chaque crédit client avec l'échéance et envoyez un rappel courtois directement sur le WhatsApp du client.
                </p>
              </div>

              <div className="bg-slate-50 p-6 sm:p-7 rounded-3xl border border-slate-200 space-y-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 font-display">Bilan &amp; Bénéfice Net</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chaque soir, sans calcul compliqué, connaissez votre chiffre d'affaires, vos charges déduites et votre vrai bénéfice net de la journée.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. SECTION TARIFS CLAIRS & TRANSPARENTS                                   */}
        {/* ========================================================================= */}
        <section id="tarifs" className="py-12 sm:py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-3.5 py-1.5 rounded-full inline-block">
                🏷️ TARIFS ACCESSIBLES
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display">
                Des forfaits adaptés à toutes les boutiques
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                10 jours d'essai gratuit sans engagement avec toutes les fonctionnalités débloquées.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              
              {/* Formule 1 Mois */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 font-display">1 Mois</h3>
                    <p className="text-xs text-slate-500">Pour tester en toute liberté</p>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-display">
                    2 000 <span className="text-xs text-slate-500 font-medium">FCFA / mois</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Caisse tactile &amp; Reçus WhatsApp</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Carnet de dettes &amp; alertes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Fonctionnement 100% hors-ligne</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('register')}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all text-center"
                >
                  Démarrer l'Essai Gratuit
                </button>
              </div>

              {/* Formule 6 Mois (Recommandée avec Catalogue Clé en Main) */}
              <div className="bg-gradient-to-b from-amber-500/10 via-white to-amber-50/20 p-6 sm:p-8 rounded-3xl border-2 border-amber-500 flex flex-col justify-between space-y-6 shadow-xl relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  💥 OFFRE SPÉCIALE CLÉ EN MAIN
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 font-display">6 Mois Sérénité</h3>
                    <p className="text-xs text-amber-700 font-bold">Catalogue complet saisi par notre équipe !</p>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-display">
                    10 000 <span className="text-xs text-slate-500 font-medium">FCFA / 6 mois</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-amber-200">
                    <li className="flex items-start space-x-2 font-bold text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Notre équipe vient s'asseoir dans votre boutique et enregistre tous vos articles !</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Toutes les fonctionnalités débloquées</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Synchronisation Cloud &amp; Multi-supports</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('register')}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/30 cursor-pointer active:scale-95 transition-all text-center"
                >
                  Choisir la Formule Clé en Main
                </button>
              </div>

              {/* Formule 1 An */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 font-display">1 An Maxi Sérénité</h3>
                    <p className="text-xs text-emerald-700 font-bold">2 mois offerts + Support prioritaire</p>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-display">
                    20 000 <span className="text-xs text-slate-500 font-medium">FCFA / an</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center space-x-2 font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Saisie intégrale du catalogue offerte</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Assistance prioritaire WhatsApp 7j/7</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Sauvegardes garanties en continu</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchApp('register')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all text-center"
                >
                  Souscrire 1 An (20 000 F)
                </button>
              </div>

            </div>

          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 6. PIED DE PAGE HARMONISÉ                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-slate-50/90 pt-10 sm:pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 pb-8 sm:pb-10 border-b border-slate-200 items-start">
          
          <div className="space-y-2.5 text-left">
            <div 
              className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer inline-flex"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Logo size="sm" showText={false} />
              <div>
                <span className="font-black text-slate-900 text-base sm:text-lg font-display block leading-tight">
                  Faso<span className="text-emerald-600">Carnet</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Caisse &amp; Carnet Digital
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              La solution digitale autonome et sécurisée pour gérer votre caisse et vos dettes clients au Burkina Faso.
            </p>
          </div>

          <div className="space-y-2.5 text-left">
            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">
              RESSOURCES &amp; ACCÈS
            </h4>
            <ul className="space-y-2 text-slate-600 font-medium text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLaunchApp('login')}
                  className="hover:text-emerald-600 transition-colors text-left cursor-pointer font-bold text-slate-800"
                >
                  Se Connecter à mon Espace
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                >
                  Guide d'installation PWA
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowFaqModal(true)}
                  className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                >
                  Foire Aux Questions (FAQ)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowCguModal(true)}
                  className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                >
                  Conditions Générales d'Utilisation
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-left sm:col-span-2 md:col-span-1">
            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">
              CONTACT &amp; SUPPORT
            </h4>
            <div className="space-y-1.5">
              <a
                href="https://wa.me/22672990310"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp : +226 72 99 03 10</span>
              </a>
              <div className="text-slate-400 text-[10px] sm:text-[11px]">
                Support technique disponible 7j/7 de 8h à 20h
              </div>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-center text-[10px] sm:text-[11px] text-slate-400">
          <span>© {new Date().getFullYear()} FasoCarnet. Tous droits réservés.</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span>Version PWA Universelle Multi-Supports</span>
        </div>
      </footer>

      {/* BOUTON FLOTTANT WHATSAPP */}
      <a
        href="https://wa.me/22672990310?text=Bonjour,%20j'aimerais%20avoir%20des%20informations%20ou%20de%20l'aide%20pour%20installer%20l'application%20FasoCarnet."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 p-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl shadow-[#25D366]/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer group"
        title="Discuter sur WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-white text-white" />
      </a>

      {/* ========================================================================= */}
      {/* MODALE : GUIDE D'INSTALLATION PWA PAR APPAREIL                            */}
      {/* ========================================================================= */}
      {showPwaInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 space-y-5 text-slate-900 shadow-2xl relative">
            
            <button
              type="button"
              onClick={() => setShowPwaInstallModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 shadow-sm">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                Installer FasoCarnet sur votre écran
              </h3>
              <p className="text-xs text-slate-500">
                Ajoutez l'icône directement sur votre appareil pour l'utiliser en 1 clic
              </p>
            </div>

            {/* Onglets selon l'appareil */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setPwaPlatformTab('android')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pwaPlatformTab === 'android' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setPwaPlatformTab('ios')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pwaPlatformTab === 'ios' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Apple className="w-3.5 h-3.5 text-slate-900" />
                <span>iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setPwaPlatformTab('pc')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pwaPlatformTab === 'pc' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-blue-600" />
                <span>PC &amp; Mac</span>
              </button>
            </div>

            {/* Contenu selon l'onglet */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              {pwaPlatformTab === 'android' && (
                <div className="space-y-2.5 text-slate-700">
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Ouvrez le site <strong>FasoCarnet</strong> dans le navigateur <strong>Google Chrome</strong> sur votre téléphone.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Appuyez sur les <strong>3 petits points (⋮)</strong> en haut à droite du navigateur.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>. L'icône apparaît directement comme une vraie application !</span>
                  </p>
                </div>
              )}

              {pwaPlatformTab === 'ios' && (
                <div className="space-y-2.5 text-slate-700">
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Ouvrez le site <strong>FasoCarnet</strong> dans le navigateur <strong>Safari</strong> sur votre iPhone ou iPad.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Appuyez sur le bouton <strong>Partager</strong> en bas de l'écran (carré avec une flèche qui pointe vers le haut <Share2 className="w-3.5 h-3.5 inline text-blue-600" />).</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-slate-700" />) puis validez <strong>« Ajouter »</strong>.</span>
                  </p>
                </div>
              )}

              {pwaPlatformTab === 'pc' && (
                <div className="space-y-2.5 text-slate-700">
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Ouvrez le site dans <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> sur votre ordinateur.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Dans la barre d'adresse tout en haut à droite, cliquez sur la petite icône d'ordinateur avec flèche (<strong>« Installer l'application »</strong>).</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>L'application s'ouvre dans sa propre fenêtre autonome et place un raccourci sur votre bureau !</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPwaInstallModal(false);
                  handleLaunchApp('login');
                }}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4 text-emerald-200" />
                <span>Accéder / Se Connecter</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPwaInstallModal(false)}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE FAQ                                                                */}
      {/* ========================================================================= */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-3xl flex flex-col text-slate-900 shadow-2xl relative overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">Foire Aux Questions (FAQ)</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Toutes les réponses à vos questions sur FasoCarnet PWA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 text-left text-xs sm:text-sm">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-3.5 sm:p-4 text-left font-bold text-slate-900 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/60 transition-colors cursor-pointer"
                    >
                      <span className="pr-3 leading-snug">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 text-slate-600 text-xs sm:text-sm leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <a
                href="https://wa.me/22672990310"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs inline-flex items-center space-x-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Poser une autre question sur WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE CGU                                                                */}
      {/* ========================================================================= */}
      {showCguModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-3xl flex flex-col text-slate-900 shadow-2xl relative overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">Termes et Conditions d'Utilisation</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Conditions Générales de Service FasoCarnet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCguModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed text-left flex-1">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Objet du Service</h4>
                <p>
                  Les présentes CGU régissent l'utilisation de l'application progressive FasoCarnet (PWA Web et Mobile), dédiée à la caisse tactile, au calcul de ventes, au suivi des dettes et créances clients, à l'impression thermique Bluetooth et à la génération de reçus WhatsApp.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Propriété et Confidentialité des Données</h4>
                <p>
                  Le commerçant reste le propriétaire exclusif de l'intégralité de ses données commerciales (produits, prix, ventes, fichiers clients, dettes). FasoCarnet applique un chiffrement strict des codes PIN et garantit l'isolation complète des données de chaque commerce.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">3. Fonctionnement Hors-Ligne &amp; Synchronisation</h4>
                <p>
                  L'application est conçue pour fonctionner en continu sans connexion Internet. Lorsque l'appareil est connecté à Internet, les données sont synchronisées de manière sécurisée avec le serveur Cloud pour permettre la restauration en cas de perte d'appareil.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">4. Tarification et Abonnement</h4>
                <p>
                  L'application propose un essai gratuit de 10 jours à compter de la création du compte. Au-delà, l'accès continu aux fonctionnalités de caisse requiert un abonnement valide (1 mois à 2 000 FCFA, 6 mois à 10 000 FCFA ou 1 an à 20 000 FCFA).
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowCguModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
