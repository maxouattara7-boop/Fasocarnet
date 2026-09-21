import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2, 
  WifiOff, 
  Receipt, 
  Users, 
  MessageCircle, 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  X,
  ShieldCheck,
  Zap,
  Printer,
  FileText,
  HelpCircle
} from 'lucide-react';
import { Logo } from '../common/Logo';

interface LandingPageViewProps {
  onOpenApp?: () => void;
}

const APK_DOWNLOAD_URL = '/downloads/FasoCarnet-v1.2.0-Android.apk';

export const LandingPageView: React.FC<LandingPageViewProps> = () => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showCguModal, setShowCguModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "L'application fonctionne-t-elle sans connexion Internet ?",
      a: "Oui, à 100% ! Vous pouvez enregistrer des ventes, imprimer des reçus et noter des dettes toute la journée sans aucune connexion 4G ni Wi-Fi. Dès que vous avez du réseau, vos données sont automatiquement sauvegardées sur le Cloud de façon sécurisée."
    },
    {
      q: "Comment installer l'APK sur mon téléphone Android ?",
      a: "C'est très simple en 3 étapes : 1. Cliquez sur le bouton 'Télécharger l'APK'. 2. Ouvrez le fichier téléchargé et appuyez sur 'Autoriser l'installation'. 3. Ouvrez FasoCarnet, créez votre boutique et commencez à encaisser immédiatement."
    },
    {
      q: "Combien coûte FasoCarnet après les 10 jours d'essai gratuit ?",
      a: "L'abonnement est de seulement 2 000 FCFA par mois (moins de 70 FCFA par jour !). Vous pouvez payer simplement par Orange Money, Moov Money ou Wave directement depuis votre téléphone."
    },
    {
      q: "Puis-je imprimer sur une imprimante thermique Bluetooth ?",
      a: "Absolument ! FasoCarnet est 100% compatible avec toutes les imprimantes thermiques de caisse 58mm et 80mm Bluetooth et USB, ainsi que le partage d'image de reçu par WhatsApp."
    },
    {
      q: "Que se passe-t-il si je perds ou change de téléphone ?",
      a: "Vos données sont sauvegardées en sécurité. Il vous suffira de réinstaller l'application sur votre nouveau téléphone et d'entrer votre numéro de téléphone et votre code PIN pour tout récupérer instantanément."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. BARRE DE NAVIGATION RESPONSIVE                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Logo size="sm" showText={false} />
            <div className="text-left">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 block leading-none font-display">
                Faso<span className="text-emerald-600">Carnet</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-0.5">
                Caisse & Carnet Digital
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Fonctionnalités</a>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <a
              href={APK_DOWNLOAD_URL}
              download="FasoCarnet-v1.2.0-Android.apk"
              onClick={() => setShowDownloadModal(true)}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md sm:shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 sm:space-x-2 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Télécharger l'APK</span>
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SECTION HÉROS SPLIT-SCREEN (TEXTE + MOCKUP SMARTPHONE)                 */}
      {/* ========================================================================= */}
      <main className="flex-1">
        <section className="bg-gradient-to-b from-emerald-50/50 via-white to-slate-50/60 py-8 sm:py-14 lg:py-20 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
              
              {/* Colonne Gauche : Argumentaire & Téléchargement Direct */}
              <div className="flex-1 text-center lg:text-left space-y-5 sm:space-y-6">
                <div className="inline-flex items-center px-3.5 sm:px-4 py-1.5 bg-white rounded-full border border-emerald-200 shadow-xs">
                  <span className="text-emerald-700 font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Édition Android (APK Direct)</span>
                  </span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] font-display">
                    Télécharger l'application <span className="text-emerald-600">FasoCarnet</span>
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
                    La caisse enregistreuse tactile, gestion des dettes clients et reçus WhatsApp conçue sur mesure pour les commerçants. Fonctionne à 100% sans connexion Internet.
                  </p>
                </div>

                {/* Bloc Téléchargement Principal */}
                <div className="pt-1 sm:pt-2 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4">
                    <a
                      href={APK_DOWNLOAD_URL}
                      download="FasoCarnet-v1.2.0-Android.apk"
                      onClick={() => setShowDownloadModal(true)}
                      className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm sm:text-base shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2.5 sm:space-x-3 active:scale-95 transition-transform cursor-pointer group text-center"
                    >
                      <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform stroke-[2.5]" />
                      <span>Télécharger l'APK Android</span>
                    </a>
                  </div>

                  <p className="text-xs text-slate-500 font-medium flex items-center justify-center lg:justify-start space-x-1.5 sm:space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Version 1.2.0 • 10 jours gratuits • 100% Sécurisé</span>
                  </p>
                </div>

                {/* Puces de réassurance rapides */}
                <div className="pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs font-semibold text-slate-700 text-left">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% Fonctionnel Hors-Ligne</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Calculateur avec vibreur & voix</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reçus WhatsApp & Tickets Bluetooth</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Suivi & Relance Dettes en 1 clic</span>
                  </div>
                </div>
              </div>

              {/* Colonne Droite : Mockup Smartphone mettant en valeur l'interface */}
              <div className="flex-1 w-full flex items-center justify-center pt-4 lg:pt-0">
                <div className="relative w-full max-w-[280px] xs:max-w-[310px] sm:max-w-[340px]">
                  {/* Halo d'arrière plan */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-transparent rounded-[48px] blur-2xl pointer-events-none" />

                  {/* Châssis Smartphone */}
                  <div className="relative bg-slate-900 border-[10px] border-slate-900 rounded-[44px] shadow-2xl overflow-hidden ring-1 ring-slate-800">
                    {/* Encoche Smartphone */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-32 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
                      <div className="w-10 h-1.5 bg-slate-800 rounded-full" />
                    </div>

                    {/* Interface Intérieure FasoCarnet */}
                    <div className="bg-slate-950 text-white p-4 pt-7 space-y-4 select-none">
                      
                      {/* Header Caisse */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <Logo size="sm" showText={false} />
                            <span className="font-black text-sm text-white font-display">Faso<span className="text-emerald-400">Carnet</span></span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold block">Boutique : Alimentation Faso</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-full">
                          ● EN LIGNE
                        </span>
                      </div>

                      {/* Écran Affichage du Total */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-right space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Calcul en cours : 5 000 + 7 500
                        </span>
                        <div className="text-2xl font-black text-white font-display tracking-tight flex items-baseline justify-end space-x-1">
                          <span className="text-emerald-400">12 500</span>
                          <span className="text-xs text-slate-400">FCFA</span>
                        </div>
                      </div>

                      {/* Clavier Tactile Caisse Rapide */}
                      <div className="grid grid-cols-4 gap-2 text-center text-sm font-black">
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">7</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">8</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">9</button>
                        <button type="button" className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl">÷</button>

                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">4</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">5</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">6</button>
                        <button type="button" className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl">×</button>

                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">1</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">2</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">3</button>
                        <button type="button" className="p-2.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl">-</button>

                        <button type="button" className="p-2.5 bg-red-950/70 border border-red-800/50 text-red-300 rounded-xl">C</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">0</button>
                        <button type="button" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-white">00</button>
                        <button type="button" className="p-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl">+</button>
                      </div>

                      {/* Boutons d'Action Rapide Caisse */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center space-x-1 text-[11px] font-bold text-slate-300">
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ticket / Reçu</span>
                        </div>
                        <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-xl flex items-center justify-center space-x-1 text-[11px] font-black shadow-md">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Encaisser</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. LES 4 PILIERS CLÉS (RESPONSIVE MOBILE & TABLETTE)                      */}
        {/* ========================================================================= */}
        <section id="features" className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-display tracking-tight">
              Pourquoi choisir <span className="text-emerald-600">FasoCarnet</span> ?
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm lg:text-base max-w-xl mx-auto font-medium">
              4 atouts majeurs pensés pour répondre aux réalités du commerce quotidien.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Carte 1 : Caisse & Calcul */}
            <div className="bg-white border border-slate-200/90 hover:border-emerald-500/50 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-center group">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                    <Calculator className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    ⚡ Calculateur
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors font-display">
                    Caisse & Calcul Instantané
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Encaissez à la chaîne sans bloquer la file d'attente. Vos montants s'additionnent automatiquement.
                  </p>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium text-left">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Retour vibreur & vocal tactile</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Calcul automatique de monnaie</span>
                </div>
              </div>
            </div>

            {/* Carte 2 : Reçus WhatsApp & Thermiques */}
            <div className="bg-white border border-slate-200/90 hover:border-teal-500/50 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-center group">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                    <Receipt className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                    🧾 Reçu Pro
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 group-hover:text-teal-600 transition-colors font-display">
                    Reçus WhatsApp & Impression
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Valorisez votre image professionnelle avec des reçus modernes imprimés ou envoyés sur smartphone.
                  </p>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium text-left">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Envoi d'image HD sur WhatsApp</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Bluetooth 58mm / 80mm thermique</span>
                </div>
              </div>
            </div>

            {/* Carte 3 : Carnet Dettes & Crédits */}
            <div className="bg-white border border-slate-200/90 hover:border-amber-500/50 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-center group">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    💰 Zéro Oubli
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors font-display">
                    Carnet des Dettes & Crédits
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Finis les cahiers perdus. Suivez chaque client et récupérez votre argent beaucoup plus rapidement.
                  </p>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium text-left">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Relance WhatsApp en 1 clic</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Historique clair des acomptes</span>
                </div>
              </div>
            </div>

            {/* Carte 4 : 100% Hors-Ligne */}
            <div className="bg-white border border-slate-200/90 hover:border-sky-500/50 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-center group">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                    <WifiOff className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
                    📶 Hors-ligne
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 group-hover:text-sky-600 transition-colors font-display">
                    Autonomie Totale Sans Réseau
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Continuez d'enregistrer vos ventes même sans connexion 4G, en zone blanche ou en coupure de courant.
                  </p>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium text-left">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Zéro ralentissement ni blocage</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Sauvegarde cloud dès retour 4G</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 4. PIED DE PAGE ÉPURÉ ET HARMONISÉ                                       */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-slate-50/90 pt-10 sm:pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 pb-8 sm:pb-10 border-b border-slate-200 items-start">
          {/* Colonne 1 : Marque & Logo */}
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
                  Caisse & Carnet Digital
                </span>
              </div>
            </div>
          </div>

          {/* Colonne 2 : RESSOURCES */}
          <div className="space-y-2.5 text-left">
            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">
              RESSOURCES
            </h4>
            <ul className="space-y-2 text-slate-600 font-medium text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setShowCguModal(true)}
                  className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                >
                  Termes et Conditions d'utilisation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowFaqModal(true)}
                  className="hover:text-emerald-600 transition-colors text-left cursor-pointer"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : CONTACT & SUPPORT */}
          <div className="space-y-2.5 text-left sm:col-span-2 md:col-span-1">
            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">
              CONTACT & SUPPORT
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

        {/* Barre de copyright centrée */}
        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-center text-[10px] sm:text-[11px] text-slate-400">
          <span>© {new Date().getFullYear()} FasoCarnet. Tous droits réservés.</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span>Burkina Faso & Sous-région</span>
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
      {/* MODALE 1 : TÉLÉCHARGEMENT APK & GUIDE EXPRESS                             */}
      {/* ========================================================================= */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 text-slate-900 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pt-1 sm:pt-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                <Download className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">Téléchargement en cours...</h3>
              <p className="text-xs text-emerald-700 font-bold">
                Le fichier <code>FasoCarnet-v1.2.0-Android.apk</code> se télécharge sur votre smartphone.
              </p>
              <div className="pt-1">
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 underline font-semibold inline-flex items-center space-x-1"
                >
                  <span>Si le téléchargement ne démarre pas, cliquez ici</span>
                </a>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2.5 sm:space-y-3 text-xs">
              <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px] sm:text-[11px]">Finalisez l'installation en 3 étapes :</span>
              <div className="space-y-2 text-slate-600">
                <p className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span>Ouvrez le fichier téléchargé depuis votre barre de notification.</span>
                </p>
                <p className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span>Si demandé, autorisez l'installation des sources inconnues dans les paramètres.</span>
                </p>
                <p className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span>Cliquez sur <strong>"Installer"</strong> puis lancez votre application !</span>
                </p>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="w-full py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                Compris !
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 2 : FOIRE AUX QUESTIONS (FAQ)                                      */}
      {/* ========================================================================= */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl flex flex-col text-slate-900 shadow-2xl relative overflow-hidden">
            {/* Header Modale */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">Foire Aux Questions (FAQ)</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Toutes les réponses à vos questions sur FasoCarnet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-full bg-white border border-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu FAQ déroulant */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 sm:space-y-3 flex-1">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="w-full p-3.5 sm:p-5 text-left flex items-center justify-between space-x-3 sm:space-x-4 cursor-pointer hover:bg-slate-100/60"
                    >
                      <span className="font-bold text-xs sm:text-sm text-slate-900">{faq.q}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 sm:px-5 sm:pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-2.5 sm:pt-3 animate-in fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Modale */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">Une autre question ? Écrivez-nous sur WhatsApp.</span>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="w-full sm:w-auto px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 3 : CONDITIONS GÉNÉRALES D'UTILISATION (CGU)                       */}
      {/* ========================================================================= */}
      {showCguModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl flex flex-col text-slate-900 shadow-2xl relative overflow-hidden">
            {/* Header Modale CGU */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">Conditions Générales d'Utilisation</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Dernière mise à jour : Février 2026 • FasoCarnet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCguModal(false)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-full bg-white border border-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps du texte des CGU */}
            <div className="p-4 sm:p-8 overflow-y-auto space-y-5 sm:space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed flex-1">
              
              <div className="p-3.5 sm:p-4 bg-emerald-50 border-l-4 border-emerald-600 rounded-r-xl space-y-1">
                <span className="font-bold text-emerald-900 block">Note d'information :</span>
                <p className="text-xs text-emerald-800">
                  En installant et utilisant l'application FasoCarnet, vous acceptez les présentes règles d'utilisation conçues pour protéger vos données de ventes et sécuriser la gestion de votre boutique.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Article 1 : Objet & Champ d'application</h4>
                <p>
                  Les présentes CGU régissent l'utilisation de l'application mobile FasoCarnet (APK Android et Web), dédiée à la caisse tactile, au calcul de ventes, au suivi des dettes et créances clients, à l'impression thermique Bluetooth et à la génération de reçus WhatsApp.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Article 2 : Fonctionnement 100% Hors-Ligne & Cloud</h4>
                <p>
                  FasoCarnet fonctionne selon l'architecture « Offline-First ». Vos données de caisse, produits et dettes sont stockées localement sur votre téléphone et restent 100% accessibles sans connexion Internet. Dès la détection d'un réseau 4G ou Wi-Fi, une sauvegarde chiffrée est automatiquement envoyée sur le Cloud.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Article 3 : Propriété Exclusive des Données du Commerçant</h4>
                <p>
                  Le Commerçant est le seul et unique propriétaire légitime de ses données (ventes, tarifs, listes de clients, carnets de dettes). FasoCarnet s'engage solennellement à <strong>ne jamais vendre, céder ni exploiter les données commerciales</strong> des utilisateurs à des fins publicitaires ou tierces.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Article 4 : Essai Gratuit & Formules d'Abonnement</h4>
                <p>
                  Toute nouvelle boutique bénéficie de <strong>10 jours d'essai gratuit et sans engagement</strong>. À l'issue de cette période, le service est accessible par abonnement mensuel (2 000 FCFA), semestriel (10 000 FCFA) ou annuel (20 000 FCFA), payable en toute sécurité via Orange Money, Moov Money ou Wave.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Article 5 : Sécurité du Compte & Code PIN</h4>
                <p>
                  L'accès à l'espace commerçant est protégé par un numéro de téléphone et un code PIN secret. Le commerçant est responsable de la préservation de son code PIN. En cas de changement ou de perte de téléphone, ces identifiants permettent de restaurer l'intégralité des données sur le nouvel appareil.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Article 6 : Droit Applicable & Support Client</h4>
                <p>
                  Les présentes conditions sont soumises au droit commercial des États membres de l'OHADA et de l'espace UEMOA. Pour toute assistance, contestation ou information, notre support WhatsApp officiel est joignable au <strong>+226 72 99 03 10</strong>.
                </p>
              </div>
            </div>

            {/* Footer Modale CGU */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">© {new Date().getFullYear()} FasoCarnet • Tous droits réservés</span>
              <button
                type="button"
                onClick={() => setShowCguModal(false)}
                className="w-full sm:w-auto px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
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
