import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'application fonctionne déjà en mode PWA autonome (déjà installée)
    const isStandalone = (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as any)?.standalone === true ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'));

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Détecter si on est sur iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIosDevice(isIos);

    // 3. Écouter l'événement standard PWA pour Chrome, Edge, Android, Windows, Mac
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('fasocarnet_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIosDevice) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('fasocarnet_pwa_dismissed', 'true');
  };

  // Ne rien afficher si déjà installée ou fermée pour cette session
  if (isInstalled || isDismissed) {
    return null;
  }

  // N'afficher que si le navigateur supporte l'installation ou qu'on est sur iOS
  if (!deferredPrompt && !isIosDevice) {
    return null;
  }

  return (
    <>
      {/* Bannière flottante d'installation PWA */}
      <aside aria-label="Installation de l'application" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-emerald-500/40 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              {isIosDevice ? <Smartphone className="w-5 h-5 stroke-[2.5]" /> : <Download className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black font-display text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>Installer FasoCarnet</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-mono uppercase">
                  Gratuit
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                Accès direct sur votre écran d'accueil et utilisation hors-ligne
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer font-display flex items-center justify-center space-x-1.5"
          >
            <PlusSquare className="w-4 h-4" />
            <span>Installer l'application</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-2 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl hover:bg-white/5 transition-all cursor-pointer"
          >
            Plus tard
          </button>
        </div>
      </aside>

      {/* Modale guide pour iOS Safari (iPhone / iPad) */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm font-display text-white">Installer sur iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start space-x-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  1
                </span>
                <p>
                  Dans Safari, appuyez sur le bouton de <strong>Partage</strong> (<Share2 className="w-3.5 h-3.5 inline text-emerald-400" /> en bas de votre écran).
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  2
                </span>
                <p>
                  Faites défiler vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />).
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  3
                </span>
                <p>
                  Appuyez sur <strong>« Ajouter »</strong> en haut à droite. L'icône FasoCarnet apparaît immédiatement sur votre écran d'accueil !
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
