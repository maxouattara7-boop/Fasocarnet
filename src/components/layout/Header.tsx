import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ShieldCheck, Lock, Cloud, CloudOff, RefreshCw, HelpCircle } from 'lucide-react';
import { Logo } from '../common/Logo';
import { HelpGuideModal } from '../common/HelpGuideModal';

export const Header: React.FC = () => {
  const { shopProfile, setIsLocked, isOnline, isSyncing, syncNow } = useAppStore();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3.5 py-2.5 shadow-md sticky top-0 z-30 border-b border-emerald-700/40 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <Logo size="sm" showText={false} />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-emerald-200/90 font-semibold block leading-tight truncate">
                Bienvenue dans votre espace
              </span>
              <h1 className="font-extrabold text-xs sm:text-sm leading-tight truncate text-white tracking-tight font-display">
                {shopProfile?.name || 'FasoCarnet'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Bouton Guide & Aide */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 bg-emerald-800/80 hover:bg-emerald-700 rounded-lg text-emerald-100 border border-emerald-600/40 transition-all active:scale-95 cursor-pointer"
              title="Centre d'aide & Guide d'utilisation"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-200" />
            </button>

            {/* Bouton Indicateur de synchronisation Cloud */}
            <button
              type="button"
              onClick={() => syncNow()}
              disabled={isSyncing}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 shadow-xs active:scale-95 cursor-pointer ${
                isSyncing
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 animate-pulse'
                  : isOnline
                    ? 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border-emerald-600/40'
                    : 'bg-amber-950/80 text-amber-200 border-amber-500/40'
              }`}
              title="Cliquer pour forcer la synchronisation réseau"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-300" />
                  <span className="hidden xs:inline">Synchro...</span>
                </>
              ) : isOnline ? (
                <>
                  <Cloud className="w-3 h-3 text-emerald-300" />
                  <span className="hidden xs:inline">Réseau</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3 h-3 text-amber-300" />
                  <span className="hidden xs:inline">Local</span>
                </>
              )}
            </button>

            {/* Verrouillage par Code PIN */}
            {shopProfile?.pinCode && (
              <button
                onClick={() => setIsLocked(true)}
                className="p-1.5 bg-emerald-800/80 hover:bg-emerald-700 rounded-lg text-emerald-100 border border-emerald-600/40 transition-all active:scale-95 cursor-pointer"
                title="Verrouiller l'application"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="bg-emerald-900/60 p-1.5 rounded-lg text-emerald-300 border border-emerald-700/40 hidden sm:flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </header>

      {/* Modal Centre d'Aide & Guide Rapide */}
      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};
