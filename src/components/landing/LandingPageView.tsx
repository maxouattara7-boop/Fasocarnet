import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  Users, 
  MessageCircle, 
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
  Store,
  Share2,
  PlusSquare,
  ArrowRight,
  Image as ImageIcon,
  Printer
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
      a: "Oui, à 100% ! Vous pouvez enregistrer vos encaissements, imprimer vos reçus de caisse et noter les dettes de vos clients en continu sans connexion 4G ni Wi-Fi. Dès que votre appareil capte du réseau, toutes vos données se synchronisent de manière transparente sur votre Cloud sécurisé."
    },
    {
      q: "Qu'est-ce que la technologie PWA (Application Web Progressive) ?",
      a: "La PWA est une technologie moderne et légère : c'est une application complète qui s'installe directement sur votre écran d'accueil sans passer par le Play Store ni l'App Store. Elle occupe moins de 5 Mo d'espace, fonctionne sur tout type d'appareil (Android, iPhone, PC) et reste 100% opérationnelle hors-ligne."
    },
    {
      q: "Comment installer FasoCarnet sur mon téléphone ou mon ordinateur ?",
      a: "C'est instantané en quelques secondes ! Cliquez simplement sur le bouton « Installer » ou « Connexion ». Sur Android, appuyez sur « Ajouter à l'écran d'accueil ». Sur iPhone, touchez le bouton Partager de Safari puis « Sur l'écran d'accueil ». Sur PC, cliquez sur l'icône Installer dans la barre d'adresse de Google Chrome ou Edge."
    },
    {
      q: "Puis-je imprimer sur une imprimante thermique Bluetooth ?",
      a: "Absolument ! FasoCarnet est directement compatible avec toutes les imprimantes de caisse thermiques 58mm et 80mm Bluetooth et USB. L'application permet également de partager des reçus élégants en format image directement sur WhatsApp en 1 clic."
    },
    {
      q: "Comment déployer FasoCarnet dans mon commerce ?",
      a: "La prise en main est immédiate dès la première ouverture. Pour les commerçants souhaitant un accompagnement personnalisé, notre équipe commerciale et technique est disponible pour vous assister dans la configuration de votre catalogue et de votre matériel d'impression."
    },
    {
      q: "Que se passe-t-il si je change ou perds mon téléphone ?",
      a: "Vos données sont protégées et synchronisées dans votre coffre Cloud. Sur votre nouvel appareil, il vous suffit de vous connecter avec votre numéro de téléphone et votre code PIN secret pour récupérer instantanément l'ensemble de votre boutique, vos ventes et vos créances."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 1. BARRE DE NAVIGATION MINIMALISTE ET HAUT DE GAMME                       */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo & Marque */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group select-none" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="group-hover:scale-105 transition-transform shrink-0">
              <Logo size="sm" showText={false} />
            </div>
            <div className="text-left">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-950 block leading-none font-display">
                Faso<span className="text-emerald-600">Carnet</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                Caisse &amp; Carnet Digital
              </span>
            </div>
          </div>

          {/* Liens de Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-emerald-700 transition-colors">Fonctionnalités</a>
            <a href="#pwa" className="hover:text-emerald-700 transition-colors">Application PWA</a>
            <button 
              type="button" 
              onClick={() => setShowFaqModal(true)} 
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Action Principale Header */}
          <div className="flex items-center space-x-2.5">
            {shopProfile ? (
              <button
                type="button"
                onClick={() => handleLaunchApp()}
                className="px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-2 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Store className="w-4 h-4 text-emerald-400" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{shopProfile.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleLaunchApp('login')}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-2 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Connexion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SECTION HÉROS : DESIGN ÉPURÉ, CLARTÉ & PROPORTIONS PRO                 */}
      {/* ========================================================================= */}
      <main className="flex-1">
        <section className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-10 sm:py-16 lg:py-20 border-b border-slate-200/70 overflow-hidden">
          
          {/* Lueur d'ambiance sobre */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              
              {/* Colonne Gauche : Argumentaire & CTA */}
              <div className="flex-1 text-center lg:text-left space-y-6">
                
                {/* Badge de statut sobre */}
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-white border border-slate-200 rounded-full shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-slate-800 font-bold text-xs">
                    Application PWA • 100% Hors-Ligne
                  </span>
                </div>

                {/* Titre d'Impact */}
                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.18] font-display">
                    La caisse &amp; carnet digital pour <span className="text-emerald-700">tous vos appareils</span>
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
                    La solution moderne et autonome pour gérer vos encaissements, suivre vos dettes clients et piloter votre activité en temps réel sans jamais dépendre d'une connexion Internet.
                  </p>
                </div>

                {/* Puces des Appareils Compatibles */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
                    <Smartphone className="w-3.5 h-3.5 text-slate-700" />
                    <span>Android</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
                    <Apple className="w-3.5 h-3.5 text-slate-700" />
                    <span>iPhone &amp; iPad</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
                    <Laptop className="w-3.5 h-3.5 text-slate-700" />
                    <span>PC Windows &amp; Mac</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs">
                    <WifiOff className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Zéro Connexion Requise</span>
                  </span>
                </div>

                {/* Boutons d'Action (Connexion & Installer) */}
                <div className="pt-2 space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                    
                    {shopProfile ? (
                      <button
                        type="button"
                        onClick={() => handleLaunchApp()}
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm sm:text-base shadow-md flex items-center justify-center space-x-2.5 active:scale-95 transition-all cursor-pointer text-center"
                      >
                        <Store className="w-5 h-5 text-emerald-400" />
                        <span>Accéder à ma Caisse ({shopProfile.name})</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLaunchApp('login')}
                          className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm sm:text-base shadow-sm flex items-center justify-center space-x-2.5 active:scale-95 transition-all cursor-pointer text-center"
                        >
                          <LogIn className="w-5 h-5 text-emerald-400" />
                          <span>Connexion</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleInstallPwa}
                          className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm sm:text-base shadow-sm flex items-center justify-center space-x-2.5 active:scale-95 transition-all cursor-pointer text-center"
                        >
                          <Download className="w-5 h-5" />
                          <span>Installer</span>
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium flex items-center justify-center lg:justify-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Version {CURRENT_APP_VERSION} • Moins de 5 Mo • Données 100% sécurisées en local</span>
                  </p>
                </div>



              </div>

              {/* Colonne Droite : Cadre Visuel Pro (Placeholder en attente de l'image) */}
              <div className="flex-1 w-full flex items-center justify-center pt-2 lg:pt-0">
                <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-[4/5] sm:aspect-[3/4] rounded-3xl sm:rounded-[36px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-2xl border border-slate-800 flex flex-col justify-between overflow-hidden group">
                  
                  {/* Lueur décorative discrète */}
                  <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* En-tête du device mock */}
                  <div className="relative z-10 flex items-center justify-between px-2 pt-1 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    </div>
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>FasoCarnet PWA</span>
                    </div>
                  </div>

                  {/* Zone d'accueil pour l'image de démonstration */}
                  <div className="relative z-10 flex-1 my-4 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center transition-colors">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                      <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-300">
                      Aperçu de l'Application
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-[220px] mt-1 leading-snug">
                      Emplacement réservé pour le visuel de l'interface
                    </p>
                  </div>

                  {/* Pied du device mock */}
                  <div className="relative z-10 px-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Mode Hors-Ligne</span>
                    <span className="text-emerald-400 font-bold">100% Opérationnel</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BANDEAU MODÈLES DE COMMERCE : COUVERTURE UNIVERSELLE                      */}
        {/* ========================================================================= */}
        <section className="py-6 border-b border-slate-200/70 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Conçu pour vos activités :
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 text-xs font-semibold text-slate-700">
              <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-2xs">
                Vente au détail &amp; Boutiques
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-2xs">
                Artisans, Services &amp; Ateliers
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 shadow-2xs">
                Dépôts, Matériaux &amp; Demi-gros
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-bold shadow-2xs">
                + Tout commerce de proximité
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. SECTION FONCTIONNALITÉS ESSENTIELLES                                   */}
        {/* ========================================================================= */}
        <section id="features" className="py-14 sm:py-20 bg-slate-50/50 border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight font-display">
                Tout ce qu'il vous faut pour piloter votre boutique
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
                Des outils simples, rapides et conçus pour la réalité des commerçants sur le terrain.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              
              {/* Carte 1 : Caisse Tactile */}
              <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-left hover:border-slate-300 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <Printer className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-950 font-display">Caisse Tactile &amp; Reçus</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Saisissez les ventes en quelques secondes, appliquez des remises, imprimez des tickets thermiques Bluetooth 58mm ou envoyez un reçu en image sur WhatsApp.
                </p>
              </div>

              {/* Carte 2 : Carnet de Dettes */}
              <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-left hover:border-slate-300 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-950 font-display">Carnet de Dettes &amp; Relance</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Dites adieu aux cahiers papier perdus. Enregistrez chaque crédit client avec échéance et envoyez un rappel de paiement propre et courtois sur WhatsApp.
                </p>
              </div>

              {/* Carte 3 : Bilan Journalier */}
              <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-left hover:border-slate-300 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-950 font-display">Bilan &amp; Bénéfice Net</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Connaissez avec certitude vos entrées, vos charges et votre bénéfice net à la fin de la journée sans calculatrice ni erreurs comptables.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. SECTION PWA : LES ATOUTS MAJEURS DE L'APPLICATION                     */}
        {/* ========================================================================= */}
        <section id="pwa" className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight font-display">
                Une technologie légère et performante qui s'installe en un seul clic
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">Tous vos appareils</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  S'adapte immédiatement sur Android, iPhone, tablette et ordinateur portable sans paramétrage complexe.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                  <WifiOff className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">100% Hors-Ligne</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enregistrez vos opérations même en cas de coupure de réseau ou dans des zones sans connexion Internet.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                  <Zap className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">Moins de 5 Mo</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ultra-légère, elle ne ralentit jamais votre téléphone et s'ouvre instantanément depuis votre écran d'accueil.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">Sauvegarde Cloud</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dès qu'une connexion est disponible, vos données sont synchronisées et protégées contre toute perte d'appareil.
                </p>
              </div>

            </div>

            {/* Bannière Guide d'Installation */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
              <div className="space-y-1.5 text-center md:text-left">
                <h3 className="text-lg sm:text-xl font-bold font-display text-white">
                  Installez FasoCarnet sur votre écran en 10 secondes
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  Accédez à votre caisse directement depuis votre écran d'accueil comme une application installée.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchApp('login')}
                  className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Connexion</span>
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ========================================================================= */}
      {/* 5. PIED DE PAGE ÉPURÉ ET PROFESSIONNEL                                     */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200/80 bg-white pt-10 sm:pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 pb-8 sm:pb-10 border-b border-slate-100 items-start">
          
          <div className="space-y-3 text-left">
            <div 
              className="flex items-center space-x-2.5 cursor-pointer inline-flex select-none"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Logo size="sm" showText={false} />
              <div>
                <span className="font-black text-slate-950 text-base font-display block leading-tight">
                  Faso<span className="text-emerald-600">Carnet</span>
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Caisse &amp; Carnet Digital
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              La solution digitale autonome et sécurisée pour gérer votre caisse et vos dettes clients au Burkina Faso et dans la sous-région.
            </p>
          </div>

          <div className="space-y-2.5 text-left">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              ACCÈS &amp; INFORMATIONS
            </h4>
            <ul className="space-y-2 text-slate-600 font-medium text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLaunchApp('login')}
                  className="hover:text-emerald-700 transition-colors text-left cursor-pointer font-bold text-slate-900"
                >
                  Connexion
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="hover:text-emerald-700 transition-colors text-left cursor-pointer"
                >
                  Guide d'installation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowFaqModal(true)}
                  className="hover:text-emerald-700 transition-colors text-left cursor-pointer"
                >
                  Foire Aux Questions (FAQ)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowCguModal(true)}
                  className="hover:text-emerald-700 transition-colors text-left cursor-pointer"
                >
                  Conditions Générales d'Utilisation
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-left sm:col-span-2 md:col-span-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              CONTACT &amp; ASSISTANCE
            </h4>
            <div className="space-y-2">
              <a
                href="https://wa.me/22672990310"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-emerald-700 hover:text-emerald-800 font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp : +226 72 99 03 10</span>
              </a>
              <div className="text-slate-400 text-[11px]">
                Support technique disponible 7j/7 de 8h à 20h
              </div>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-[11px] text-slate-400">
          <span>© {new Date().getFullYear()} FasoCarnet. Tous droits réservés.</span>
          <span>Application PWA Multi-Supports</span>
        </div>
      </footer>

      {/* BOUTON FLOTTANT WHATSAPP */}
      <a
        href="https://wa.me/22672990310?text=Bonjour,%20j'aimerais%20avoir%20des%20informations%20ou%20de%20l'aide%20pour%20installer%20l'application%20FasoCarnet."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 p-3.5 sm:p-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-xl shadow-[#25D366]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Discuter sur WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-white text-white" />
      </a>

      {/* ========================================================================= */}
      {/* MODALE : GUIDE D'INSTALLATION PWA PAR APPAREIL                            */}
      {/* ========================================================================= */}
      {showPwaInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 space-y-5 text-slate-900 shadow-2xl relative">
            
            <button
              type="button"
              onClick={() => setShowPwaInstallModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-900 shadow-2xs">
                <Download className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
                Installer FasoCarnet
              </h3>
              <p className="text-xs text-slate-500">
                Ajoutez l'icône sur votre appareil pour y accéder directement
              </p>
            </div>

            {/* Onglets selon l'appareil */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setPwaPlatformTab('android')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pwaPlatformTab === 'android' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setPwaPlatformTab('ios')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pwaPlatformTab === 'ios' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Apple className="w-3.5 h-3.5 text-slate-900" />
                <span>iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setPwaPlatformTab('pc')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  pwaPlatformTab === 'pc' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-slate-700" />
                <span>PC &amp; Mac</span>
              </button>
            </div>

            {/* Contenu selon l'onglet */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              {pwaPlatformTab === 'android' && (
                <div className="space-y-2.5 text-slate-700">
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Ouvrez le site dans le navigateur <strong>Google Chrome</strong> sur votre téléphone.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Appuyez sur les <strong>3 petits points (⋮)</strong> en haut à droite du navigateur.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>. L'icône apparaît directement comme une vraie application !</span>
                  </p>
                </div>
              )}

              {pwaPlatformTab === 'ios' && (
                <div className="space-y-2.5 text-slate-700">
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Ouvrez le site dans le navigateur <strong>Safari</strong> sur votre iPhone ou iPad.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Appuyez sur le bouton <strong>Partager</strong> en bas de l'écran (carré avec flèche vers le haut <Share2 className="w-3.5 h-3.5 inline text-slate-700" />).</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-slate-700" />) puis validez <strong>« Ajouter »</strong>.</span>
                  </p>
                </div>
              )}

              {pwaPlatformTab === 'pc' && (
                <div className="space-y-2.5 text-slate-700">
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Ouvrez le site dans <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> sur votre ordinateur.</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Dans la barre d'adresse tout en haut à droite, cliquez sur la petite icône d'ordinateur avec flèche (<strong>« Installer l'application »</strong>).</span>
                  </p>
                  <p className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
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
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Connexion</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPwaInstallModal(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-3xl flex flex-col text-slate-900 shadow-2xl relative overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">Foire Aux Questions (FAQ)</h3>
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
                        <ChevronUp className="w-4 h-4 text-emerald-700 shrink-0" />
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
                className="text-emerald-700 hover:text-emerald-800 font-bold text-xs inline-flex items-center space-x-1.5"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-3xl flex flex-col text-slate-900 shadow-2xl relative overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">Conditions Générales d'Utilisation</h3>
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
                  Les présentes CGU régissent l'utilisation de l'application FasoCarnet (PWA Web et Mobile), dédiée à la caisse tactile, au suivi des dettes et créances clients, à l'impression thermique Bluetooth et à la génération de reçus WhatsApp.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Propriété et Confidentialité des Données</h4>
                <p>
                  Le commerçant reste le propriétaire exclusif de l'intégralité de ses données commerciales (articles, prix, ventes, fichiers clients, dettes). FasoCarnet applique un chiffrement strict des codes PIN et garantit l'isolation complète des données de chaque commerce.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">3. Fonctionnement Hors-Ligne &amp; Synchronisation</h4>
                <p>
                  L'application est conçue pour fonctionner en continu sans connexion Internet. Lorsque l'appareil est connecté à Internet, les données sont synchronisées de manière sécurisée avec le serveur Cloud pour permettre la restauration en cas de changement d'appareil.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">4. Conditions d'Accès et Support</h4>
                <p>
                  L'accès aux services FasoCarnet est accordé selon les modalités d'adhésion convenues avec le service commercial. L'équipe d'assistance assure le bon fonctionnement technique et la continuité du service.
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
