import React from 'react';
import { useAppStore, ActiveTab } from '../../store/appStore';
import { ShoppingCart, BookOpen, BarChart3, FileText, Package, Store } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pos', label: 'Vendre', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'debts', label: 'Dettes', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'reports', label: 'Bilan', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'invoices', label: 'Factures', icon: <FileText className="w-5 h-5" /> },
    { id: 'inventory', label: 'Stock', icon: <Package className="w-5 h-5" /> },
    { id: 'settings', label: 'Boutique', icon: <Store className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 pt-1 pb-1.5 px-1.5 shadow-lg z-30 safe-bottom">
      <div className="max-w-lg mx-auto grid grid-cols-6 gap-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-orange-600 font-extrabold bg-orange-500/10'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 font-semibold'
              }`}
            >
              <div className={`p-0.5 rounded-lg transition-transform duration-150 ${isActive ? 'scale-105 text-orange-600' : 'text-slate-400'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] tracking-tight leading-none mt-1 truncate ${isActive ? 'text-orange-700 font-extrabold' : 'text-slate-600 font-semibold'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
