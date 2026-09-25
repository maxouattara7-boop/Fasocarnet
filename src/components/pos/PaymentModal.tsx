import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { customersService } from '../../db/services/customersService';
import { formatCurrency, calculateChange } from '../../utils/formatters';
import { cleanPhoneNumber, isValidPhoneNumber } from '../../utils/phoneValidation';
import { useAppStore } from '../../store/appStore';
import { Banknote, Smartphone, UserPlus, Search, X, Check, Split, CreditCard, ShieldCheck, AlertTriangle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: PaymentMethod;
    isCredit: boolean;
    isPartialCredit?: boolean;
    paidAmount?: number;
    creditAmount?: number;
    downPaymentMethod?: PaymentMethod;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    receivedAmount?: number;
    changeAmount?: number;
    transactionRef?: string;
    notes?: string;
  }) => Promise<void>;
}

type ExtendedPaymentMethod = PaymentMethod | 'PARTIAL';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  totalAmount,
  onClose,
  onConfirm
}) => {
  const { shopProfile } = useAppStore();
  const [method, setMethod] = useState<ExtendedPaymentMethod>('CASH');
  const [receivedAmountStr, setReceivedAmountStr] = useState<string>(totalAmount.toString());
  const [downPaymentStr, setDownPaymentStr] = useState<string>('');
  const [downPaymentMethod, setDownPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  
  // Gestion clients pour crédit ou paiement partiel
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
      setDownPaymentStr(Math.round(totalAmount / 2).toString());
      setMethod('CASH');
      setDownPaymentMethod('CASH');
      setTransactionRef('');
      setSelectedCustomer(null);
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
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

  const downPayment = parseFloat(downPaymentStr) || 0;
  const remainingDebt = Math.max(0, totalAmount - downPayment);

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

      const isCreditMode = method === 'CREDIT' || method === 'PARTIAL';

      if (isCreditMode && !finalCustomer && newCustomerName.trim() && newCustomerPhone.trim()) {
        const phoneValidation = isValidPhoneNumber(newCustomerPhone);
        if (!phoneValidation.isValid) {
          alert(`Numéro de téléphone du client invalide : ${phoneValidation.message}`);
          setIsSubmitting(false);
          return;
        }

        finalCustomer = await customersService.create({
          name: newCustomerName.trim(),
          phone: cleanPhoneNumber(newCustomerPhone)
        });
      }

      if (isCreditMode && !finalCustomer) {
        alert('Veuillez sélectionner ou créer un client pour accorder une vente à crédit ou avec acompte.');
        setIsSubmitting(false);
        return;
      }

      if (method === 'PARTIAL') {
        if (downPayment <= 0) {
          alert("Veuillez saisir un acompte supérieur à 0 FCFA ou choisir 'À Crédit' total.");
          setIsSubmitting(false);
          return;
        }
        if (downPayment >= totalAmount) {
          alert("L'acompte ne peut pas être égal ou supérieur au total. Utilisez le paiement comptant standard.");
          setIsSubmitting(false);
          return;
        }

        await onConfirm({
          paymentMethod: downPaymentMethod,
          isCredit: false,
          isPartialCredit: true,
          paidAmount: downPayment,
          creditAmount: remainingDebt,
          downPaymentMethod: downPaymentMethod,
          customerId: finalCustomer?.id,
          customerName: finalCustomer?.name,
          customerPhone: finalCustomer?.phone,
          receivedAmount: downPayment,
          changeAmount: 0,
          transactionRef: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined
        });
        return;
      }

      await onConfirm({
        paymentMethod: method === 'CREDIT' ? 'CREDIT' : method,
        isCredit: method === 'CREDIT',
        isPartialCredit: false,
        customerId: finalCustomer?.id,
        customerName: finalCustomer?.name,
        customerPhone: finalCustomer?.phone,
        receivedAmount: method === 'CASH' ? receivedAmount : totalAmount,
        changeAmount: method === 'CASH' ? changeAmount : 0,
        transactionRef: (method === 'ORANGE_MONEY' || method === 'MOOV_MONEY' || method === 'WAVE') ? transactionRef.trim() || undefined : undefined,
        notes: notes.trim() || undefined
      });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de la vente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
        {/* Header modal */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-display">Validation de la vente</span>
            <h3 className="text-xl font-extrabold text-emerald-700 tracking-tight font-display">{formatCurrency(totalAmount)}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps modal */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Choix du mode de paiement */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">
              Mode de règlement
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
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
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
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
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
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
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  method === 'WAVE'
                    ? 'border-[#1dc4fe] bg-sky-50 text-sky-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-0.5 text-[#1dc4fe] stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">Wave</span>
              </button>

              {/* NOUVEAU : Option Paiement Partiel (Acompte + Dette) */}
              <button
                type="button"
                onClick={() => setMethod('PARTIAL')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  method === 'PARTIAL'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Split className="w-5 h-5 mb-0.5 text-indigo-600 stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">Acompte + Dette</span>
              </button>

              {/* Crédit Total */}
              <button
                type="button"
                onClick={() => setMethod('CREDIT')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  method === 'CREDIT'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-0.5 text-amber-600 stroke-[2.2]" />
                <span className="text-[11px] font-bold font-display">100% Crédit</span>
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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

          {/* Si Paiement Partiel (Acompte + Dette) */}
          {method === 'PARTIAL' && (
            <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider font-display flex items-center space-x-1">
                  <Split className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ventilation Acompte & Reliquat</span>
                </span>
                <span className="text-xs font-black text-indigo-900">{formatCurrency(totalAmount)}</span>
              </div>

              {/* Canal de l'acompte */}
              <div>
                <label className="block text-[9px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Moyen de paiement de l'acompte
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'CASH', label: 'Cash' },
                    { id: 'ORANGE_MONEY', label: 'OM' },
                    { id: 'MOOV_MONEY', label: 'Moov' },
                    { id: 'WAVE', label: 'Wave' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDownPaymentMethod(m.id as any)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        downPaymentMethod === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saisie Acompte et Calcul Reliquat */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[9px] font-bold text-indigo-900 uppercase tracking-wider mb-0.5">
                    Acompte versé *
                  </label>
                  <input
                    type="number"
                    value={downPaymentStr}
                    onChange={(e) => setDownPaymentStr(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-bold text-base text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="Ex: 5000"
                  />
                </div>

                <div className="bg-amber-100/90 px-3 py-2 rounded-xl border border-amber-300 text-center flex flex-col justify-center">
                  <span className="text-[9px] text-amber-900 font-extrabold block uppercase tracking-wider font-display">Reste en dette</span>
                  <span className="text-base font-extrabold text-amber-950 tracking-tight font-display">{formatCurrency(remainingDebt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sécurisation & Réf Transaction pour Mobile Money */}
          {(method === 'ORANGE_MONEY' || method === 'MOOV_MONEY' || method === 'WAVE' || (method === 'PARTIAL' && downPaymentMethod !== 'CASH')) && (
            <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
              (method === 'ORANGE_MONEY' || (method === 'PARTIAL' && downPaymentMethod === 'ORANGE_MONEY'))
                ? 'bg-orange-50/80 border-orange-200'
                : (method === 'MOOV_MONEY' || (method === 'PARTIAL' && downPaymentMethod === 'MOOV_MONEY'))
                ? 'bg-blue-50/80 border-blue-200'
                : 'bg-sky-50/80 border-sky-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-display text-slate-800">
                    Contrôle Paiement Mobile
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-600">
                  {(() => {
                    const currentOp = method === 'PARTIAL' ? downPaymentMethod : method;
                    if (currentOp === 'ORANGE_MONEY') return `OM: ${shopProfile?.orangeMoneyNumber || 'Non renseigné'}`;
                    if (currentOp === 'MOOV_MONEY') return `Moov: ${shopProfile?.moovMoneyNumber || 'Non renseigné'}`;
                    if (currentOp === 'WAVE') return `Wave: ${shopProfile?.waveNumber || 'Non renseigné'}`;
                    return '';
                  })()}
                </span>
              </div>

              <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-tight">
                  <strong className="text-slate-900">Anti-Fraude :</strong> Vérifiez le SMS officiel et votre solde sur votre téléphone avant de valider.
                </p>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                  ID / Référence de Transaction (Recommandé)
                </label>
                <input
                  type="text"
                  placeholder="Ex: CI240925.1432.B81290 / Réf SMS..."
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Si À Crédit ou Paiement Partiel : Choix / Création Obligatoire du Client */}
          {(method === 'CREDIT' || method === 'PARTIAL') && (
            <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider font-display">
                  Client débiteur (Obligatoire)
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center space-x-1 transition-colors cursor-pointer"
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
                    placeholder="Numéro WhatsApp / Téléphone (Ex: 70 12 34 56) *"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(cleanPhoneNumber(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher un client existant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-500">
                        Aucun client trouvé. Cliquez sur <strong className="text-amber-800">+ Nouveau Client</strong> ci-dessus.
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
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
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note ou description optionnelle */}
          <div>
            <input
              type="text"
              placeholder="Note ou détails sur la vente (optionnel)..."
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
            className="w-1/3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-98 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isSubmitting
                ? 'Validation...'
                : method === 'PARTIAL'
                ? `Encaisser ${formatCurrency(downPayment)} + Dette`
                : method === 'CREDIT'
                ? 'Valider le Crédit'
                : 'Valider la Vente'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
