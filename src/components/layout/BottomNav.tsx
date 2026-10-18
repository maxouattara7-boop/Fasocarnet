import React from 'react';
import { useAppStore } from '../../store/appStore';
import { LayoutGrid, ShoppingCart } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const isMenu = activeTab === 'home';
  const isPos = activeTab === 'pos';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 py-1.5 px-6 shadow-lg z-30 safe-bottom">
      <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
        {/* Bouton Menu (Accès au Hub 6 modules & Bilan du jour) */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
            isMenu
              ? 'text-orange-600 font-extrabold bg-orange-500/10 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 font-bold'
          }`}
        >
          <div className={`p-1 rounded-xl transition-transform duration-150 ${isMenu ? 'scale-110 text-orange-600' : 'text-slate-400'}`}>
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className={`text-xs tracking-tight ${isMenu ? 'text-orange-700 font-black' : 'text-slate-600 font-bold'}`}>
            Menu
          </span>
        </button>

        {/* Bouton Vendre (Accès direct à la caisse de vente) */}
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
            isPos
              ? 'text-orange-600 font-extrabold bg-orange-500/10 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 font-bold'
          }`}
        >
          <div className={`p-1 rounded-xl transition-transform duration-150 ${isPos ? 'scale-110 text-orange-600' : 'text-slate-400'}`}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className={`text-xs tracking-tight ${isPos ? 'text-orange-700 font-black' : 'text-slate-600 font-bold'}`}>
            Vendre
          </span>
        </button>
      </div>
    </nav>
  );
};

