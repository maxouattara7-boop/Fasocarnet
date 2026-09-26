import React, { useState, useEffect } from 'react';
import { CustomInvoice, CustomInvoiceItem, CustomInvoiceType, Product, Customer } from '../../types';
import { customInvoiceService } from '../../db/services/customInvoiceService';
import { productsService } from '../../db/services/productsService';
import { customersService } from '../../db/services/customersService';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/formatters';
import { generateCustomInvoiceWhatsAppMessage, printCustomInvoice } from '../../utils/customInvoiceRenderer';
import { openWhatsApp } from '../../utils/whatsapp';
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Printer, 
  Share2, 
  Search, 
  User, 
  Phone, 
  CheckCircle2, 
  Edit3, 
  ArrowLeft,
  Package,
  Layers
} from 'lucide-react';

interface CustomInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CustomInvoiceType;
}

export const CustomInvoiceModal: React.FC<CustomInvoiceModalProps> = ({
  isOpen,
  onClose,
  initialType = 'INVOICE'
}) => {
  const { shopProfile } = useAppStore();
  const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');
  const [documents, setDocuments] = useState<CustomInvoice[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CustomInvoiceType>('ALL');

  // État du formulaire d'édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [docType, setDocType] = useState<CustomInvoiceType>(initialType);
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

  // Suggestions
  const [productSearch, setProductSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

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
    setProductSearch('');
  };

  const handleUpdateItem = (index: number, field: keyof CustomInvoiceItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = Math.max(1, Number(item.quantity) || 1);
        const p = Math.max(0, Number(item.unitPrice) || 0);
        item.quantity = q;
        item.unitPrice = p;
        item.totalPrice = q * p;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculs financiers
  const subtotal = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  let discountAmount = 0;
  if (discountType === 'PERCENT') {
    discountAmount = Math.round((subtotal * Math.max(0, discountValue)) / 100);
  } else if (discountType === 'AMOUNT') {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxRate > 0 ? Math.round((taxableSubtotal * taxRate) / 100) : 0;
  const totalAmount = taxableSubtotal + taxAmount;

  const buildCurrentInvoiceObject = (): CustomInvoice => {
    return {
      id: editingId || `doc_${Date.now()}`,
      number: docNumber.trim() || 'DOC-001',
      type: docType,
      clientName: clientName.trim() || 'Client au comptant',
      clientPhone: clientPhone.trim() || undefined,
      clientAddress: clientAddress.trim() || undefined,
      clientIfu: clientIfu.trim() || undefined,
      issueDate,
      dueDate: dueDate || undefined,
      items: items.filter(it => it.description.trim().length > 0),
      subtotal,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      discountType: discountType !== 'NONE' ? discountType : undefined,
      discountValue: discountType !== 'NONE' ? discountValue : undefined,
      taxRate: taxRate > 0 ? taxRate : undefined,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
      totalAmount,
      status,
      paymentTerms: paymentTerms.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };
  };

  const handleSaveDoc = async (): Promise<CustomInvoice | null> => {
    if (!clientName.trim()) {
      alert("Veuillez renseigner le nom du client.");
      return null;
    }
    if (items.length === 0 || !items.some(it => it.description.trim())) {
      alert("Veuillez ajouter au moins une ligne d'article.");
      return null;
    }

    const docObj = buildCurrentInvoiceObject();
    try {
      if (editingId) {
        await customInvoiceService.update(editingId, docObj);
      } else {
        await customInvoiceService.create(docObj);
      }
      await loadData();
      return docObj;
    } catch (err) {
      console.error('Erreur sauvegarde facture/devis:', err);
      alert("Erreur lors de l'enregistrement du document.");
      return null;
    }
  };

  const handleSaveAndPrint = async () => {
    const saved = await handleSaveDoc();
    if (saved) {
      printCustomInvoice(saved, shopProfile || undefined);
    }
  };

  const handleSaveAndShareWhatsApp = async () => {
    const saved = await handleSaveDoc();
    if (saved) {
      const msg = generateCustomInvoiceWhatsAppMessage(saved, shopProfile || undefined);
      openWhatsApp({
        phone: saved.clientPhone || '',
        message: msg
      });
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (confirm("Supprimer définitivement ce document ?")) {
      await customInvoiceService.delete(id);
      await loadData();
    }
  };

  if (!isOpen) return null;

  // Filtrage liste
  const filteredDocs = documents.filter(doc => {
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
    const matchesSearch = !searchQuery.trim() ||
      doc.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.clientPhone && doc.clientPhone.includes(searchQuery));
    return matchesType && matchesSearch;
  });

  const filteredCatalogForPicker = catalogProducts.filter(p =>
    !productSearch.trim() ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-3xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            {viewMode === 'EDITOR' ? (
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Retour à la liste"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner text-emerald-300">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-display">
                {viewMode === 'EDITOR' 
                  ? (editingId ? 'Modifier le document' : `Nouveau ${docType === 'QUOTE' ? 'Devis' : docType === 'PROFORMA' ? 'Proforma' : 'Facture'}`) 
                  : 'Factures & Devis Libres'}
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                {viewMode === 'EDITOR' ? `${docNumber || 'Création'}` : 'Créez, imprimez en A4 et partagez sur WhatsApp'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU : VUE LISTE */}
        {viewMode === 'LIST' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Barre d'actions & Filtres */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Rechercher par N°, client, téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-500 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartNewDoc('INVOICE')}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1 shadow-xs transition-all cursor-pointer font-display"
                    title="Créer une facture de vente"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Facture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartNewDoc('QUOTE')}
                    className="px-3 py-2 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1 shadow-xs transition-all cursor-pointer font-display"
                    title="Créer un devis"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Devis</span>
                  </button>
                </div>
              </div>

              {/* Filtre type de documents */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-0.5">
                {[
                  { id: 'ALL', label: 'Tous' },
                  { id: 'INVOICE', label: 'Factures' },
                  { id: 'QUOTE', label: 'Devis' },
                  { id: 'PROFORMA', label: 'Proformas' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      typeFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des documents */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[55vh]">
              {isLoading ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  Chargement des documents...
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-6">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <span className="font-bold text-slate-700 block text-sm">Aucun document enregistré</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Créez facilement une facture ou un devis pour vos clients avec impression A4 et partage WhatsApp.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleStartNewDoc('INVOICE')}
                      className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouvelle Facture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewDoc('QUOTE')}
                      className="px-4 py-2 bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nouveau Devis</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isQuote = doc.type === 'QUOTE';
                  const isProforma = doc.type === 'PROFORMA';

                  return (
                    <div
                      key={doc.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isQuote 
                              ? 'bg-blue-100 text-blue-800' 
                              : isProforma 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isQuote ? 'Devis' : isProforma ? 'Proforma' : 'Facture'}
                          </span>
                          <span className="font-extrabold text-xs text-slate-900 font-display">
                            {doc.number}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {new Date(doc.issueDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900 font-display">
                          {formatCurrency(doc.totalAmount)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-slate-800 truncate flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.clientName}</span>
                          </div>
                          {doc.clientPhone && (
                            <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{doc.clientPhone}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right text-[11px] font-semibold text-slate-500 shrink-0">
                          {doc.items.length} article(s)
                        </div>
                      </div>

                      {/* Barre d'actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => printCustomInvoice(doc, shopProfile || undefined)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 text-xs font-bold"
                            title="Imprimer format A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Imprimer A4</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const msg = generateCustomInvoiceWhatsAppMessage(doc, shopProfile || undefined);
                              openWhatsApp({
                                phone: doc.clientPhone || '',
                                message: msg
                              });
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 text-xs font-bold"
                            title="Envoyer sur WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[11px]">WhatsApp</span>
                          </button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditDoc(doc)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                {filteredDocs.length} document(s)
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer font-display"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* CONTENU : FORMULAIRE D'ÉDITION */}
        {viewMode === 'EDITOR' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
              
              {/* Type de Document & Numéro & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Type de document
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as CustomInvoiceType)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="INVOICE">Facture de Vente</option>
                    <option value="QUOTE">Devis Commercial</option>
                    <option value="PROFORMA">Facture Proforma</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    N° Pièce
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none"
                    placeholder="FAC-202609-001"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Date d'émission
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Coordonnées Client */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 font-display">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Informations Client</span>
                  </h4>

                  {existingCustomers.length > 0 && (
                    <select
                      onChange={(e) => {
                        const found = existingCustomers.find(c => c.id === e.target.value);
                        if (found) handleSelectExistingCustomer(found);
                      }}
                      defaultValue=""
                      className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                    >
                      <option value="" disabled>Choisir client existant...</option>
                      {existingCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nom complet / Entreprise *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Société Burkina Services ou M. Sawadogo"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Téléphone / WhatsApp</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: 70 00 00 00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Adresse / Ville (optionnel)</label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="Ex: Ouagadougou, Secteur 15"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">IFU Client (optionnel)</label>
                    <input
                      type="text"
                      value={clientIfu}
                      onChange={(e) => setClientIfu(e.target.value)}
                      placeholder="Ex: 00012345X"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Lignes d'articles */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 font-display">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Lignes du document ({items.length})</span>
                  </h4>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Package className="w-3 h-3" />
                      <span>Catalogue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ligne libre</span>
                    </button>
                  </div>
                </div>

                {/* Sélecteur de produit catalogue rapide */}
                {isProductPickerOpen && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Filtrer un article du catalogue..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none"
                    />
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/60">
                      {filteredCatalogForPicker.map(prod => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddItem(prod)}
                          className="w-full py-1.5 px-2 flex items-center justify-between hover:bg-emerald-50/70 text-left transition-colors rounded-md cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-800 truncate">{prod.name}</span>
                          <span className="text-xs font-extrabold text-emerald-700 shrink-0 font-display">
                            {formatCurrency(prod.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tableau des lignes */}
                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          placeholder="Désignation de l'article ou prestation..."
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:border-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase">Quantité</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 text-center outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase">Prix Unitaire</label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 text-right outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase">Total Ligne</label>
                          <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-black text-emerald-800 text-right font-display truncate">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remises & Taxes & Conditions */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Remise */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Remise commerciale
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="NONE">Aucune</option>
                        <option value="PERCENT">Pourcentage (%)</option>
                        <option value="AMOUNT">Montant fixe (FCFA)</option>
                      </select>

                      {discountType !== 'NONE' && (
                        <input
                          type="number"
                          min="0"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder={discountType === 'PERCENT' ? '10%' : '1000'}
                          className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* TVA */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      TVA applicable
                    </label>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="0">0% (Non applicable / Exonéré)</option>
                      <option value="18">18% (Taux normal UEMOA)</option>
                    </select>
                  </div>
                </div>

                {/* Conditions & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Conditions de règlement
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="Ex: Paiement comptant ou 50% à la commande"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Note de bas de page (optionnel)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Marchandises livrées en bon état"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Récapitulatif Total */}
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Sous-total HT :</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-300">
                    <span>Remise ({discountType === 'PERCENT' ? `${discountValue}%` : 'Montant'}) :</span>
                    <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <span>TVA ({taxRate}%) :</span>
                    <span className="font-bold">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/20 flex items-center justify-between">
                  <span className="text-sm font-extrabold uppercase font-display">Total Net à Payer :</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-display">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

            </div>

            {/* Barre de boutons d'action */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSaveAndShareWhatsApp}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer font-display"
                  title="Enregistrer et envoyer sur WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndPrint}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer font-display"
                  title="Enregistrer et imprimer format A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer A4</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await handleSaveDoc();
                    if (res) setViewMode('LIST');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer font-display"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
