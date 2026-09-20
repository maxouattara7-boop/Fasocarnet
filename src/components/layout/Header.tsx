import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ShieldCheck, Lock, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Logo } from '../common/Logo';

export const Header: React.FC = () => {
  const { shopProfile, setIsLocked, isOnline, isSyncing, syncNow } = useAppStore();

  return (
    <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-4 py-3 shadow-md sticky top-0 z-30 border-b border-emerald-700/40 backdrop-blur-md">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Logo size="sm" showText={false} />
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base leading-tight truncate max-w-[180px] text-white tracking-tight">
              {shopProfile?.name || 'FasoCarnet'}
            </h1>
            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-200/90 font-medium">
              <span className={`w-2 h-2 rounded-full ring-2 ring-emerald-900/50 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span className="truncate">{isOnline ? 'En ligne • Synchronisé' : '100% Hors-ligne'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bouton Indicateur de synchronisation Cloud */}
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center space-x-1.5 shadow-xs active:scale-95 ${
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
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span className="hidden sm:inline">Synchro...</span>
              </>
            ) : isOnline ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Réseau</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Local</span>
              </>
            )}
          </button>

          {/* Verrouillage par Code PIN */}
          {shopProfile?.pinCode && (
            <button
              onClick={() => setIsLocked(true)}
              className="p-2 bg-emerald-800/80 hover:bg-emerald-700 rounded-xl text-emerald-100 border border-emerald-600/40 transition-all active:scale-95"
              title="Verrouiller l'application"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          <div className="bg-emerald-900/60 p-1.5 rounded-xl text-emerald-300 border border-emerald-700/40 hidden xs:flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
