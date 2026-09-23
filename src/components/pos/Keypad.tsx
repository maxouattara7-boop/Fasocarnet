import React from 'react';
import { Delete, Plus } from 'lucide-react';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';

interface KeypadProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({ value, onChange, onClear }) => {
  const handleDigit = (digit: string) => {
    triggerHaptic(45);
    if (value === '0') {
      if (digit === '0' || digit === '00' || digit === '000') {
        return;
      }
      onChange(digit);
    } else {
      // Limite raisonnable de longueur d'expression
      if (value.length < 30) {
        onChange(value + digit);
      }
    }
  };

  const handlePlus = () => {
    triggerDoubleHaptic();
    if (value === '0' || value.trim().endsWith('+')) {
      return;
    }
    onChange(value + ' + ');
  };

  const handleDelete = () => {
    triggerHaptic(40);
    if (value.endsWith(' + ')) {
      const next = value.slice(0, -3);
      onChange(next.length === 0 ? '0' : next);
    } else if (value.length <= 1) {
      onChange('0');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    triggerHaptic(50);
    onClear();
  };

  return (
    <div className="space-y-2.5 select-none">
      {/* Clavier numérique 4 colonnes Maxi Format TPV avec touche addition + */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {/* Ligne 1 : 1, 2, 3, Effacer */}
        <button
          type="button"
          onClick={() => handleDigit('1')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleDigit('2')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleDigit('3')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          3
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-16 sm:h-18 bg-slate-100 hover:bg-slate-200 active:bg-red-100 text-slate-700 active:text-red-700 rounded-2xl border border-slate-200 active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
          title="Effacer le dernier chiffre"
        >
          <Delete className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Ligne 2 : 4, 5, 6, + (qui s'étend sur 2 lignes) */}
        <button
          type="button"
          onClick={() => handleDigit('4')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleDigit('5')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleDigit('6')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          6
        </button>
        <button
          type="button"
          onClick={handlePlus}
          className="row-span-2 h-[138px] sm:h-[154px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-2xl shadow-md shadow-emerald-600/30 border border-emerald-500 active:scale-95 transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer"
          title="Additionner un montant"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-100 font-display">Plus</span>
        </button>

        {/* Ligne 3 : 7, 8, 9 */}
        <button
          type="button"
          onClick={() => handleDigit('7')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleDigit('8')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleDigit('9')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          9
        </button>

        {/* Ligne 4 : C, 0, 00, 000 */}
        <button
          type="button"
          onClick={handleClear}
          className="h-16 sm:h-18 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 text-xl sm:text-2xl font-black rounded-2xl border border-red-200 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
          title="Remettre à zéro"
        >
          C
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-2xl sm:text-3xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleDigit('00')}
          className="h-16 sm:h-18 bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 text-slate-900 text-xl sm:text-2xl font-black rounded-2xl shadow-xs border border-slate-200/90 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
        >
          00
        </button>
        <button
          type="button"
          onClick={() => handleDigit('000')}
          className="h-16 sm:h-18 bg-emerald-50/90 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-950 text-base sm:text-lg font-black rounded-2xl border border-emerald-300/80 active:scale-95 transition-all flex items-center justify-center font-display cursor-pointer"
          title="Mille (000)"
        >
          000
        </button>
      </div>
    </div>
  );
};
