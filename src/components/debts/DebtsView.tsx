import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { customersService } from '../../db/services/customersService';
import { CustomerCard } from './CustomerCard';
import { NewCustomerModal } from './NewCustomerModal';
import { DebtPaymentModal } from './PaymentModal';
import { formatCurrency } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { Search, UserPlus, BookOpen, Users, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';

export const DebtsView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'settled' | 'all'>('active');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await customersService.getAll();
    setCustomers(list);
  };

  const debtorCustomers = customers.filter(c => c.totalDebt > 0);
  const settledCustomers = customers.filter(c => c.totalDebt <= 0);
  const totalOutstanding = debtorCustomers.reduce((sum, c) => sum + c.totalDebt, 0);

  const displayedList = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    if (!matchesSearch) return false;
    if (filterTab === 'active') return c.totalDebt > 0;
    if (filterTab === 'settled') return c.totalDebt <= 0;
    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    triggerHaptic(50);
    await customersService.delete(customerToDelete.id);
    setCustomerToDelete(null);
    await loadData();
  };

  return (
    <div className="max-w-md mx-auto p-3.5 sm:p-4 space-y-3.5 pb-24">
      {/* Carte du Total Général des Créances */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg space-y-2 border border-amber-500/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-100 shadow-inner shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-200 block truncate font-display">
                Total des Dettes Clients
              </span>
              <p className="text-[10px] text-amber-100/70 font-medium truncate">
                Argent en circulation à recouvrer
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 bg-black/20 backdrop-blur-xs border border-white/20 rounded-xl flex items-center space-x-1 shrink-0">
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs font-black text-white">{debtorCustomers.length}</span>
            <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">
              débiteur{debtorCustomers.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="pt-1">
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display drop-shadow-sm">
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Onglets Dettes En cours vs Dettes Soldées */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl sm:rounded-2xl gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 rounded-lg sm:rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
            filterTab === 'active'
              ? 'bg-amber-600 text-white shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>En cours</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            filterTab === 'active' ? 'bg-amber-800/80 text-amber-100' : 'bg-slate-200 text-slate-700'
          }`}>
            {debtorCustomers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('settled')}
          className={`flex-1 py-2 rounded-lg sm:rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
            filterTab === 'settled'
              ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Soldées</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            filterTab === 'settled' ? 'bg-emerald-800/80 text-emerald-100' : 'bg-slate-200 text-slate-700'
          }`}>
            {settledCustomers.length}
          </span>
        </button>
      </div>

      {/* Barre de recherche et Bouton d'ajout de dette */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none shadow-xs text-gray-800 placeholder-gray-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-xs rounded-xl sm:rounded-2xl shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer font-display"
          title="Ajouter une Dette"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Ajouter Dette</span>
        </button>
      </div>

      {/* Liste des clients */}
      <div className="space-y-2.5">
        {displayedList.length === 0 ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center space-y-3 border border-gray-200/80 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              {filterTab === 'settled' ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <BookOpen className="w-6 h-6" />}
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-gray-800 text-sm font-display">
                {filterTab === 'settled' ? 'Aucune dette soldée' : 'Aucune dette en cours trouvée'}
              </h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {filterTab === 'settled' 
                  ? 'Les dettes entièrement réglées apparaîtront ici.'
                  : 'Enregistrez une dette directe ou une vente à crédit depuis la caisse.'}
              </p>
            </div>
            {filterTab === 'active' && (
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl sm:rounded-2xl shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer font-display active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Ajouter une première dette</span>
              </button>
            )}
          </div>
        ) : (
          displayedList.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onPayDebt={(c) => setPayingCustomer(c)}
              onDelete={(c) => setCustomerToDelete(c)}
            />
          ))
        )}
      </div>

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base font-display">Supprimer cette dette ?</h3>
              <p className="text-xs text-slate-600">
                Êtes-vous sûr de vouloir supprimer la fiche de <strong>{customerToDelete.name}</strong> ({customerToDelete.phone}) ? Cette action est irréversible.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-red-600/30 flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCreated={() => loadData()}
      />

      <DebtPaymentModal
        isOpen={!!payingCustomer}
        customer={payingCustomer}
        onClose={() => setPayingCustomer(null)}
        onPaymentSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
