import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { customersService } from '../../db/services/customersService';
import { CustomerCard } from './CustomerCard';
import { NewCustomerModal } from './NewCustomerModal';
import { DebtPaymentModal } from './PaymentModal';
import { formatCurrency } from '../../utils/formatters';
import { Search, UserPlus, BookOpen, AlertCircle } from 'lucide-react';

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
    <div className="max-w-md mx-auto p-3.5 sm:p-4 space-y-3 pb-24">
      {/* Carte du Total Général des Créances */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-900 text-white p-4.5 sm:p-5 rounded-2xl shadow-lg space-y-1.5 border border-amber-500/40">
        <div className="flex items-center justify-between text-amber-200 text-[11px] font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Total des Dettes Clients</span>
          </div>
          <span className="bg-amber-700/60 px-2 py-0.5 rounded-md text-[10px] font-bold">{debtorCustomers.length} Débiteur(s)</span>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {formatCurrency(totalOutstanding)}
        </div>

        <p className="text-[10px] text-amber-200/80">
          Argent en circulation à recouvrer auprès de vos clients
        </p>
      </div>

      {/* Barre de recherche et Bouton d'ajout de dette */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none shadow-xs"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer"
          title="Ajouter une Dette"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Ajouter Dette</span>
        </button>
      </div>

      {/* Liste des clients */}
      <div className="space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center space-y-2.5 border border-gray-100 shadow-xs">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
            <div>
              <h4 className="font-bold text-gray-700 text-xs sm:text-sm">Aucune dette trouvée</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Enregistrez une dette directe (emprunt/prêt) ou une vente à crédit depuis la caisse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 hover:bg-amber-100 cursor-pointer"
            >
              + Ajouter une dette
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
