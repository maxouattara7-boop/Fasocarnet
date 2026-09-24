import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { debtsService } from '../../db/services/debtsService';
import { formatCurrency } from '../../utils/formatters';
import { generateWhatsAppDebtPaymentReceiptUrl } from '../../utils/whatsapp';
import { soundEffects } from '../../utils/soundEffects';
import { useAppStore } from '../../store/appStore';
import { X, Check, MessageSquare } from 'lucide-react';

interface DebtPaymentModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  customer,
  onClose,
  onPaymentSuccess
}) => {
  const { shopProfile } = useAppStore();
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    amountPaid: number;
    newRemaining: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      setAmountStr('');
      setPaymentMethod('CASH');
      setIsSubmitting(false);
      setSuccessReceipt(null);
    }
  }, [isOpen, customer?.id]);

  const handleClose = () => {
    setSuccessReceipt(null);
    setAmountStr('');
    onClose();
  };

  if (!isOpen || !customer) return null;

  const handleFullAmount = () => {
    setAmountStr(customer.totalDebt.toString());
  };

  const handlePay = async () => {
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) {
      alert('Veuillez saisir un montant supérieur à 0.');
      return;
    }
    if (amount > customer.totalDebt) {
      alert(`Le montant ne peut pas dépasser la dette totale (${formatCurrency(customer.totalDebt)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const activeDebts = await debtsService.getByCustomerId(customer.id);
      const pendingDebts = activeDebts.filter(d => d.status === 'PENDING' || d.status === 'PARTIAL');

      let remainingToPay = amount;
      for (const d of pendingDebts) {
        if (remainingToPay <= 0) break;
        const toPayForThisDebt = Math.min(remainingToPay, d.remainingAmount);
        await debtsService.recordPayment(
          d.id,
          toPayForThisDebt,
          paymentMethod as any
        );
        remainingToPay -= toPayForThisDebt;
      }

      const newRemainingDebt = Math.max(0, customer.totalDebt - amount);
      soundEffects.notifySaleSuccess(amount, false);
      setSuccessReceipt({
        amountPaid: amount,
        newRemaining: newRemainingDebt
      });
      onPaymentSuccess();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du règlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppReceipt = () => {
    if (!successReceipt) return;
    const url = generateWhatsAppDebtPaymentReceiptUrl(
      customer.name,
      customer.phone,
      successReceipt.amountPaid,
      successReceipt.newRemaining,
      shopProfile || undefined
    );
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl p-4 sm:p-5 space-y-3.5 animate-in slide-in-from-bottom duration-200 border border-slate-100">
        {!successReceipt ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight font-display">Encaisser un Versement</h3>
                <p className="text-[11px] text-slate-500 font-medium">Client : <span className="font-bold text-slate-800">{customer.name}</span></p>
              </div>
              <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-display">Dette Actuelle :</span>
              <span className="text-base font-extrabold text-amber-900 tracking-tight font-display">{formatCurrency(customer.totalDebt)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-display">Montant versé</label>
                <button
                  type="button"
                  onClick={handleFullAmount}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Tout solder ({formatCurrency(customer.totalDebt)})
                </button>
              </div>
              <input
                type="number"
                placeholder="Montant du versement en FCFA"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            {/* Mode de paiement */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Mode d'encaissement</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'CASH', label: 'Cash', color: 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold' },
                  { id: 'ORANGE_MONEY', label: 'OM', color: 'border-[#ff6600] bg-orange-50 text-orange-950 font-bold' },
                  { id: 'MOOV_MONEY', label: 'Moov', color: 'border-[#005baa] bg-blue-50 text-blue-950 font-bold' },
                  { id: 'WAVE', label: 'Wave', color: 'border-[#1dc4fe] bg-sky-50 text-sky-950 font-bold' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all font-display ${
                      paymentMethod === m.id ? m.color : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 flex space-x-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-98"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePay}
                className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Validation...' : 'Valider le Règlement'}</span>
              </button>
            </div>
          </>
        ) : (
          /* Confirmation et envoi du reçu WhatsApp */
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-50">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight font-display">Règlement Enregistré !</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Versement de <span className="font-extrabold text-emerald-700">{formatCurrency(successReceipt.amountPaid)}</span>
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                Nouveau solde dû : <span className="font-bold text-amber-800">{formatCurrency(successReceipt.newRemaining)}</span>
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsAppReceipt}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs shadow-md shadow-green-600/20 flex items-center justify-center space-x-1.5 active:scale-98 transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Envoyer le Reçu par WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
