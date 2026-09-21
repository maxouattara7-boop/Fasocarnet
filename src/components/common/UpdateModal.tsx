import React, { useState } from 'react';
import { AppUpdateInfo, CURRENT_APP_VERSION, updateService } from '../../services/updateService';
import { Sparkles, Download, ArrowRight, X, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface UpdateModalProps {
  updateInfo: AppUpdateInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, isOpen, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isNative = Capacitor.isNativePlatform();
  const canLiveUpdate = isNative && !!updateInfo.bundleUrl;

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    setStatusMessage('Téléchargement des nouveautés...');

    if (canLiveUpdate && updateInfo.bundleUrl) {
      try {
        const res = await updateService.applyLiveUpdate(updateInfo.bundleUrl, updateInfo.version);
        if (res.success) {
          setStatusMessage('Application terminée ! Redémarrage...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (err) {
        console.warn('Live Update échoué, repli APK:', err);
      }
    }

    // Repli : téléchargement de l'APK direct
    setStatusMessage('Téléchargement du fichier APK...');
    updateService.downloadAndInstallApk(updateInfo.apkUrl);
    setTimeout(() => {
      setIsUpdating(false);
      setStatusMessage(null);
    }, 4000);
  };

  const handleDismiss = () => {
    updateService.dismissUpdate(updateInfo.version);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 text-left space-y-3.5 animate-in zoom-in-95 duration-200 border border-emerald-500/30">
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
                  <span>Mise à jour disponible</span>
                </span>
                {updateInfo.mandatory && (
                  <span className="text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.2 rounded-full">
                    Importante
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                FasoCarnet v{updateInfo.version}
              </h3>
            </div>
          </div>

          {!updateInfo.mandatory && !isUpdating && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Comparatif de version */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          <div className="text-slate-500">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Version installée</span>
            <span className="font-mono text-slate-700">v{CURRENT_APP_VERSION}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600" />
          <div className="text-right text-emerald-800">
            <span className="block text-[9px] uppercase font-bold text-emerald-600">Nouvelle version</span>
            <span className="font-mono font-extrabold text-emerald-700">v{updateInfo.version}</span>
          </div>
        </div>

        {/* Nouveautés */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
            Nouveautés de cette version :
          </span>
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-xs text-slate-800 max-h-32 overflow-y-auto leading-relaxed">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Garanties */}
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Toutes vos ventes et vos données restent 100% conservées.</span>
        </div>

        {/* Actions */}
        <div className="pt-1 space-y-1.5">
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleApplyUpdate}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-1.5 active:scale-98 transition-all cursor-pointer disabled:opacity-75"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>{statusMessage || 'Mise à jour en cours...'}</span>
              </>
            ) : canLiveUpdate ? (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Mettre à jour instantanément (sans réinstaller)</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Mettre à jour maintenant (1 clic)</span>
              </>
            )}
          </button>

          {!updateInfo.mandatory && !isUpdating && (
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-1.5 text-slate-500 hover:text-slate-800 text-[11px] font-semibold text-center transition-colors"
            >
              Plus tard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
