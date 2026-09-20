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
import { subscriptionService } from './db/services/subscriptionService';
import { syncService } from './db/services/syncService';
import { AdminBroadcastMessage } from './types';
import { Crown, Megaphone, ShieldAlert, MessageCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const { isInitialized, activeTab, setActiveTab, activeShopId, shopProfile, loadCurrentShop, isAdminOpen, setIsAdminOpen } = useAppStore();
  const [broadcast, setBroadcast] = useState<AdminBroadcastMessage | null>(null);
  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string | null>(null);
  const [showBroadcastDetail, setShowBroadcastDetail] = useState(false);

  useEffect(() => {
    loadCurrentShop();
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

  // Si la boutique a été suspendue à distance par le Super-Admin
  if (shopProfile.isSuspended) {
    const contactAdminUrl = `https://wa.me/22672990310?text=${encodeURIComponent(
      `Bonjour Administrateur FasoCarnet,\nMon compte pour la boutique "${shopProfile.name}" (${shopProfile.phone}) est actuellement suspendu. Merci de m'indiquer la démarche pour réactiver mon accès.`
    )}`;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-red-900/60 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white font-display">Boutique Suspendue</h2>
            <p className="text-xs text-slate-400 font-medium">
              {shopProfile.suspendedReason || "L'accès à cette boutique a été temporairement suspendu par l'administration."}
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <a
              href={contactAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all font-display"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contacter le Support Administrateur</span>
            </a>
          </div>
        </div>
      </div>
    );
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
    </div>
  );
};

export default App;
