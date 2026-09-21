import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Delete } from 'lucide-react';
import { Logo } from '../common/Logo';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';

export const PinLockModal: React.FC = () => {
  const { isLocked, setIsLocked, verifyPin, shopProfile } = useAppStore();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    triggerHaptic(45);
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        if (verifyPin(nextPin)) {
          triggerDoubleHaptic();
          setIsLocked(false);
          setPinInput('');
        } else {
          setErrorMsg('Code PIN incorrect');
          setTimeout(() => setPinInput(''), 400);
        }
      }
    }
  };

  const handleDelete = () => {
    triggerHaptic(40);
    setPinInput(pinInput.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xs text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" showText={false} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">{shopProfile?.name || 'FasoCarnet'}</h2>
          <p className="text-xs text-emerald-300/80 mt-1">Saisissez votre code PIN pour déverrouiller</p>
        </div>

        {/* Indicateurs 4 ronds */}
        <div className="flex justify-center space-x-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                pinInput.length > idx
                  ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                  : 'bg-emerald-900 border border-emerald-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-red-400 text-xs font-bold animate-shake">{errorMsg}</p>
        )}

        {/* Pavé numérique PIN */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 bg-emerald-900/60 hover:bg-emerald-800 text-white text-2xl font-bold rounded-2xl border border-emerald-800/80 active:scale-95 transition-all flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 bg-emerald-900/60 hover:bg-emerald-800 text-white text-2xl font-bold rounded-2xl border border-emerald-800/80 active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-2xl border border-emerald-800/40 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
