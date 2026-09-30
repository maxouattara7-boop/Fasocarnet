import React, { useState, useEffect } from 'react';
import { CustomInvoice, CustomInvoiceItem, CustomInvoiceType, Product, Customer } from '../../types';
import { customInvoiceService } from '../../db/services/customInvoiceService';
import { productsService } from '../../db/services/productsService';
import { customersService } from '../../db/services/customersService';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/formatters';
import { generateCustomInvoiceWhatsAppMessage, printCustomInvoice } from '../../utils/customInvoiceRenderer';
import { downloadOrShareCustomInvoicePdf } from '../../utils/customInvoicePdfGenerator';
import { getLegalArreteMention } from '../../utils/numberToWords';
import { openWhatsApp } from '../../utils/whatsapp';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Printer, 
  Share2, 
  Search, 
  User, 
  Phone, 
  Edit3, 
  ArrowLeft,
  Package,
  FileDown,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  FileCheck,
  X
} from 'lucide-react';

export const InvoicesView: React.FC = () => {
  const { shopProfile } = useAppStore();
  const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');
  const [documents, setDocuments] = useState<CustomInvoice[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INVOICE' | 'QUOTE' | 'PAID' | 'PENDING'>('ALL');

  // État du formulaire d'édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [docType, setDocType] = useState<CustomInvoiceType>('INVOICE');
  const [docNumber, setDocNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientIfu, setClientIfu] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<CustomInvoiceItem[]>([]);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'SENT' | 'PAID'>('DRAFT');

  // Suggestions & modals d'appoint
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [generatingPdfDocId, setGeneratingPdfDocId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, prods, custs] = await Promise.all([
        customInvoiceService.getAll(),
        productsService.getAll(),
        customersService.getAll()
      ]);
      setDocuments(docs);
      setCatalogProducts(prods);
      setExistingCustomers(custs);
    } catch (err) {
      console.error('Erreur chargement factures/devis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewDoc = async (type: CustomInvoiceType = 'INVOICE') => {
    const generatedNum = await customInvoiceService.generateNumber(type);
    setEditingId(null);
    setDocType(type);
    setDocNumber(generatedNum);
    setClientName('');
    setClientPhone('');
    setClientAddress('');
    setClientIfu('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate('');
    setItems([
      {
        id: `item_${Date.now()}_1`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }
    ]);
    setDiscountType('NONE');
    setDiscountValue(0);
    setTaxRate(0);
    setPaymentTerms(
      type === 'QUOTE' 
        ? 'Devis valable 15 jours. Paiement à la commande.' 
        : 'Paiement comptant à la livraison.'
    );
    setNotes('');
    setStatus(type === 'QUOTE' ? 'DRAFT' : 'SENT');
    setViewMode('EDITOR');
  };

  const handleEditDoc = (doc: CustomInvoice) => {
    setEditingId(doc.id);
    setDocType(doc.type);
    setDocNumber(doc.number);
    setClientName(doc.clientName);
    setClientPhone(doc.clientPhone || '');
    setClientAddress(doc.clientAddress || '');
    setClientIfu(doc.clientIfu || '');
    setIssueDate(doc.issueDate);
    setDueDate(doc.dueDate || '');
    setItems(doc.items.length > 0 ? doc.items : [
      {
        id: `item_${Date.now()}_1`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }
    ]);
    if (doc.discountAmount && doc.discountAmount > 0) {
      setDiscountType(doc.discountType || 'AMOUNT');
      setDiscountValue(doc.discountValue || doc.discountAmount);
    } else {
      setDiscountType('NONE');
      setDiscountValue(0);
    }
    setTaxRate(doc.taxRate || 0);
    setPaymentTerms(doc.paymentTerms || '');
    setNotes(doc.notes || '');
    setStatus(doc.status === 'CANCELLED' ? 'DRAFT' : doc.status);
    setViewMode('EDITOR');
  };

  const handleSelectExistingCustomer = (cust: Customer) => {
    setClientName(cust.name);
    setClientPhone(cust.phone);
  };

  const handleAddItem = (product?: Product) => {
    const newItem: CustomInvoiceItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product?.id,
      description: product ? product.name : '',
      quantity: 1,
      unitPrice: product ? product.price : 0,
      totalPrice: product ? product.price : 0
    };
    setItems(prev => [...prev, newItem]);
    setIsProductPickerOpen(false);
  };

  const handleUpdateItem = (index: number, updates: Partial<CustomInvoiceItem>) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[index], ...updates };
      item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
      next[index] = item;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculs financiers
  const subtotal = items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
  
  let discountAmount = 0;
  if (discountType === 'PERCENT') {
    discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  } else if (discountType === 'AMOUNT') {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * Math.min(100, Math.max(0, taxRate))) / 100);
  const totalAmount = taxableAmount + taxAmount;

  const handleSaveDocument = async () => {
    if (!clientName.trim()) {
      alert('Veuillez renseigner le nom du client');
      return;
    }

    const validItems = items.filter(it => it.description.trim() !== '' && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Veuillez ajouter au moins une ligne d\'article avec une quantité valide');
      return;
    }

    try {
      const docData: Omit<CustomInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
        type: docType,
        number: docNumber,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        clientAddress: clientAddress.trim() || undefined,
        clientIfu: clientIfu.trim() || undefined,
        issueDate,
        dueDate: dueDate || undefined,
        items: validItems,
        subtotal,
        discountType: discountType === 'NONE' ? undefined : discountType,
        discountValue,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount,
        paymentTerms: paymentTerms.trim() || undefined,
        notes: notes.trim() || undefined,
        status
      };

      if (editingId) {
        await customInvoiceService.update(editingId, docData);
      } else {
        await customInvoiceService.create(docData);
      }

      await loadData();
      setViewMode('LIST');
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      alert('Une erreur est survenue lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (window.confirm(`Confirmer la suppression définitive du document ${number} ?`)) {
      await customInvoiceService.delete(id);
      await loadData();
    }
  };

  const handleWhatsAppShare = (doc: CustomInvoice) => {
    if (!shopProfile) return;
    const msg = generateCustomInvoiceWhatsAppMessage(doc, shopProfile);
    openWhatsApp({ phone: doc.clientPhone, message: msg });
  };

  const handlePrint = (doc: CustomInvoice) => {
    if (!shopProfile) return;
    printCustomInvoice(doc, shopProfile);
  };

  const handleDownloadPdf = async (doc: CustomInvoice) => {
    if (!shopProfile) return;
    try {
      setGeneratingPdfDocId(doc.id);
      await downloadOrShareCustomInvoicePdf(doc, shopProfile);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPdfDocId(null);
    }
  };

  const handleToggleStatus = async (doc: CustomInvoice) => {
    const nextStatus = doc.status === 'PAID' ? 'SENT' : 'PAID';
    await customInvoiceService.update(doc.id, { status: nextStatus });
    await loadData();
  };

  // Filtrage des documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.clientPhone && doc.clientPhone.includes(searchQuery));
    
    if (!matchesSearch) return false;

    if (typeFilter === 'ALL') return true;
    if (typeFilter === 'INVOICE') return doc.type === 'INVOICE';
    if (typeFilter === 'QUOTE') return doc.type === 'QUOTE';
    if (typeFilter === 'PAID') return doc.status === 'PAID';
    if (typeFilter === 'PENDING') return doc.status !== 'PAID';
    return true;
  });

  // KPI calculés
  const totalInvoiced = documents.filter(d => d.type === 'INVOICE').reduce((sum, d) => sum + d.totalAmount, 0);
  const totalQuotes = documents.filter(d => d.type === 'QUOTE').reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = documents.filter(d => d.type === 'INVOICE' && d.status === 'PAID').reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPending = documents.filter(d => d.type === 'INVOICE' && d.status !== 'PAID').reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-12 space-y-6">
      {viewMode === 'LIST' ? (
        <>
          {/* BARRE SUPÉRIEURE : TITRE & BOUTONS D'ACTION */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-inner">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">Factures & Devis</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {documents.length} document{documents.length > 1 ? 's' : ''} enregistré{documents.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleStartNewDoc('QUOTE')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-2xl text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-display"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Devis</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartNewDoc('INVOICE')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-display"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Facture</span>
              </button>
            </div>
          </div>

          {/* KPI STATISTIQUES FACTURATION (DESIGN PREMIUM CENTRÉ & ÉPURÉ) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Carte 1 : Total Facturé */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                <DollarSign className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-display">
                Total Facturé
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-display tracking-tight my-1">
                {formatCurrency(totalInvoiced)}
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full mt-1">
                Toutes factures confondues
              </span>
            </div>

            {/* Carte 2 : Factures Encaissées */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                <CheckCircle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 font-display">
                Factures Encaissées
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-700 font-display tracking-tight my-1">
                {formatCurrency(totalPaid)}
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full mt-1">
                Règlements reçus
              </span>
            </div>

            {/* Carte 3 : Factures En Attente */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 font-display">
                Factures En Attente
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-700 font-display tracking-tight my-1">
                {formatCurrency(totalPending)}
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full mt-1">
                À encaisser
              </span>
            </div>

            {/* Carte 4 : Devis Émis */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                <FileCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 font-display">
                Devis Émis
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-900 font-display tracking-tight my-1">
                {formatCurrency(totalQuotes)}
              </div>
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full mt-1">
                Propositions émises
              </span>
            </div>
          </div>

          {/* RECHERCHE & FILTRES */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par n° de facture, nom du client ou téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Onglets Filtres */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl gap-1 text-[11px] font-bold overflow-x-auto w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    typeFilter === 'ALL' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('INVOICE')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    typeFilter === 'INVOICE' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Factures
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('QUOTE')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    typeFilter === 'QUOTE' ? 'bg-white text-amber-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Devis
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('PAID')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    typeFilter === 'PAID' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payées
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    typeFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  En attente
                </button>
              </div>
            </div>
          </div>

          {/* LISTE DES DOCUMENTS */}
          {isLoading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-xs text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="mt-3 text-xs font-bold text-slate-500">Chargement de vos factures & devis...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Aucun document trouvé</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {searchQuery 
                    ? `Aucun document ne correspond à "${searchQuery}".` 
                    : "Créez votre premier devis ou votre première facture professionnelle dès maintenant."}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleStartNewDoc('INVOICE')}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer font-display flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer une Facture</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartNewDoc('QUOTE')}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer font-display flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer un Devis</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const isInvoice = doc.type === 'INVOICE';
                const isPaid = doc.status === 'PAID';

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* En-tête de la carte */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-display ${
                              isInvoice ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isInvoice ? 'Facture' : 'Devis'}
                            </span>
                            <span className="font-mono text-xs font-black text-slate-900">
                              {doc.number}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium block mt-1">
                            Émis le {new Date(doc.issueDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(doc)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide cursor-pointer transition-all ${
                            isPaid
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                          title="Cliquer pour changer le statut de paiement"
                        >
                          {isPaid ? '✓ Payée' : 'En attente'}
                        </button>
                      </div>

                      {/* Client */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <div className="flex items-center space-x-1.5 text-slate-900 font-extrabold text-xs">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{doc.clientName}</span>
                        </div>
                        {doc.clientPhone && (
                          <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-mono">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{doc.clientPhone}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-medium">
                          {doc.items.length} article{doc.items.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Montant & Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-bold">Total TTC</span>
                        <span className="text-lg font-black text-slate-900 font-display">
                          {formatCurrency(doc.totalAmount)}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {/* Partager WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(doc)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                          title="Partager par WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Télécharger PDF */}
                        <button
                          type="button"
                          disabled={generatingPdfDocId === doc.id}
                          onClick={() => handleDownloadPdf(doc)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                          title="Télécharger la version PDF A4"
                        >
                          {generatingPdfDocId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Imprimer Ticket / Reçu */}
                        <button
                          type="button"
                          onClick={() => handlePrint(doc)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                          title="Imprimer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Modifier */}
                        <button
                          type="button"
                          onClick={() => handleEditDoc(doc)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                          title="Modifier le document"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Suppression discrète */}
                      <div className="text-right pt-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, doc.number)}
                          className="text-[10px] text-slate-400 hover:text-red-600 font-medium transition-colors cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ======================================================== */
        /* MODE ÉDITEUR : CRÉATION / MODIFICATION PLEINE PAGE        */
        /* ======================================================== */
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-md space-y-6 animate-in fade-in duration-200">
          {/* En-tête Éditeur */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-2xl transition-colors cursor-pointer"
                title="Retour à la liste"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                  {editingId ? 'Modifier le document' : `Nouveau ${docType === 'INVOICE' ? 'Facture' : 'Devis'}`}
                </h2>
                <p className="text-xs text-slate-500 font-medium font-mono">{docNumber}</p>
              </div>
            </div>

            {/* Sélecteur de type */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDocType('INVOICE')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  docType === 'INVOICE' ? 'bg-emerald-700 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facture
              </button>
              <button
                type="button"
                onClick={() => setDocType('QUOTE')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  docType === 'QUOTE' ? 'bg-amber-500 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Devis
              </button>
            </div>
          </div>

          {/* INFORMATIONS CLIENT & DATES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            {/* Colonne 1 : Client */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display">
                  Informations du Client *
                </label>
                {existingCustomers.length > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {existingCustomers.length} clients enregistrés
                  </span>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nom ou Raison Sociale du Client *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Suggestions de clients existants */}
              {existingCustomers.length > 0 && !clientName && (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {existingCustomers.slice(0, 8).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectExistingCustomer(c)}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 text-slate-700 text-[10px] font-semibold rounded-lg border border-slate-200 transition-colors"
                    >
                      + {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  placeholder="N° WhatsApp / Téléphone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="N° IFU Client (Facultatif)"
                  value={clientIfu}
                  onChange={(e) => setClientIfu(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>

              <input
                type="text"
                placeholder="Adresse / Ville du client"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Colonne 2 : Dates & N° Document */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display block">
                Paramètres du Document
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">N° de document</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Date d'émission</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Date d'échéance / validité</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Statut initial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="DRAFT">Brouillon</option>
                    <option value="SENT">Envoyé / Émis</option>
                    <option value="PAID">Payé / Encaissé</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* TABLEAU DES LIGNES D'ARTICLES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider font-display">
                Lignes d'articles & Prestations ({items.length})
              </h3>
              <div className="flex items-center space-x-2">
                {catalogProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen(true)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Choisir du Catalogue</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une ligne</span>
                </button>
              </div>
            </div>

            {/* Sélecteur de produit catalogue en pop-in */}
            {isProductPickerOpen && (
              <div className="bg-emerald-950 text-white p-4 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">Ajouter depuis votre catalogue</span>
                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {catalogProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItem(p)}
                      className="p-2.5 bg-emerald-900/60 hover:bg-emerald-800 rounded-xl text-left border border-emerald-700/50 transition-colors"
                    >
                      <p className="font-bold text-xs truncate text-white">{p.name}</p>
                      <p className="text-[10px] text-amber-300 font-mono">{formatCurrency(p.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des lignes */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Désignation de l'article / service *"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 outline-none"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        placeholder="Prix unitaire"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleUpdateItem(idx, { unitPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right text-slate-900 outline-none"
                      />
                    </div>
                    <div className="w-32 text-right font-black text-xs text-emerald-800 font-display">
                      {formatCurrency(item.totalPrice)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RÉCAPITULATIF FINANCIER & REMISE / TVA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 items-start">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Conditions de règlement</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: Paiement comptant, 50% à la commande..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Notes / Remarques (visibles sur la facture)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remerciements, mentions bancaires, coordonnées..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none resize-none"
                />
              </div>
            </div>

            {/* Total Box */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-3 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Sous-Total Brut</span>
                <span className="font-bold">{formatCurrency(subtotal)}</span>
              </div>

              {/* Remise */}
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-slate-300">Remise commerciale</span>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg border border-slate-700 outline-none"
                  >
                    <option value="NONE">Aucune</option>
                    <option value="PERCENT">%</option>
                    <option value="AMOUNT">FCFA</option>
                  </select>
                  {discountType !== 'NONE' && (
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-slate-700 text-right outline-none font-bold"
                    />
                  )}
                  <span className="text-amber-400 font-bold font-mono">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              </div>

              {/* TVA */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-300">TVA (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate || ''}
                    placeholder="0"
                    onChange={(e) => setTaxRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-14 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-slate-700 text-center outline-none font-bold"
                  />
                </div>
                <span className="text-slate-300 font-mono">+{formatCurrency(taxAmount)}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wider font-display">
                    NET À PAYER (TTC)
                  </span>
                  <span className="text-[10px] text-slate-400 block max-w-xs truncate">
                    {getLegalArreteMention(docType === 'QUOTE' ? 'QUOTE' : 'INVOICE', totalAmount).fullMention}
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-display">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* BOUTONS D'ACTION VALIDER / ANNULER */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveDocument}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer font-display"
            >
              {editingId ? 'Mettre à jour le document' : 'Enregistrer le document'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
