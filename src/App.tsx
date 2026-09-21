import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { PosView } from './components/pos/PosView';
import { DebtsView } from './components/debts/DebtsView';
import { DailyReportView } from './components/reports/DailyReportView';
import { SettingsView } from './components/settings/SettingsView';
import { PinLockModal } from './components/auth/PinLockModal';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { AdminView } from './components/admin/AdminView';
import { LandingPageView } from './components/landing/LandingPageView';
import { subscriptionService } from './db/services/subscriptionService';
import { syncService } from './db/services/syncService';
import { adminService } from './db/services/adminService';
import { AdminBroadcastMessage } from './types';
import { Crown, Megaphone, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { updateService, AppUpdateInfo } from './services/updateService';
import { UpdateModal } from './components/common/UpdateModal';

export const App: React.FC = () => {
  const { isInitialized, activeTab, setActiveTab, activeShopId, shopProfile, loadCurrentShop, isAdminOpen, setIsAdminOpen } = useAppStore();
  const [broadcast, setBroadcast] = useState<AdminBroadcastMessage | null>(null);
  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string | null>(null);
  const [showBroadcastDetail, setShowBroadcastDetail] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    // Confirmer le bon démarrage pour le système de Live Update (anti-rollback)
    updateService.notifyAppReady();

    // Rétablir automatiquement tout compte précédemment suspendu
    adminService.restoreAllSuspendedShops().catch(() => {});
    loadCurrentShop();
    
    // Vérification des mises à jour distantes au lancement
    updateService.checkForUpdate().then(({ hasUpdate, updateInfo }) => {
      if (hasUpdate && updateInfo) {
        if (updateInfo.mandatory || !updateService.isDismissed(updateInfo.version)) {
          setAvailableUpdate(updateInfo);
          setShowUpdateModal(true);
        }
      }
    });

    // En tâche de fond silencieuse : télécharger les nouveautés si disponibles
    updateService.performBackgroundLiveUpdate();
  }, [loadCurrentShop]);

  useEffect(() => {
    if (activeShopId) {
      syncService.getBroadcastMessage().then(bc => {
        if (bc && bc.isActive) {
          setBroadcast(bc);
        }
      });
    }
  }, [activeShopId]);

  // Si le portail Super-Admin est ouvert
  if (isAdminOpen) {
    return <AdminView onClose={() => setIsAdminOpen(false)} />;
  }

  // 1. SUR LE WEB (Navigateur / Render) : Afficher STRICTEMENT la Landing Page
  // L'application de caisse est réservée à l'application mobile Android native (Capacitor)
  const isNative = Capacitor.isNativePlatform();
  const isExplicitAppMode = typeof window !== 'undefined' && (
    window.location.search.includes('mode=app') ||
    window.location.pathname.startsWith('/app')
  );

  if (!isNative && !isExplicitAppMode) {
    return <LandingPageView />;
  }

  // Pendant le chargement initial de l'espace local (IndexedDB)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-300">Chargement de votre espace...</p>
      </div>
    );
  }

  // Si aucun commerce n'est configuré sur cet appareil, afficher l'écran d'accueil
  if (!activeShopId || !shopProfile) {
    return <OnboardingView />;
  }

  const subInfo = subscriptionService.getSubscriptionInfo(shopProfile);
  const showSubWarning = subInfo.daysRemaining <= 3 || subInfo.isExpired;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between font-sans antialiased text-gray-900">
      <Header />

      {/* Bannière de Message Broadcast Administrateur Défilante (Marquee Ticker) */}
      {broadcast && broadcast.isActive && dismissedBroadcastId !== broadcast.id && (
        <div className={`relative px-3 py-2 text-xs font-bold flex items-center justify-between shadow-xs border-b overflow-hidden group select-none ${
          broadcast.type === 'promo'
            ? 'bg-emerald-600 text-white border-emerald-700'
            : broadcast.type === 'warning'
            ? 'bg-amber-500 text-amber-950 border-amber-600'
            : broadcast.type === 'alert'
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-blue-600 text-white border-blue-700'
        }`}>
          {/* Badge Icône Fixe à gauche */}
          <div className="flex items-center space-x-1.5 shrink-0 z-10 pr-2.5">
            <span className="p-1 rounded-lg bg-black/15 flex items-center justify-center">
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
            </span>
          </div>

          {/* Zone de texte Défilante en continu (Pause au toucher / survol) */}
          <div
            onClick={() => setShowBroadcastDetail(true)}
            role="button"
            tabIndex={0}
            title="Toucher pour afficher le message complet"
            className="flex-1 overflow-hidden relative cursor-pointer py-0.5"
          >
            <div className="animate-marquee-ticker">
              <div className="flex items-center space-x-6 pr-6 shrink-0">
                <span>
                  <strong>{broadcast.title} :</strong> {broadcast.message}
                </span>
                <span className="opacity-75 text-[10px]">✦</span>
              </div>
              <div className="flex items-center space-x-6 pr-6 shrink-0" aria-hidden="true">
                <span>
                  <strong>{broadcast.title} :</strong> {broadcast.message}
                </span>
                <span className="opacity-75 text-[10px]">✦</span>
              </div>
            </div>
          </div>

          {/* Bouton Fermer Fixe à droite */}
          <div className="flex items-center shrink-0 z-10 pl-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDismissedBroadcastId(broadcast.id);
              }}
              className="p-1 hover:bg-black/15 rounded-full shrink-0 transition-colors cursor-pointer"
              title="Masquer l'annonce"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Détail Complet de l'Annonce */}
      {showBroadcastDetail && broadcast && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-xl ${
                  broadcast.type === 'promo'
                    ? 'bg-emerald-100 text-emerald-700'
                    : broadcast.type === 'warning'
                    ? 'bg-amber-100 text-amber-800'
                    : broadcast.type === 'alert'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">
                    {broadcast.type === 'promo' ? 'Promotion' : broadcast.type === 'warning' ? 'Important' : broadcast.type === 'alert' ? 'Alerte' : 'Information'}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {broadcast.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastDetail(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
              {broadcast.message}
            </div>

            <button
              type="button"
              onClick={() => setShowBroadcastDetail(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}

      {/* Bannière de rappel discret si abonnement expire dans <= 3 jours */}
      {showSubWarning && activeTab !== 'settings' && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs ${
          subInfo.isExpired 
            ? 'bg-red-600 text-white' 
            : 'bg-amber-500 text-amber-950'
        }`}>
          <div className="flex items-center space-x-2 truncate">
            <Crown className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {subInfo.isExpired 
                ? 'Licence FasoCarnet expirée — Renouvelez pour continuer en toute sérénité' 
                : `Licence FasoCarnet : expire dans ${subInfo.daysRemaining} jour(s)`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="ml-2 px-2.5 py-1 bg-white text-gray-900 rounded-lg text-[11px] font-black shrink-0 hover:bg-gray-100 shadow-xs active:scale-95 transition-all"
          >
            Renouveler
          </button>
        </div>
      )}

      <main className="flex-1 w-full">
        {activeTab === 'pos' && <PosView />}
        {activeTab === 'debts' && <DebtsView />}
        {activeTab === 'reports' && <DailyReportView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <BottomNav />
      <PinLockModal />
      {availableUpdate && (
        <UpdateModal
          updateInfo={availableUpdate}
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
};

export default App;
