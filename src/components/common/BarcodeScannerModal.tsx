import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, Camera, AlertCircle, Sparkles, Check } from 'lucide-react';
import { triggerDoubleHaptic, triggerHaptic } from '../../utils/haptics';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
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
  continuous = false
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
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
      setLastScannedCode(null);
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    const readerElementId = 'barcode-scanner-viewport';
    try {
      // Petite attente pour le rendu du DOM
      await new Promise((resolve) => setTimeout(resolve, 200));

      const element = document.getElementById(readerElementId);
      if (!element) return;

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

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          handleSuccess(decodedText);
        },
        () => {
          // Ignorer les frames sans code
        }
      );

      isScanningRef.current = true;
      setIsStarting(false);

      // Vérifier le support de la torche
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
      setErrorMsg(
        err.message?.includes('Permission') || err.name === 'NotAllowedError'
          ? 'Veuillez autoriser l\'accès à la caméra pour scanner les articles.'
          : 'Impossible d\'accéder à la caméra. Vérifiez vos permissions ou entrez le code manuellement.'
      );
    }
  };

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

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // Bip aigu de caisse
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Ignorer si audio non disponible
    }
  };

  const handleSuccess = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    // Éviter les scans en rafale du même code en moins de 1 seconde
    if (clean === lastScannedCode) return;

    playBeep();
    triggerDoubleHaptic();
    setLastScannedCode(clean);

    onScan(clean);

    if (!continuous) {
      stopScanner();
      onClose();
    } else {
      setTimeout(() => setLastScannedCode(null), 1200);
    }
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
              <p className="text-[10px] text-slate-400 font-semibold">Visez le code-barres de l'article</p>
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
              onClick={onClose}
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
          {!errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-64 h-44 border-2 border-emerald-400/60 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.25)] flex flex-col justify-between p-2">
                {/* Coins renforcés */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Ligne laser rouge/verte animée */}
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
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-2.5 text-center p-6 text-red-300">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Dernier code scanné avec badge de confirmation */}
        {lastScannedCode && (
          <div className="bg-emerald-950/90 border-t border-emerald-700/60 px-4 py-2 flex items-center justify-between text-xs text-emerald-200">
            <span className="flex items-center space-x-1.5 font-bold">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Code détecté :</span>
            </span>
            <span className="font-mono font-black text-white bg-emerald-800/80 px-2 py-0.5 rounded-md">
              {lastScannedCode}
            </span>
          </div>
        )}

        {/* Saisie manuelle alternative */}
        <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 space-y-2">
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

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Douchette laser USB/Bluetooth supportée</span>
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>100% Hors-Ligne</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
