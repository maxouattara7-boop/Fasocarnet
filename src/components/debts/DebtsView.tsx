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
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
      {/* Carte du Total Général des Créances */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-900 text-white p-6 rounded-3xl shadow-xl space-y-2 border border-amber-500/40">
        <div className="flex items-center justify-between text-amber-200 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4" />
            <span>Total des Dettes Clients</span>
          </div>
          <span>{debtorCustomers.length} Débiteur(s)</span>
        </div>

        <div className="text-3xl sm:text-4xl font-black text-white">
          {formatCurrency(totalOutstanding)}
        </div>

        <p className="text-[11px] text-amber-200/80">
          Argent en circulation à recouvrer auprès de vos clients
        </p>
      </div>

      {/* Barre de recherche et Bouton d'ajout */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center"
          title="Nouveau Client"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Liste des clients */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center space-y-3 border border-gray-100 shadow-sm">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
            <div>
              <h4 className="font-bold text-gray-700 text-sm">Aucun client trouvé</h4>
              <p className="text-xs text-gray-400 mt-1">
                Créez un nouveau client ou enregistrez une vente à crédit depuis la caisse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 hover:bg-emerald-100"
            >
              + Ajouter un premier client
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
