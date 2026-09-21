import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { customersService } from '../../db/services/customersService';
import { formatCurrency, calculateChange } from '../../utils/formatters';
import { Banknote, Smartphone, UserPlus, Search, X, Check } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: PaymentMethod;
    isCredit: boolean;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    receivedAmount?: number;
    changeAmount?: number;
    notes?: string;
  }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  totalAmount,
  onClose,
  onConfirm
}) => {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [receivedAmountStr, setReceivedAmountStr] = useState<string>(totalAmount.toString());
  const [notes, setNotes] = useState('');
  
  // Gestion clients pour crédit ou reçu
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReceivedAmountStr(totalAmount.toString());
      setMethod('CASH');
      setSelectedCustomer(null);
      setShowNewCustomerForm(false);
      loadCustomers();
    }
  }, [isOpen, totalAmount]);

  const loadCustomers = async () => {
    const list = await customersService.getAll();
    setCustomers(list);
  };

  if (!isOpen) return null;

  const receivedAmount = parseFloat(receivedAmountStr) || 0;
  const changeAmount = calculateChange(totalAmount, receivedAmount);

  const billPresets = [totalAmount, 1000, 2000, 5000, 10000, 20000].filter(
    (b, i, self) => b >= totalAmount && self.indexOf(b) === i
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let finalCustomer = selectedCustomer;

      if (method === 'CREDIT' && !finalCustomer && newCustomerName && newCustomerPhone) {
        finalCustomer = await customersService.create({
          name: newCustomerName,
          phone: newCustomerPhone
        });
      }

      if (method === 'CREDIT' && !finalCustomer) {
        alert('Veuillez sélectionner ou créer un client pour accorder une vente à crédit.');
        setIsSubmitting(false);
        return;
      }

      await onConfirm({
        paymentMethod: method,
        isCredit: method === 'CREDIT',
        customerId: finalCustomer?.id,
        customerName: finalCustomer?.name,
        customerPhone: finalCustomer?.phone,
        receivedAmount: method === 'CASH' ? receivedAmount : totalAmount,
        changeAmount: method === 'CASH' ? changeAmount : 0,
        notes: notes.trim() || undefined
      });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
        {/* Header modal */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-display">Validation de la vente</span>
            <h3 className="text-xl font-extrabold text-emerald-700 tracking-tight font-display">{formatCurrency(totalAmount)}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps modal */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Choix du mode de paiement */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">
              Mode de paiement
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                  method === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Banknote className="w-5 h-5 mb-0.5 text-emerald-600 stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">Espèces</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('ORANGE_MONEY')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                  method === 'ORANGE_MONEY'
                    ? 'border-[#ff6600] bg-orange-50 text-orange-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-0.5 text-[#ff6600] stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">Orange Money</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('MOOV_MONEY')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                  method === 'MOOV_MONEY'
                    ? 'border-[#005baa] bg-blue-50 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-0.5 text-[#005baa] stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">Moov Money</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('WAVE')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                  method === 'WAVE'
                    ? 'border-[#1dc4fe] bg-sky-50 text-sky-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-0.5 text-[#1dc4fe] stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">Wave</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('CREDIT')}
                className={`col-span-2 p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                  method === 'CREDIT'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300"></span>
                <span className="text-[11px] font-bold font-display">À Crédit (Carnet de dettes)</span>
              </button>
            </div>
          </div>

          {/* Si Espèces : Calcul de la monnaie */}
          {method === 'CASH' && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider font-display">
                Billet reçu du client
              </label>
              
              <div className="flex flex-wrap gap-1.5">
                {billPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReceivedAmountStr(preset.toString())}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      receivedAmount === preset
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="relative">
                  <input
                    type="number"
                    value={receivedAmountStr}
                    onChange={(e) => setReceivedAmountStr(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-base text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    placeholder="Montant reçu"
                  />
                </div>
                <div className="bg-emerald-100/80 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-center flex flex-col justify-center">
                  <span className="text-[9px] text-emerald-800 font-extrabold block uppercase tracking-wider font-display">Monnaie à rendre</span>
                  <span className="text-base font-extrabold text-emerald-900 tracking-tight">{formatCurrency(changeAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Si À Crédit : Choix du Client */}
          {method === 'CREDIT' && (
            <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider font-display">
                  Client bénéficiaire
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1 transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{showNewCustomerForm ? 'Choisir existant' : '+ Nouveau Client'}</span>
                </button>
              </div>

              {showNewCustomerForm ? (
                <div className="space-y-2 pt-0.5">
                  <input
                    type="text"
                    placeholder="Nom complet du client *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                  <input
                    type="tel"
                    placeholder="Numéro WhatsApp / Téléphone *"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                          selectedCustomer?.id === c.id
                            ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-xs'
                            : 'bg-white hover:bg-amber-100/70 text-slate-800 border-slate-100'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{c.name}</div>
                          <div className={`text-[10px] ${selectedCustomer?.id === c.id ? 'text-amber-100' : 'text-slate-500'}`}>{c.phone}</div>
                        </div>
                        {c.totalDebt > 0 && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${selectedCustomer?.id === c.id ? 'bg-amber-800 text-amber-100' : 'bg-red-100 text-red-700'}`}>
                            Dû: {formatCurrency(c.totalDebt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note ou description optionnelle */}
          <div>
            <input
              type="text"
              placeholder="Note ou article (ex: 2 sacs de ciment)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-98"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isSubmitting ? 'Validation...' : 'Valider la Vente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
