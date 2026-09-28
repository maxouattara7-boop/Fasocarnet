import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  ExternalLink, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ShopProfile } from '../../types';
import { subscriptionService, SubscriptionPlan, SUBSCRIPTION_PLANS } from '../../db/services/subscriptionService';

interface OnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopProfile: ShopProfile | null;
  initialPlan?: SubscriptionPlan;
  onSubscriptionSuccess: (updatedShop: ShopProfile) => void;
}

export const OnlinePaymentModal: React.FC<OnlinePaymentModalProps> = ({
  isOpen,
  onClose,
  shopProfile,
  initialPlan,
  onSubscriptionSuccess
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(initialPlan || SUBSCRIPTION_PLANS[0]);
  const [step, setStep] = useState<'SELECT' | 'PROCESSING' | 'WAITING_VALIDATION' | 'SUCCESS' | 'ERROR'>('SELECT');
  const [refCommand, setRefCommand] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const pollingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (initialPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan]);

  useEffect(() => {
    if (!isOpen) {
      // Nettoyer le polling si la modale se ferme
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      setStep('SELECT');
      setRefCommand(null);
      setRedirectUrl(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  if (!isOpen || !shopProfile) return null;

  const startPolling = (ref: string, plan: SubscriptionPlan) => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);

    pollingTimerRef.current = setInterval(async () => {
      try {
        const statusData = await subscriptionService.checkPaymentStatus(ref);
        if (statusData.status === 'PAID') {
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
          }

          const res = await subscriptionService.applyAutomaticSubscription(
            shopProfile,
            plan.id,
            statusData.subscriptionExpiresAt
          );

          if (res.success) {
            setSuccessMessage(res.message);
            setNewExpirationDate(res.shop.subscriptionExpiresAt || null);
            setStep('SUCCESS');
            onSubscriptionSuccess(res.shop);
          }
        }
      } catch (err) {
        console.warn('Erreur vérification statut:', err);
      }
    }, 3000);
  };

  const handleStartPayment = async () => {
    setStep('PROCESSING');
    setErrorMessage(null);

    try {
      const response = await subscriptionService.initiateOnlinePayment(shopProfile, selectedPlan);
      
      setRefCommand(response.refCommand);

      if (response.redirectUrl) {
        setRedirectUrl(response.redirectUrl);
        setStep('WAITING_VALIDATION');
        startPolling(response.refCommand, selectedPlan);

        // Sur mobile, redirection directe ou ouverture
        try {
          window.location.href = response.redirectUrl;
        } catch {
          window.open(response.redirectUrl, '_blank');
        }
      } else {
        // Mode simulation / Sandbox disponible
        setStep('WAITING_VALIDATION');
        startPolling(response.refCommand, selectedPlan);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de la connexion à la passerelle de paiement.');
      setStep('ERROR');
    }
  };

  const handleSimulateSuccess = async () => {
    if (!refCommand) return;
    setIsSimulating(true);
    try {
      const sim = await subscriptionService.simulatePaymentSuccess(refCommand);
      if (sim.success) {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }

        const res = await subscriptionService.applyAutomaticSubscription(
          shopProfile,
          selectedPlan.id,
          sim.subscriptionExpiresAt
        );

        if (res.success) {
          setSuccessMessage(res.message);
          setNewExpirationDate(res.shop.subscriptionExpiresAt || null);
          setStep('SUCCESS');
          onSubscriptionSuccess(res.shop);
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur lors de la simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* En-tête */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4 sm:p-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Paiement Instantané Sans Code</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white">
            Activation Automatique
          </h2>
          <p className="text-xs text-emerald-100/90 mt-0.5">
            Payez par <strong>Orange Money</strong>, <strong>Moov</strong>, <strong>Wave</strong> ou <strong>Carte</strong>. Votre compte s'active dès validation.
          </p>
        </div>

        {/* Corps */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">

          {/* ÉTAPE 1 : CHOIX DU PLAN & LANCEMENT */}
          {step === 'SELECT' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block uppercase tracking-wider">
                  Sélectionnez votre formule :
                </label>
                
                <div className="space-y-2">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = selectedPlan.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {plan.name}
                            </span>
                            {plan.popular && (
                              <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Recommandé
                              </span>
                            )}
                          </div>
                          {plan.discountText && (
                            <span className="text-[11px] font-semibold text-emerald-700 block">
                              {plan.discountText}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-sm sm:text-base font-black text-slate-900 block">
                            {plan.price.toLocaleString('fr-FR')} <span className="text-[10px] font-bold text-slate-500">FCFA</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Résumé de l'opération */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Commerce :</span>
                  <span className="font-bold text-slate-900">{shopProfile.name || 'Ma Boutique'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Opérateurs supportés :</span>
                  <span className="font-bold text-emerald-800">Orange • Moov • Wave • Carte</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold pt-1.5 border-t border-slate-200">
                  <span>Montant total :</span>
                  <span className="text-emerald-700 text-sm">{selectedPlan.price.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Bouton de paiement */}
              <button
                type="button"
                onClick={handleStartPayment}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-200" />
                <span>Payer {selectedPlan.price.toLocaleString('fr-FR')} FCFA maintenant</span>
              </button>

              <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-500 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Paiement sécurisé crypté SSL • Activation 100% automatique</span>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : CHARGEMENT INITIAL */}
          {step === 'PROCESSING' && (
            <div className="py-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">Connexion à la passerelle de paiement...</h3>
                <p className="text-xs text-slate-500">Génération de votre session sécurisée en cours.</p>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : EN ATTENTE DE VALIDATION MOBILE */}
          {step === 'WAITING_VALIDATION' && (
            <div className="py-4 space-y-4 text-center">
              <div className="relative mx-auto w-14 h-14">
                <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75" />
                <div className="relative rounded-full bg-emerald-600 text-white w-14 h-14 flex items-center justify-center shadow-lg">
                  <Smartphone className="w-7 h-7" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  En attente de votre validation Mobile Money...
                </h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Validez la transaction sur votre téléphone. Dès confirmation, cette fenêtre s'actualisera toute seule.
                </p>
              </div>

              {redirectUrl && (
                <div className="pt-1">
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-300 transition-all"
                  >
                    <span>Rouvrir la page de paiement</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                  </a>
                </div>
              )}

              {/* Outil de simulation bac à sable / Test */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-left space-y-2">
                <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Mode Test & Démonstration Instantanée</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Vous pouvez cliquer ci-dessous pour simuler la validation du paiement et vérifier l'activation immédiate de votre compte :
                </p>
                <button
                  type="button"
                  onClick={handleSimulateSuccess}
                  disabled={isSimulating}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Simuler le paiement réussi ({selectedPlan.price} F)</span>
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : SUCCÈS 🎉 */}
          {step === 'SUCCESS' && (
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg ring-8 ring-emerald-50 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Compte Activé Avec Succès
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Abonnement Pro Débloqué !
                </h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  {successMessage || 'Votre paiement a été confirmé avec succès.'}
                </p>
              </div>

              {newExpirationDate && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-bold">
                  Nouvelle date d'expiration : {new Date(newExpirationDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs shadow-sm cursor-pointer transition-all"
              >
                Continuer vers mon commerce
              </button>
            </div>
          )}

          {/* ÉTAPE 5 : ERREUR */}
          {step === 'ERROR' && (
            <div className="py-4 space-y-3 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-900">Impossible de finaliser la demande</h3>
                <p className="text-xs text-red-700">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
