export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
  category: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
}

export const SHOP_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'emerald',
    name: 'Vert Émeraude (Par défaut)',
    hex: '#047857',
    category: 'Commerce, Santé & Alimentation',
    bgClass: 'bg-emerald-700',
    textClass: 'text-emerald-700',
    ringClass: 'ring-emerald-600'
  },
  {
    id: 'royal_blue',
    name: 'Bleu Roi',
    hex: '#1d4ed8',
    category: 'Technologie, Quincaillerie & Services',
    bgClass: 'bg-blue-700',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-600'
  },
  {
    id: 'amber',
    name: 'Ambre & Terre Cuite',
    hex: '#d97706',
    category: 'BTP, Artisanat & Restauration',
    bgClass: 'bg-amber-600',
    textClass: 'text-amber-600',
    ringClass: 'ring-amber-500'
  },
  {
    id: 'ruby',
    name: 'Rouge Rubis / Bordeaux',
    hex: '#9f1239',
    category: 'Mode, Cosmétique & Prêt-à-porter',
    bgClass: 'bg-rose-800',
    textClass: 'text-rose-800',
    ringClass: 'ring-rose-700'
  },
  {
    id: 'purple',
    name: 'Violet Impérial',
    hex: '#6d28d9',
    category: 'Parfumerie, Électronique & Digital',
    bgClass: 'bg-purple-700',
    textClass: 'text-purple-700',
    ringClass: 'ring-purple-600'
  },
  {
    id: 'teal',
    name: 'Teal Océan',
    hex: '#0f766e',
    category: 'Optique, Hygiène & Librairie',
    bgClass: 'bg-teal-700',
    textClass: 'text-teal-700',
    ringClass: 'ring-teal-600'
  },
  {
    id: 'slate',
    name: 'Noir Onyx / Anthracite',
    hex: '#1e293b',
    category: 'Minimaliste, Horlogerie & Luxe',
    bgClass: 'bg-slate-800',
    textClass: 'text-slate-800',
    ringClass: 'ring-slate-700'
  },
  {
    id: 'indigo',
    name: 'Indigo Nuit',
    hex: '#4338ca',
    category: 'Bureautique, Impression & Graphisme',
    bgClass: 'bg-indigo-700',
    textClass: 'text-indigo-700',
    ringClass: 'ring-indigo-600'
  }
];

export const DEFAULT_SHOP_COLOR = '#047857';

/**
 * Retourne une couleur hex valide ou la couleur par défaut
 */
export const getShopPrimaryColor = (color?: string | null): string => {
  if (!color || typeof color !== 'string') return DEFAULT_SHOP_COLOR;
  const clean = color.trim();
  if (/^#([0-9A-F]{3}){1,2}$/i.test(clean)) {
    return clean;
  }
  return DEFAULT_SHOP_COLOR;
};

/**
 * Calcule une teinte plus claire (pour les fonds de tableau ou badges)
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const clean = getShopPrimaryColor(hex).replace('#', '');
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16);
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16);
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
