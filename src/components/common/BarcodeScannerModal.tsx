import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, Camera, AlertCircle, Sparkles, Check, RefreshCw, ShoppingCart, ArrowRight } from 'lucide-react';
import { triggerDoubleHaptic, triggerHaptic } from '../../utils/haptics';
import { formatCurrency } from '../../utils/formatters';

export interface ScannedItemFeedback {
  name: string;
  price: number;
  totalCartAmount?: number;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  lastScannedItem?: ScannedItemFeedback | null;
  onScanNext?: () => void;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.ITF
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scanner un Code-Barres',
  lastScannedItem,
  onScanNext
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsStarting(true);
      setIsPaused(false);
      setLastScannedCode(null);
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('[BarcodeScanner] Erreur arrêt:', err);
      } finally {
        isScanningRef.current = false;
        html5QrCodeRef.current = null;
      }
    }
  };

  const startScanner = async () => {
    const readerElementId = 'barcode-scanner-viewport';
    try {
      setIsStarting(true);
      setErrorMsg(null);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const element = document.getElementById(readerElementId);
      if (!element) return;

      await stopScanner();

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 180 },
        aspectRatio: 1.33
      };

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleSuccess(decodedText);
      };

      let started = false;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find((c) => {
            const label = c.label.toLowerCase();
            return (
              label.includes('back') ||
              label.includes('rear') ||
              label.includes('arriere') ||
              label.includes('arrière') ||
              label.includes('environment')
            );
          }) || cameras[cameras.length - 1];

          await html5QrCode.start(
            backCam.id,
            config,
            qrCodeSuccessCallback,
            () => {}
          );
          started = true;
        }
      } catch (enumErr) {
        console.warn('[BarcodeScanner] getCameras() fallback:', enumErr);
      }

      if (!started) {
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            qrCodeSuccessCallback,
            () => {}
          );
          started = true;
        } catch (envErr) {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            qrCodeSuccessCallback,
            () => {}
          );
          started = true;
        }
      }

      isScanningRef.current = true;
      setIsStarting(false);
      setIsPaused(false);

      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if ((capabilities as any)?.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('[BarcodeScanner] Erreur démarrage:', err);
      setIsStarting(false);
      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.toLowerCase().includes('permission') ||
        err.message?.toLowerCase().includes('denied');

      setErrorMsg(
        isDenied
          ? "Accès à la caméra refusé. Cliquez ci-dessous pour autoriser la caméra ou réglez les permissions de votre navigateur."
          : "Impossible d'accéder à la caméra de votre appareil. Vérifiez vos permissions ou saisissez le code manuellement."
      );
    }
  };

  const handleRequestPermissionAndRetry = async () => {
    try {
      setIsStarting(true);
      setErrorMsg(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      await startScanner();
    } catch (err: any) {
      console.error('[BarcodeScanner] Échec réessai permission:', err);
      setIsStarting(false);
      setErrorMsg(
        "L'autorisation de la caméra est bloquée par le navigateur. Cliquez sur l'icône de cadenas 🔒 à gauche de l'URL pour autoriser la caméra."
      );
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const handleSuccess = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    if (clean === lastScannedCode && isPaused) return;

    playBeep();
    triggerDoubleHaptic();
    setLastScannedCode(clean);
    setIsPaused(true);

    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        html5QrCodeRef.current.pause();
      } catch {}
    }

    onScan(clean);
  };

  const handleContinueScanning = () => {
    setLastScannedCode(null);
    setIsPaused(false);
    if (onScanNext) onScanNext();

    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        html5QrCodeRef.current.resume();
      } catch {
        startScanner();
      }
    }
  };

  const handleFinishAndReturn = () => {
    stopScanner();
    onClose();
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const newStatus = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newStatus } as any]
      });
      setIsTorchOn(newStatus);
      triggerHaptic(30);
    } catch (err) {
      console.warn('Erreur bascule torche:', err);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccess(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white animate-in zoom-in-95 duration-150">
        {/* En-tête */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-tight">{title}</h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                {isPaused ? 'Article détecté !' : 'Visez le code-barres de l\'article'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition-all ${
                  isTorchOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Activer / Désactiver la lampe"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleFinishAndReturn}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zone Caméra & Viseur Laser */}
        <div className="relative bg-black flex items-center justify-center min-h-[260px] overflow-hidden">
          <div id="barcode-scanner-viewport" className="w-full h-full min-h-[260px]" />

          {/* Viseur visuel avec coins émeraude et laser animé */}
          {!errorMsg && !isPaused && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-64 h-44 border-2 border-emerald-400/60 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.25)] flex flex-col justify-between p-2">
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
            </div>
          )}

          {isStarting && !errorMsg && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-2 text-center p-4">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-emerald-300">Initialisation de la caméra...</p>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-3 text-center p-6 text-slate-200">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium leading-relaxed max-w-xs text-red-200">{errorMsg}</p>
              
              <button
                type="button"
                onClick={handleRequestPermissionAndRetry}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Autoriser & Réessayer la Caméra</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CARTE DE CONFIRMATION AVEC BOUTON CONTINUER ET BOUTON OK RETOUR CAISSE   */}
        {/* ========================================================================= */}
        {lastScannedItem ? (
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border-t border-emerald-500/40 p-3.5 space-y-2.5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between bg-emerald-900/60 p-2.5 rounded-2xl border border-emerald-500/30">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                    ✓ Ajouté à la caisse !
                  </span>
                  <h4 className="text-xs font-extrabold text-white truncate max-w-[170px]">
                    {lastScannedItem.name}
                  </h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-amber-300 block">
                  {formatCurrency(lastScannedItem.price)}
                </span>
                {lastScannedItem.totalCartAmount !== undefined && (
                  <span className="text-[9px] text-emerald-300 font-semibold">
                    Total : {formatCurrency(lastScannedItem.totalCartAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* 2 BOUTONS : CONTINUER OU OK CAISSE */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleContinueScanning}
                className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scanner suivant</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAndReturn}
                className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>OK Caisse</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Saisie manuelle alternative si aucun scan en pause */
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2">
            <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Ou saisir le code-barres manuellement..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                OK
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Douchette laser USB/Bluetooth supportée</span>
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>100% Hors-Ligne</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
