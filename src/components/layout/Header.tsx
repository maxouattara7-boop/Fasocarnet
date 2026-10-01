import React, { useState } from 'react';
import { useAppStore, ActiveTab } from '../../store/appStore';
import { ShieldCheck, Lock, Cloud, CloudOff, RefreshCw, HelpCircle, FileText, Calculator, BookOpen, BarChart3, Settings, LogOut, AlertTriangle } from 'lucide-react';
import { Logo } from '../common/Logo';
import { HelpGuideModal } from '../common/HelpGuideModal';

export const Header: React.FC = () => {
  const { shopProfile, setIsLocked, isOnline, isSyncing, hasPendingOfflineData, syncNow, activeTab, setActiveTab, logout, setIsLandingOpen } = useAppStore();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const desktopNavItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pos', label: 'Caisse', icon: <Calculator className="w-4 h-4 shrink-0" /> },
    { id: 'debts', label: 'Carnet de Dettes', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
    { id: 'reports', label: 'Bilan & Ventes', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
    { id: 'invoices', label: 'Factures & Devis', icon: <FileText className="w-4 h-4 shrink-0" /> },
    { id: 'settings', label: 'Ma Boutique', icon: <Settings className="w-4 h-4 shrink-0" /> },
  ];

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3.5 sm:px-6 py-2.5 sm:py-3 shadow-md sticky top-0 z-30 border-b border-emerald-700/40 backdrop-blur-md">
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Nom de la boutique cliquable vers la page vitrine */}
          <div 
            onClick={() => setIsLandingOpen(true)}
            className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 cursor-pointer group hover:opacity-90 active:scale-95 transition-all select-none"
            title="Cliquez pour voir la page vitrine FasoCarnet"
          >
            <div className="group-hover:scale-105 transition-transform shrink-0">
              <Logo size="sm" showText={false} />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-emerald-200/90 group-hover:text-emerald-100 font-semibold block leading-tight truncate transition-colors">
                Bienvenue dans votre espace
              </span>
              <h1 className="font-extrabold text-sm sm:text-lg leading-tight truncate text-white group-hover:text-amber-300 tracking-tight font-display transition-colors">
                {shopProfile?.name || 'FasoCarnet'}
              </h1>
            </div>
          </div>

          {/* Navigation Bureau Desktop (Visible sur tablette et PC) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 bg-emerald-950/60 p-1.5 rounded-2xl border border-emerald-700/50 shadow-inner shrink-0">
            {desktopNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold text-xs lg:text-[13px] flex items-center space-x-1.5 lg:space-x-2 transition-all cursor-pointer font-display whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 font-black scale-102'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <span className={isActive ? 'text-slate-950' : 'text-emerald-300'}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Outils & Actions à l'extrême droite */}
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
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 shadow-xs active:scale-95 cursor-pointer relative ${
                isSyncing
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 animate-pulse'
                  : hasPendingOfflineData
                    ? 'bg-amber-600/90 hover:bg-amber-600 text-white border-amber-400/60 animate-pulse'
                    : isOnline
                      ? 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border-emerald-600/40'
                      : 'bg-amber-950/80 text-amber-200 border-amber-500/40'
              }`}
              title={hasPendingOfflineData ? "Données hors-ligne en attente — cliquer pour synchroniser maintenant" : "Cliquer pour forcer la synchronisation réseau"}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-300" />
                  <span className="hidden xs:inline">Synchro...</span>
                </>
              ) : hasPendingOfflineData ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-white" />
                  <span className="hidden xs:inline">En attente</span>
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
                type="button"
                onClick={() => setIsLocked(true)}
                className="p-1.5 bg-emerald-800/80 hover:bg-emerald-700 rounded-lg text-emerald-100 border border-emerald-600/40 transition-all active:scale-95 cursor-pointer"
                title="Verrouiller l'application"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Badge de sécurité */}
            <div className="bg-emerald-900/60 p-1.5 rounded-lg text-emerald-300 border border-emerald-700/40 hidden sm:flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>

            {/* BOUTON SE DÉCONNECTER (À l'extrême droite en haut) */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 bg-red-600/90 hover:bg-red-600 active:bg-red-700 text-white rounded-lg border border-red-500/50 transition-all active:scale-95 cursor-pointer flex items-center space-x-1 shadow-xs"
              title="Se déconnecter de votre espace commercial"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal Centre d'Aide & Guide Rapide */}
      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Modal de Confirmation de Déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900 font-display">
                Confirmer la Déconnexion
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Voulez-vous vraiment fermer votre session commerciale ? Toutes vos données locales restent sauvegardées en toute sécurité.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black rounded-2xl text-xs shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer font-display"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se Déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


