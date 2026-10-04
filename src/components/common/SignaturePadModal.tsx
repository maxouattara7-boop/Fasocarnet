import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X, ShieldCheck } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  initialSignature?: string | null;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSignature
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState<'#0f172a' | '#1e3a8a' | '#047857'>('#1e3a8a');

  // Initialiser le canvas au montage / ouverture
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Adapter à la résolution de l'écran pour des traits nets
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = strokeColor;

      // Si une signature existait, la pré-dessiner
      if (initialSignature) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialSignature;
      } else {
        clearCanvas();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, initialSignature]);

  // Mettre à jour la couleur du tracé
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
  }, [strokeColor]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      onClose();
      return;
    }

    // Exporter en PNG avec transparence
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight font-display">
                Signature Électronique du Gérant
              </h3>
              <p className="text-[11px] text-slate-300">
                Signez au doigt ou au stylet pour certifier vos factures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps & Canvas interactif */}
        <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sera apposée sur les factures et reçus</span>
            </span>

            {/* Choix de la couleur d'encre */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStrokeColor('#1e3a8a')}
                className={`w-5 h-5 rounded-lg bg-blue-900 transition-all ${strokeColor === '#1e3a8a' ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70'}`}
                title="Encre Bleue (Recommandée)"
              />
              <button
                type="button"
                onClick={() => setStrokeColor('#0f172a')}
                className={`w-5 h-5 rounded-lg bg-slate-900 transition-all ${strokeColor === '#0f172a' ? 'ring-2 ring-slate-600 scale-110' : 'opacity-70'}`}
                title="Encre Noire"
              />
              <button
                type="button"
                onClick={() => setStrokeColor('#047857')}
                className={`w-5 h-5 rounded-lg bg-emerald-700 transition-all ${strokeColor === '#047857' ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-70'}`}
                title="Encre Verte"
              />
            </div>
          </div>

          {/* Zone de signature avec ligne guide */}
          <div className="relative flex-1 min-h-[220px] sm:min-h-[260px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 transition-colors overflow-hidden touch-none select-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair block"
              style={{ touchAction: 'none' }}
            />

            {/* Ligne repère discrète */}
            <div className="absolute left-6 right-6 bottom-10 border-b border-slate-300/60 pointer-events-none flex justify-between items-center text-[10px] text-slate-400 font-medium select-none">
              <span>Ligne de signature</span>
              <span>✖ Signer ici</span>
            </div>

            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-slate-400 text-xs font-semibold">
                Touchez l'écran et glissez pour signer
              </div>
            )}
          </div>
        </div>

        {/* Pied de page & Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearCanvas}
            className="px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Effacer</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!hasDrawn}
              onClick={handleSave}
              className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer ${
                hasDrawn
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25 active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Valider la Signature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
