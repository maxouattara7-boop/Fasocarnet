import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ShieldCheck, Lock, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Logo } from '../common/Logo';

export const Header: React.FC = () => {
  const { shopProfile, setIsLocked, isOnline, isSyncing, syncNow } = useAppStore();

  return (
    <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3.5 py-2.5 shadow-md sticky top-0 z-30 border-b border-emerald-700/40 backdrop-blur-md">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Logo size="sm" showText={false} />
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-xs sm:text-sm leading-tight truncate max-w-[170px] text-white tracking-tight">
              {shopProfile?.name || 'FasoCarnet'}
            </h1>
            <div className="flex items-center space-x-1.5 text-[10px] text-emerald-200/90 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ring-2 ring-emerald-900/50 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span className="truncate">{isOnline ? 'En ligne • Synchronisé' : '100% Hors-ligne'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {/* Bouton Indicateur de synchronisation Cloud */}
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 shadow-xs active:scale-95 ${
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
              className="p-1.5 bg-emerald-800/80 hover:bg-emerald-700 rounded-lg text-emerald-100 border border-emerald-600/40 transition-all active:scale-95"
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
  );
};
