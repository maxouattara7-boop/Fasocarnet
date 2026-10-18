import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { customersService } from '../../db/services/customersService';
import { formatCurrency } from '../../utils/formatters';
import { cleanPhoneNumber, isValidPhoneNumber } from '../../utils/phoneValidation';
import { useAppStore } from '../../store/appStore';
import { triggerHaptic } from '../../utils/haptics';
import { 
  Banknote, 
  Smartphone, 
  CreditCard, 
  UserPlus, 
  Search, 
  X, 
  Check, 
  Split 
} from 'lucide-react';

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

type MainCategory = 'CASH' | 'MOBILE_MONEY' | 'CREDIT';
type MobileOperator = 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE';
type CreditSubtype = 'FULL' | 'PARTIAL';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  totalAmount,
  onClose,
  onConfirm
}) => {
  const { shopProfile } = useAppStore();
  
  // 3 Modes de règlement principaux demandés
  const [mainCategory, setMainCategory] = useState<MainCategory>('CASH');
  
  // Sous-options Mobile Money
  const [mobileOperator, setMobileOperator] = useState<MobileOperator>('ORANGE_MONEY');
  const [transactionRef, setTransactionRef] = useState('');
  
  // Sous-options Crédit
  const [creditType, setCreditType] = useState<CreditSubtype>('FULL');
  const [downPaymentStr, setDownPaymentStr] = useState<string>('');
  const [downPaymentMethod, setDownPaymentMethod] = useState<PaymentMethod>('CASH');
  
  // Client débiteur
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMainCategory('CASH');
      setMobileOperator('ORANGE_MONEY');
      setCreditType('FULL');
      setDownPaymentStr(Math.round(totalAmount / 2).toString());
      setDownPaymentMethod('CASH');
      setTransactionRef('');
      setNotes('');
      setSelectedCustomer(null);
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setSearchQuery('');
      loadCustomers();
    }
  }, [isOpen, totalAmount]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'INPUT') return;
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mainCategory, mobileOperator, creditType, downPaymentStr, downPaymentMethod, selectedCustomer, newCustomerName, newCustomerPhone, transactionRef, notes, isSubmitting, totalAmount]);

  const loadCustomers = async () => {
    const list = await customersService.getAll();
    setCustomers(list);
  };

  if (!isOpen) return null;

  const downPayment = parseFloat(downPaymentStr) || 0;
  const remainingDebt = Math.max(0, totalAmount - downPayment);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. ESPÈCES (Comptant direct)
      if (mainCategory === 'CASH') {
        await onConfirm({
          paymentMethod: 'CASH',
          isCredit: false,
          isPartialCredit: false,
          paidAmount: totalAmount,
          receivedAmount: totalAmount,
          changeAmount: 0,
          notes: notes.trim() || undefined
        });
        return;
      }

      // 2. MOBILE MONEY
      if (mainCategory === 'MOBILE_MONEY') {
        await onConfirm({
          paymentMethod: mobileOperator,
          isCredit: false,
          isPartialCredit: false,
          paidAmount: totalAmount,
          receivedAmount: totalAmount,
          changeAmount: 0,
          transactionRef: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined
        });
        return;
      }

      // 3. CRÉDIT (Tout Crédit ou Avec Acompte)
      if (mainCategory === 'CREDIT') {
        let finalCustomer = selectedCustomer;

        // Création client si formulaire nouveau client rempli
        if (!finalCustomer && newCustomerName.trim() && newCustomerPhone.trim()) {
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

        if (!finalCustomer) {
          alert('Veuillez sélectionner ou créer un client pour accorder une vente à crédit.');
          setIsSubmitting(false);
          return;
        }

        // Cas Avec Acompte
        if (creditType === 'PARTIAL') {
          if (downPayment <= 0) {
            alert("Veuillez saisir un montant d'acompte supérieur à 0 FCFA ou choisir '100% Crédit'.");
            setIsSubmitting(false);
            return;
          }
          if (downPayment >= totalAmount) {
            alert("L'acompte ne peut pas être égal ou supérieur au total. Veuillez choisir Espèces ou Mobile Money.");
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
            customerId: finalCustomer.id,
            customerName: finalCustomer.name,
            customerPhone: finalCustomer.phone,
            receivedAmount: downPayment,
            changeAmount: 0,
            transactionRef: transactionRef.trim() || undefined,
            notes: notes.trim() || undefined
          });
          return;
        }

        // Cas 100% Crédit
        await onConfirm({
          paymentMethod: 'CREDIT',
          isCredit: true,
          isPartialCredit: false,
          paidAmount: 0,
          creditAmount: totalAmount,
          customerId: finalCustomer.id,
          customerName: finalCustomer.name,
          customerPhone: finalCustomer.phone,
          receivedAmount: 0,
          changeAmount: 0,
          notes: notes.trim() || undefined
        });
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du règlement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
        
        {/* En-tête : Titre & Montant */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block font-display">
              Validation de la vente
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-display mt-0.5">
              {formatCurrency(totalAmount)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-all cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps principal défilant */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* SECTION : 3 MODES DE RÈGLEMENT PRINCIPAUX */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 font-display">
              Mode de règlement
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* 1. Espèces */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setMainCategory('CASH');
                }}
                className={`py-3.5 px-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer font-display ${
                  mainCategory === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200/90 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <Banknote className={`w-6 h-6 mb-1 stroke-[2.2] ${mainCategory === 'CASH' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs sm:text-sm font-extrabold">Espèces</span>
              </button>

              {/* 2. Mobile Money */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setMainCategory('MOBILE_MONEY');
                }}
                className={`py-3.5 px-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer font-display ${
                  mainCategory === 'MOBILE_MONEY'
                    ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-black shadow-sm ring-2 ring-orange-500/20'
                    : 'border-slate-200/90 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <Smartphone className={`w-6 h-6 mb-1 stroke-[2.2] ${mainCategory === 'MOBILE_MONEY' ? 'text-orange-600' : 'text-slate-400'}`} />
                <span className="text-xs sm:text-sm font-extrabold truncate w-full">Mobile Money</span>
              </button>

              {/* 3. Crédit */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setMainCategory('CREDIT');
                }}
                className={`py-3.5 px-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer font-display ${
                  mainCategory === 'CREDIT'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-black shadow-sm ring-2 ring-amber-500/20'
                    : 'border-slate-200/90 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <CreditCard className={`w-6 h-6 mb-1 stroke-[2.2] ${mainCategory === 'CREDIT' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-xs sm:text-sm font-extrabold">Crédit</span>
              </button>
            </div>
          </div>

          {/* DÉTAIL 1 : ESPÈCES (SIMPLE & ÉPURÉ) */}
          {mainCategory === 'CASH' && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-center space-y-1 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider font-display">
                Paiement direct au comptant
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-950 font-display">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-xs text-slate-500 font-medium pt-0.5">
                La somme intégrale sera enregistrée dans votre caisse espèces.
              </p>
            </div>
          )}

          {/* DÉTAIL 2 : MOBILE MONEY (CHOIX OPÉRATEUR) */}
          {mainCategory === 'MOBILE_MONEY' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">
                  Sélectionnez l'opérateur Mobile Money
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileOperator('ORANGE_MONEY')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      mobileOperator === 'ORANGE_MONEY'
                        ? 'border-[#ff6600] bg-orange-50 text-orange-950 font-black ring-2 ring-orange-500/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600] mb-1"></span>
                    <span className="text-xs font-bold font-display">Orange Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileOperator('MOOV_MONEY')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      mobileOperator === 'MOOV_MONEY'
                        ? 'border-[#005baa] bg-blue-50 text-blue-950 font-black ring-2 ring-blue-500/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#005baa] mb-1"></span>
                    <span className="text-xs font-bold font-display">Moov Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileOperator('WAVE')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      mobileOperator === 'WAVE'
                        ? 'border-[#1dc4fe] bg-sky-50 text-sky-950 font-black ring-2 ring-sky-500/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1dc4fe] mb-1"></span>
                    <span className="text-xs font-bold font-display">Wave</span>
                  </button>
                </div>
              </div>

              {/* Rappel anti-fraude & Numéro boutique */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                <span className="font-semibold">
                  Compte marchand : {
                    mobileOperator === 'ORANGE_MONEY' ? shopProfile?.orangeMoneyNumber || 'Non configuré' :
                    mobileOperator === 'MOOV_MONEY' ? shopProfile?.moovMoneyNumber || 'Non configuré' :
                    shopProfile?.waveNumber || 'Non configuré'
                  }
                </span>
                <span className="text-[10px] text-amber-700 font-bold">Vérifiez le SMS</span>
              </div>

              {/* Réf transaction optionnelle */}
              <div>
                <input
                  type="text"
                  placeholder="ID ou Réf de transaction SMS (optionnel)..."
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* DÉTAIL 3 : CRÉDIT (AVEC ACOMPTE OU 100% CRÉDIT) */}
          {mainCategory === 'CREDIT' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              
              {/* Choix du type de crédit : Avec Acompte vs 100% Crédit */}
              <div>
                <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1.5 font-display">
                  Modalité du crédit
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setCreditType('FULL');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display ${
                      creditType === 'FULL'
                        ? 'bg-white text-amber-950 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Tout Crédit (100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setCreditType('PARTIAL');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display ${
                      creditType === 'PARTIAL'
                        ? 'bg-white text-indigo-950 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Split className="w-4 h-4 text-indigo-600" />
                    <span>Avec Acompte</span>
                  </button>
                </div>
              </div>

              {/* Si Avec Acompte : Champs acompte + reliquat dette */}
              {creditType === 'PARTIAL' && (
                <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200/80 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2.5 items-center">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-950 uppercase tracking-wider mb-1 font-display">
                        Acompte versé *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={totalAmount - 1}
                        value={downPaymentStr}
                        onChange={(e) => setDownPaymentStr(e.target.value)}
                        placeholder="Ex: 2000"
                        className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-black text-base text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                    </div>

                    <div className="bg-amber-100/90 p-2.5 rounded-xl border border-amber-300 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wider font-display">
                        Reste en crédit
                      </span>
                      <span className="text-base font-black text-amber-950 tracking-tight font-display">
                        {formatCurrency(remainingDebt)}
                      </span>
                    </div>
                  </div>

                  {/* Mode de règlement de l'acompte */}
                  <div>
                    <label className="block text-[9px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                      Moyen de règlement de l'acompte
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
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer font-display ${
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
                </div>
              )}

              {/* Sélection / Création Obligatoire du Client Débiteur */}
              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-amber-950 uppercase tracking-wider font-display">
                    Client débiteur (Obligatoire)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                    className="text-xs font-black text-amber-800 hover:text-amber-950 flex items-center space-x-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showNewCustomerForm ? 'Choisir existant' : '+ Nouveau Client'}</span>
                  </button>
                </div>

                {showNewCustomerForm ? (
                  <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Nom complet du client *"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Numéro WhatsApp / Téléphone (Ex: 70 12 34 56) *"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(cleanPhoneNumber(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom ou numéro..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>

                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="py-2.5 text-center text-xs text-slate-500">
                          Aucun client trouvé. Cliquez sur <strong className="text-amber-800">+ Nouveau Client</strong>.
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCustomer(c)}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                              selectedCustomer?.id === c.id
                                ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-xs'
                                : 'bg-white hover:bg-amber-100/60 text-slate-800 border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="font-extrabold">{c.name}</div>
                              <div className={`text-[10px] ${selectedCustomer?.id === c.id ? 'text-amber-100' : 'text-slate-500'}`}>
                                {c.phone}
                              </div>
                            </div>
                            {c.totalDebt > 0 && (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                                selectedCustomer?.id === c.id ? 'bg-amber-800 text-amber-100' : 'bg-red-100 text-red-700'
                              }`}>
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
            </div>
          )}

          {/* Note optionnelle */}
          <div>
            <input
              type="text"
              placeholder="Note ou détails sur la vente (optionnel)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Pied de page : Boutons d'action */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-2xl text-xs sm:text-sm transition-all active:scale-98 cursor-pointer font-display"
          >
            Annuler
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer font-display"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isSubmitting
                ? 'Validation...'
                : mainCategory === 'CASH'
                ? `Valider la Vente (${formatCurrency(totalAmount)})`
                : mainCategory === 'MOBILE_MONEY'
                ? `Valider (${formatCurrency(totalAmount)})`
                : creditType === 'PARTIAL'
                ? `Encaisser ${formatCurrency(downPayment)} + Dette`
                : `Valider Crédit (${formatCurrency(totalAmount)})`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
