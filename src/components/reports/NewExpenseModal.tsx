import React, { useState } from 'react';
import { ExpenseCategory } from '../../types';
import { expensesService } from '../../db/services/expensesService';
import { formatCurrency } from '../../utils/formatters';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { 
  X, 
  Check, 
  Package, 
  Truck, 
  Lightbulb, 
  Utensils, 
  Users, 
  Crown, 
  FileText
} from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'STOCK', label: 'Achat Marchandises', icon: <Package className="w-4 h-4" />, color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
  { id: 'TRANSPORT', label: 'Transport / Taxi', icon: <Truck className="w-4 h-4" />, color: 'border-blue-500 bg-blue-50 text-blue-900' },
  { id: 'UTILITIES', label: 'Factures / Loyer', icon: <Lightbulb className="w-4 h-4" />, color: 'border-amber-500 bg-amber-50 text-amber-900' },
  { id: 'FOOD', label: 'Repas / Pause', icon: <Utensils className="w-4 h-4" />, color: 'border-orange-500 bg-orange-50 text-orange-900' },
  { id: 'SALARY', label: 'Salaire Employé', icon: <Users className="w-4 h-4" />, color: 'border-indigo-500 bg-indigo-50 text-indigo-900' },
  { id: 'OWNER_DRAW', label: 'Retrait Patron', icon: <Crown className="w-4 h-4" />, color: 'border-purple-500 bg-purple-50 text-purple-900' },
  { id: 'OTHER', label: 'Autre Dépense', icon: <FileText className="w-4 h-4" />, color: 'border-slate-400 bg-slate-50 text-slate-900' }
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('STOCK');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const amount = parseFloat(amountStr) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Veuillez saisir un montant supérieur à 0 FCFA.');
      return;
    }
    if (!title.trim()) {
      alert('Veuillez renseigner le motif de la dépense (ex: Achat sacs de riz).');
      return;
    }

    setIsSubmitting(true);
    try {
      await expensesService.create({
        title: title.trim(),
        amount,
        category,
        paymentMethod,
        notes: notes.trim() || undefined
      });

      triggerDoubleHaptic();
      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setAmountStr('');
      setCategory('STOCK');
      setPaymentMethod('CASH');
      setNotes('');
    } catch (err) {
      console.error('Erreur ajout dépense:', err);
      alert("Erreur lors de l'enregistrement de la dépense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
        {/* En-tête de la modale */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-700 to-rose-800 text-white">
          <div>
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider block font-display">Sortie de Caisse & Trésorerie</span>
            <h3 className="text-base font-black text-white font-display">Enregistrer une Dépense</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Montant de la dépense */}
          <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-rose-950 uppercase tracking-wider font-display">
                Montant dépensé en FCFA *
              </label>
              {amount > 0 && (
                <span className="text-xs font-black text-rose-700">{formatCurrency(amount)}</span>
              )}
            </div>
            <input
              type="number"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="Ex: 15000"
              className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
              autoFocus
            />
          </div>

          {/* Motif / Titre */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
              Motif de la dépense *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Réassort 5 cartons de savon, Facture SONABEL..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
            />
          </div>

          {/* Compte source débité */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-display">
              Compte ou Caisse débitée
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'CASH', label: 'Caisse (Cash)', color: 'border-emerald-600 bg-emerald-50 text-emerald-950' },
                { id: 'ORANGE_MONEY', label: 'OM', color: 'border-[#ff6600] bg-orange-50 text-orange-950' },
                { id: 'MOOV_MONEY', label: 'Moov', color: 'border-[#005baa] bg-blue-50 text-blue-950' },
                { id: 'WAVE', label: 'Wave', color: 'border-[#1dc4fe] bg-sky-50 text-sky-950' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(30);
                    setPaymentMethod(m.id as any);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    paymentMethod === m.id
                      ? `${m.color} font-black shadow-xs`
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catégories de dépenses */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-display">
              Catégorie de la dépense
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(30);
                    setCategory(cat.id);
                  }}
                  className={`p-2 rounded-xl text-left border flex items-center space-x-2 transition-all cursor-pointer ${
                    category === cat.id
                      ? `${cat.color} font-black shadow-xs`
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="shrink-0">{cat.icon}</span>
                  <span className="text-[11px] truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note / Détails complémentaires */}
          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles (fournisseur, N° reçu fournisseur...)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 outline-none transition-all"
            />
          </div>

          {/* Boutons d'action */}
          <div className="pt-2 flex space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0 || !title.trim()}
              className="w-2/3 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Valider la Dépense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
