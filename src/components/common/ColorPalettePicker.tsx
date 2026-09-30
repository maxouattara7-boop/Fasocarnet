import React from 'react';
import { SHOP_COLOR_PRESETS, getShopPrimaryColor } from '../../utils/themeColors';
import { Check, Palette, Sparkles } from 'lucide-react';

interface ColorPalettePickerProps {
  selectedColor?: string;
  onChange: (color: string) => void;
  showPreview?: boolean;
  shopName?: string;
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  selectedColor = '#047857',
  onChange,
  showPreview = true,
  shopName = 'Mon Commerce'
}) => {
  const currentColor = getShopPrimaryColor(selectedColor);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-800">
          <Palette className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold font-display uppercase tracking-wider">
            Couleur de Marque (Reçus & Factures)
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
          {currentColor.toUpperCase()}
        </span>
      </div>

      {/* Grille des couleurs prédéfinies */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SHOP_COLOR_PRESETS.map((preset) => {
          const isSelected = currentColor.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.hex)}
              className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
                style={{ backgroundColor: preset.hex }}
              >
                {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                  {preset.name.split(' (')[0]}
                </p>
                <p className="text-[9px] text-slate-400 truncate leading-tight">
                  {preset.category.split(',')[0]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sélecteur libre de code couleur HEX avec pipette */}
      <div className="flex items-center space-x-2 pt-1">
        <div className="relative flex items-center shrink-0">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0.5 bg-white shadow-2xs"
            title="Choisir une couleur avec la pipette"
          />
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Ou saisissez un code HEX (#047857)..."
            value={selectedColor}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none uppercase"
            maxLength={7}
          />
        </div>
      </div>

      {/* Aperçu direct en direct de l'en-tête de reçu/facture */}
      {showPreview && (
        <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 uppercase">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Aperçu de vos documents avec cette couleur</span>
          </div>

          <div
            className="p-3 rounded-xl text-white shadow-sm flex items-center justify-between transition-colors duration-200"
            style={{ backgroundColor: currentColor }}
          >
            <div>
              <p className="text-xs font-black tracking-tight uppercase font-display">
                {shopName || 'NOM DE VOTRE BOUTIQUE'}
              </p>
              <p className="text-[10px] text-white/80 font-medium">Reçu de caisse • Facture officielle</p>
            </div>
            <div className="bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider">
              FASOCARNET
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
