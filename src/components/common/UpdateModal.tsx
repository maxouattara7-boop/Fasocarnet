import React, { useState, useEffect } from 'react';
import { AppUpdateInfo, CURRENT_APP_VERSION, updateService } from '../../services/updateService';
import { Sparkles, ArrowRight, ShieldCheck, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface UpdateModalProps {
  updateInfo: AppUpdateInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, isOpen, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const canLiveUpdate = isNative && !!updateInfo.bundleUrl;

  useEffect(() => {
    if (!isOpen) return;

    // Téléchargement automatique en tâche de fond dès l'ouverture
    if (canLiveUpdate && updateInfo.bundleUrl) {
      setIsUpdating(true);
      setStatusMessage('Préparation des nouveautés...');
      updateService.downloadLiveUpdate(updateInfo.bundleUrl, updateInfo.version)
        .then((res) => {
          setIsUpdating(false);
          if (res.success) {
            setIsReadyToRestart(true);
            setStatusMessage(null);
          }
        })
        .catch(() => {
          setIsUpdating(false);
        });
    } else {
      setIsReadyToRestart(true);
    }
  }, [isOpen, canLiveUpdate, updateInfo]);

  if (!isOpen) return null;

  const handleApplyAndClose = async () => {
    if (isReadyToRestart && canLiveUpdate) {
      await updateService.reloadApp();
    } else if (isUpdating && canLiveUpdate) {
      // Si l'utilisateur clique alors que le téléchargement finit, attendre un court instant
      setStatusMessage('Application en cours...');
      try {
        if (updateInfo.bundleUrl) {
          await updateService.downloadLiveUpdate(updateInfo.bundleUrl, updateInfo.version);
          await updateService.reloadApp();
          return;
        }
      } catch {
        // Fallback
      }
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 text-left space-y-3.5 animate-in zoom-in-95 duration-150 border border-emerald-500/30">
        {/* Header avec badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
              <Zap className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Mise à jour déployée</span>
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 font-display">
                FasoCarnet v{updateInfo.version}
              </h3>
            </div>
          </div>
        </div>

        {/* Comparatif de version */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          <div className="text-slate-500">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Version actuelle</span>
            <span className="font-mono text-slate-700">v{CURRENT_APP_VERSION}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600" />
          <div className="text-right text-emerald-800">
            <span className="block text-[9px] uppercase font-bold text-emerald-600">Nouvelle version</span>
            <span className="font-mono font-extrabold text-emerald-700">v{updateInfo.version}</span>
          </div>
        </div>

        {/* Nouveautés de la version */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
            Nouveautés & Améliorations :
          </span>
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-xs text-slate-800 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-line font-medium">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Garanties de données */}
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Toutes vos ventes et données sont 100% conservées.</span>
        </div>

        {/* Actions utilisateur : Bouton unique OK / Compris */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleApplyAndClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer font-display"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>{statusMessage || 'Préparation...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>👍 OK, J'ai compris</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
