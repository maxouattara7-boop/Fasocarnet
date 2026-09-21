import React, { useState } from 'react';
import { customersService } from '../../db/services/customersService';
import { Customer } from '../../types';
import { UserPlus, X } from 'lucide-react';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Veuillez renseigner le nom et le numéro de téléphone.');
      return;
    }

    setIsSubmitting(true);
    try {
      const customer = await customersService.create({
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined
      });
      setName('');
      setPhone('');
      setNotes('');
      onCreated(customer);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl p-4 sm:p-5 space-y-3.5 animate-in zoom-in-95 duration-150 border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2 text-emerald-800">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 font-display">Nouveau Client</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-display">
              Nom complet *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Moussa Ouédraogo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-display">
              Numéro de téléphone / WhatsApp *
            </label>
            <input
              type="tel"
              required
              placeholder="Ex: 70 12 34 56"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-display">
              Note ou description (Optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Voisin boutique, mécanicien..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          <div className="pt-1 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-98"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
            >
              {isSubmitting ? 'Enregistrement...' : 'Créer le Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
