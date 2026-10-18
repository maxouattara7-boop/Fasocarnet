import React, { useState, useEffect } from 'react';
import { Customer, DebtPayment, DebtRecord } from '../../types';
import { customersService } from '../../db/services/customersService';
import { debtsService } from '../../db/services/debtsService';
import { CustomerCard } from './CustomerCard';
import { NewCustomerModal } from './NewCustomerModal';
import { DebtPaymentModal } from './PaymentModal';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { generateWhatsAppDebtReminderUrl } from '../../utils/whatsapp';
import { useAppStore } from '../../store/appStore';
import { 
  Search, 
  UserPlus, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Phone, 
  ArrowDownRight, 
  Clock, 
  UserCheck,
  X
} from 'lucide-react';

export const DebtsView: React.FC = () => {
  const { shopProfile } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'settled' | 'all'>('active');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<{ debts: DebtRecord[]; payments: DebtPayment[] }>({
    debts: [],
    payments: []
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadData();

    const handleDbUpdated = () => {
      loadData();
    };
    window.addEventListener('fasocarnet_database_updated', handleDbUpdated);

    return () => {
      window.removeEventListener('fasocarnet_database_updated', handleDbUpdated);
    };
  }, []);

  const loadData = async () => {
    const list = await customersService.getAll();
    setCustomers(list);
    if (list.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(list[0].id);
    }
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

  // Mettre à jour l'historique du client sélectionné
  useEffect(() => {
    if (!selectedCustomerId) {
      if (displayedList.length > 0) {
        setSelectedCustomerId(displayedList[0].id);
      }
      return;
    }

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await debtsService.getCustomerFullDebtHistory(selectedCustomerId);
        setSelectedCustomerHistory(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedCustomerId, customers]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || displayedList[0] || null;

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    triggerHaptic(50);
    await customersService.delete(customerToDelete.id);
    if (selectedCustomerId === customerToDelete.id) {
      setSelectedCustomerId(null);
    }
    setCustomerToDelete(null);
    await loadData();
  };

  const handleWhatsAppReminder = (customer: Customer) => {
    const url = generateWhatsAppDebtReminderUrl(
      customer,
      { remainingAmount: customer.totalDebt },
      shopProfile || undefined
    );
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-12 space-y-6">
      
      {/* EN-TÊTE DE LA VUE DETTES & ACTION PRINCIPALE */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 font-bold shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
              Carnet de Dettes & Clients
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Suivez les créances en cours, envoyez des relances WhatsApp et enregistrez les règlements d'acomptes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="py-3 px-5 bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer font-display shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Nouveau Client / Dette</span>
        </button>
      </div>

      {/* 3 CARTES KPI SYNTHÉTIQUES EN EN-TÊTE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 : Total Général des Créances */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-extrabold px-2.5 py-1 rounded-full font-display">
              Créances Actives
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              Total des Dettes Clients
            </span>
            <div className="text-2xl font-black text-amber-600 font-display mt-0.5">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Argent à recouvrer auprès des clients
            </p>
          </div>
        </div>

        {/* KPI 2 : Débiteurs Actifs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-orange-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-700 border border-orange-200/60 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="bg-orange-50 text-orange-800 border border-orange-200/60 text-[10px] font-extrabold px-2.5 py-1 rounded-full font-display">
              {debtorCustomers.length} en attente
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              Clients Débiteurs
            </span>
            <div className="text-2xl font-black text-slate-900 font-display mt-0.5">
              {debtorCustomers.length} <span className="text-sm font-semibold text-slate-500">client{debtorCustomers.length > 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {debtorCustomers.length > 0 ? 'Relances WhatsApp programmables' : 'Aucune dette en retard'}
            </p>
          </div>
        </div>

        {/* KPI 3 : Dettes Soldées */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-extrabold px-2.5 py-1 rounded-full font-display">
              Règlements Complets
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-display">
              Comptes Soldés
            </span>
            <div className="text-2xl font-black text-emerald-600 font-display mt-0.5">
              {settledCustomers.length} <span className="text-sm font-semibold text-slate-500">client{settledCustomers.length > 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Dettes intégralement remboursées
            </p>
          </div>
        </div>
      </div>

      {/* DISPOSITION RESPONSIVE : 2 COLONNES SUR GRAND ÉCRAN (5 COLS / 7 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLONNE GAUCHE (5 COLONNES) : RECHERCHE, ONGLETS & LISTE DES CLIENTS */}
        <div className="lg:col-span-5 space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par nom de client ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none shadow-2xs text-slate-800 placeholder-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Onglets Dettes En cours vs Dettes Soldées vs Tous */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display ${
                filterTab === 'active'
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>En cours</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                filterTab === 'active' ? 'bg-amber-800/80 text-amber-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {debtorCustomers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('settled')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display ${
                filterTab === 'settled'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Soldées</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                filterTab === 'settled' ? 'bg-emerald-800/80 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {settledCustomers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center transition-all cursor-pointer font-display ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tous ({customers.length})</span>
            </button>
          </div>

          {/* Liste des clients */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedList.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl text-center space-y-3 border border-slate-200/80 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                  {filterTab === 'settled' ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <BookOpen className="w-6 h-6" />}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm font-display">
                    {filterTab === 'settled' ? 'Aucune dette soldée' : 'Aucune dette trouvée'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {filterTab === 'settled' 
                      ? 'Les dettes entièrement réglées apparaîtront ici.'
                      : 'Enregistrez une nouvelle dette manuelle ou une vente à crédit depuis la caisse.'}
                  </p>
                </div>
                {filterTab === 'active' && (
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-2xl shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer font-display active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Ajouter une première dette</span>
                  </button>
                )}
              </div>
            ) : (
              displayedList.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;
                return (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-amber-500 rounded-2xl shadow-sm' : ''
                    }`}
                  >
                    <CustomerCard
                      customer={customer}
                      onPayDebt={(c) => setPayingCustomer(c)}
                      onDelete={(c) => setCustomerToDelete(c)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE DROITE (DESKTOP) : FICHE CLIENT & GRAND HISTORIQUE */}
        <div className="hidden lg:block lg:col-span-7 space-y-4 lg:sticky lg:top-6">
          {selectedCustomer ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5 animate-in fade-in">
              {/* En-tête de la Fiche Client */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-lg shadow-xs font-display shrink-0">
                    {selectedCustomer.name ? selectedCustomer.name.slice(0, 2).toUpperCase() : 'CL'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900 font-display truncate">
                      {selectedCustomer.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedCustomer.phone}</span>
                      {selectedCustomer.notes && (
                        <span className="text-slate-400 text-[11px] truncate">• {selectedCustomer.notes}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Client inscrit le {formatDateTime(selectedCustomer.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Badge Montant Dette */}
                <div className="text-right shrink-0 ml-3">
                  {selectedCustomer.totalDebt > 0 ? (
                    <>
                      <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block font-display">
                        Solde Débiteur
                      </span>
                      <div className="text-2xl font-black text-amber-600 font-display">
                        {formatCurrency(selectedCustomer.totalDebt)}
                      </div>
                      <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full mt-1 bg-amber-100 text-amber-800 border border-amber-200">
                        Dette Active
                      </span>
                    </>
                  ) : (
                    <div className="bg-emerald-50 px-3 py-2 rounded-2xl border border-emerald-200 flex items-center space-x-2 text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <div className="text-xs font-black uppercase tracking-wider font-display">Compte Soldé</div>
                        <div className="text-[11px] font-bold text-emerald-600">0 FCFA dû</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Barre d'Actions Client : Relance WhatsApp & Encaisser Règlement */}
              {selectedCustomer.totalDebt > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppReminder(selectedCustomer)}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer font-display"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Relancer sur WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayingCustomer(selectedCustomer)}
                    className="py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black flex items-center justify-center space-x-2 shadow-md shadow-amber-600/20 active:scale-98 transition-all cursor-pointer font-display"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Encaisser un Versement</span>
                  </button>
                </div>
              )}

              {/* Grand Journal Chronologique : Dettes et Règlements */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2 text-slate-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider font-display">
                      Historique des Échéances & Versements
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {selectedCustomerHistory.debts.length} dette(s) • {selectedCustomerHistory.payments.length} versement(s)
                  </span>
                </div>

                {isLoadingHistory ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Chargement du journal chronologique...
                  </div>
                ) : selectedCustomerHistory.debts.length === 0 && selectedCustomerHistory.payments.length === 0 ? (
                  <div className="p-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                    Aucun mouvement enregistré pour ce client.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {/* Liste des dettes contractées */}
                    {selectedCustomerHistory.debts.map((d) => (
                      <div key={d.id} className="bg-slate-50/80 p-3 rounded-2xl border border-slate-150 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black shrink-0">
                            🔴
                          </div>
                          <div>
                            <p className="font-extrabold text-xs text-slate-900">
                              Dette contractée : {formatCurrency(d.initialAmount)}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Date : {formatDateTime(d.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                          d.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.status === 'PAID' ? 'Soldée' : `Reste: ${formatCurrency(d.remainingAmount)}`}
                        </span>
                      </div>
                    ))}

                    {/* Liste des règlements enregistrés */}
                    {selectedCustomerHistory.payments.map((p) => (
                      <div key={p.id} className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-150 flex items-center justify-between hover:bg-emerald-50/70 transition-colors">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                            🟢
                          </div>
                          <div>
                            <p className="font-extrabold text-xs text-emerald-950">
                              Versement reçu : +{formatCurrency(p.amount)} ({p.paymentMethod})
                            </p>
                            <p className="text-[10px] text-emerald-800/80 font-medium">
                              Reçu le {formatDateTime(p.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                          Encaissé
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/90 shadow-xs text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-black text-sm text-slate-800 font-display">Sélectionnez un client</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Cliquez sur un client à gauche pour afficher sa fiche détaillée, son historique complet et ses options de relance WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Création Client & Nouvelle Dette */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCreated={() => loadData()}
      />

      {/* Modal Enregistrement Règlement de Dette */}
      {payingCustomer && (
        <DebtPaymentModal
          customer={payingCustomer}
          isOpen={true}
          onClose={() => setPayingCustomer(null)}
          onPaymentSuccess={() => loadData()}
        />
      )}

      {/* Modal de Confirmation de Suppression */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 border border-slate-100">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Supprimer la dette ?</h3>
                <p className="text-xs text-slate-500">{customerToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement ce client et tout son historique de dettes ({formatCurrency(customerToDelete.totalDebt)}) ? Cette action est irréversible.
            </p>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
