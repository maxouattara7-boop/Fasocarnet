import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { customersService } from '../../db/services/customersService';
import { CustomerCard } from './CustomerCard';
import { NewCustomerModal } from './NewCustomerModal';
import { DebtPaymentModal } from './PaymentModal';
import { formatCurrency } from '../../utils/formatters';
import { Search, UserPlus, BookOpen, Users } from 'lucide-react';

export const DebtsView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await customersService.getAll();
    setCustomers(list);
  };

  const debtorCustomers = customers.filter(c => c.totalDebt > 0);
  const totalOutstanding = debtorCustomers.reduce((sum, c) => sum + c.totalDebt, 0);

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

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
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center space-y-3 border border-gray-200/80 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-gray-800 text-sm font-display">Aucune dette trouvée</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Enregistrez une dette directe (emprunt/prêt) ou une vente à crédit depuis la caisse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl sm:rounded-2xl shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer font-display active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Ajouter une première dette</span>
            </button>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onPayDebt={(c) => setPayingCustomer(c)}
            />
          ))
        )}
      </div>

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
