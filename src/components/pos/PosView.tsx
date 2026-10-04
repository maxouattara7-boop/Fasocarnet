import React, { useState, useEffect, useRef } from 'react';
import { Keypad } from './Keypad';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { QuantityModal } from './QuantityModal';
import { DiscountModal, DiscountData } from './DiscountModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { salesService } from '../../db/services/salesService';
import { productsService } from '../../db/services/productsService';
import { Product, Sale, SaleItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { triggerHaptic, triggerDoubleHaptic } from '../../utils/haptics';
import { soundEffects } from '../../utils/soundEffects';
import { 
  ArrowRight, 
  ShoppingCart, 
  Package, 
  Calculator, 
  Search, 
  X, 
  Barcode, 
  Camera, 
  Check, 
  Sparkles, 
  Tag, 
  Trash2
} from 'lucide-react';
import { evaluatePosExpression, formatPosExpressionDisplay } from '../../utils/calculator';

export const PosView: React.FC = () => {
  const [amountStr, setAmountStr] = useState<string>('0');
  const [discount, setDiscount] = useState<DiscountData | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Catalogue d'articles & sélecteur modal
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [isArticlePickerOpen, setIsArticlePickerOpen] = useState(false);
  const [productForQuantity, setProductForQuantity] = useState<Product | null>(null);
  const [articleSearch, setArticleSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Scanner Code-Barres
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannedUnknownBarcode, setScannedUnknownBarcode] = useState<string | null>(null);
  const [newBarcodeArticleName, setNewBarcodeArticleName] = useState('');
  const [newBarcodeArticlePrice, setNewBarcodeArticlePrice] = useState('');
  const [newBarcodeArticleCostPrice, setNewBarcodeArticleCostPrice] = useState('');
  const [scanToast, setScanToast] = useState<string | null>(null);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{ name: string; price: number; totalCartAmount: number } | null>(null);

  // Buffer pour douchettes laser physiques
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const subtotalAmount = evaluatePosExpression(amountStr);
  const discountAmount = discount ? discount.calculatedAmount : 0;
  const finalPayableAmount = Math.max(0, subtotalAmount - discountAmount);

  // Synchronisation des états pour l'écouteur clavier global (évite les fermetures obsolètes)
  const finalPayableAmountRef = useRef(finalPayableAmount);
  finalPayableAmountRef.current = finalPayableAmount;

  const isPaymentModalOpenRef = useRef(isPaymentModalOpen);
  isPaymentModalOpenRef.current = isPaymentModalOpen;

  const isReceiptModalOpenRef = useRef(isReceiptModalOpen);
  isReceiptModalOpenRef.current = isReceiptModalOpen;

  const isArticlePickerOpenRef = useRef(isArticlePickerOpen);
  isArticlePickerOpenRef.current = isArticlePickerOpen;

  const isDiscountModalOpenRef = useRef(isDiscountModalOpen);
  isDiscountModalOpenRef.current = isDiscountModalOpen;

  const isBarcodeScannerOpenRef = useRef(isBarcodeScannerOpen);
  isBarcodeScannerOpenRef.current = isBarcodeScannerOpen;

  const scannedUnknownBarcodeRef = useRef(scannedUnknownBarcode);
  scannedUnknownBarcodeRef.current = scannedUnknownBarcode;

  const productForQuantityRef = useRef(productForQuantity);
  productForQuantityRef.current = productForQuantity;

  useEffect(() => {
    loadProducts();

    // Écouteur global pour douchettes laser USB / Bluetooth & raccourcis clavier
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Si l'utilisateur tape dans un champ de saisie texte, ne pas intercepter
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Détection douchette laser (caractères consécutifs très rapides)
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3 && interval < 150) {
          e.preventDefault();
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          handleBarcodeScanned(scannedCode);
          return;
        }
        barcodeBufferRef.current = '';

        // Si la modale de reçu est affichée, Entrée la ferme
        if (isReceiptModalOpenRef.current) {
          e.preventDefault();
          setIsReceiptModalOpen(false);
          return;
        }

        // Si aucune modale n'est ouverte et qu'un montant est présent, Entrée ouvre le paiement
        if (
          !isPaymentModalOpenRef.current &&
          !isReceiptModalOpenRef.current &&
          !isDiscountModalOpenRef.current &&
          !productForQuantityRef.current &&
          !isBarcodeScannerOpenRef.current &&
          !isArticlePickerOpenRef.current &&
          !scannedUnknownBarcodeRef.current
        ) {
          if (finalPayableAmountRef.current > 0) {
            e.preventDefault();
            triggerHaptic(40);
            setIsPaymentModalOpen(true);
          }
        }
        return;
      } else if (e.key.length === 1 && interval < 150) {
        barcodeBufferRef.current += e.key;
      } else if (interval >= 150) {
        barcodeBufferRef.current = e.key.length === 1 ? e.key : '';
      }

      // Si une modale est ouverte, on laisse la gestion aux modales sauf pour Échap
      if (
        isPaymentModalOpenRef.current ||
        isReceiptModalOpenRef.current ||
        isDiscountModalOpenRef.current ||
        productForQuantityRef.current ||
        isBarcodeScannerOpenRef.current ||
        isArticlePickerOpenRef.current ||
        scannedUnknownBarcodeRef.current
      ) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsPaymentModalOpen(false);
          setIsReceiptModalOpen(false);
          setIsDiscountModalOpen(false);
          setProductForQuantity(null);
          setIsBarcodeScannerOpen(false);
          setIsArticlePickerOpen(false);
          setScannedUnknownBarcode(null);
        }
        return;
      }

      // Raccourcis clavier physiques pour la caisse (en mode normal)
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setAmountStr((prev) => (prev === '0' ? e.key : prev + e.key));
      } else if (e.key === '+') {
        e.preventDefault();
        setAmountStr((prev) => {
          if (prev === '0' || prev.trim().endsWith('+')) return prev;
          return prev + ' + ';
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setAmountStr((prev) => {
          if (prev.endsWith(' + ')) return prev.slice(0, -3);
          if (prev.length <= 1) return '0';
          return prev.slice(0, -1);
        });
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClear();
      }
    };

    // Écouteur pour actualisation temps-réel instantanée lors de la synchronisation
    const handleDbUpdated = () => {
      loadProducts();
    };
    window.addEventListener('fasocarnet_database_updated', handleDbUpdated);

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('fasocarnet_database_updated', handleDbUpdated);
    };
  }, []);

  const loadProducts = async () => {
    const list = await productsService.getAll();
    setProducts(list);
  };

  const handleClear = () => {
    setAmountStr('0');
    setSelectedItems([]);
    setDiscount(null);
    setLastScannedFeedback(null);
  };

  const handleRemoveItem = (index: number) => {
    const itemToRemove = selectedItems[index];
    if (!itemToRemove) return;
    triggerHaptic(30);

    const updated = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updated);

    // Recalculer le montant total à partir des articles restants
    const newItemsTotal = updated.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    setAmountStr(newItemsTotal > 0 ? newItemsTotal.toString() : '0');
  };

  const handleSelectProduct = (productId: string) => {
    triggerHaptic(35);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // RÈGLE STRICTE : Bloquer si le stock est épuisé (<= 0)
    const currentStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;
    if (currentStock <= 0) {
      triggerHaptic(60);
      setScanToast(`⚠️ Vente impossible : Le stock de "${product.name}" est épuisé (0 en stock).`);
      setTimeout(() => setScanToast(null), 3500);
      return;
    }

    setProductForQuantity(product);
  };

  const handleConfirmQuantity = (product: Product, quantity: number) => {
    const availableStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 0;

    // RÈGLE STRICTE : Bloquer si le stock est épuisé ou insuffisant
    if (availableStock <= 0) {
      triggerHaptic(60);
      setScanToast(`⚠️ Vente impossible : "${product.name}" est en rupture de stock !`);
      setTimeout(() => setScanToast(null), 3500);
      return;
    }

    const existingInCart = selectedItems.find((it) => it.id === product.id || it.productId === product.id);
    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;
    const totalRequested = currentQtyInCart + quantity;

    if (totalRequested > availableStock) {
      triggerHaptic(60);
      setScanToast(`⚠️ Stock insuffisant : Seules ${availableStock} unités sont disponibles (${currentQtyInCart} déjà au panier).`);
      setTimeout(() => setScanToast(null), 3500);
      return;
    }

    const itemTotal = product.price * quantity;

    // Signalement d'alerte si le stock devient critique
    if (availableStock - totalRequested <= (product.minStockAlert ?? 5)) {
      setScanToast(`⚠️ Stock faible : Il restera ${availableStock - totalRequested} unité(s) après cette vente.`);
      setTimeout(() => setScanToast(null), 3500);
    }

    setSelectedItems((prev) => {
      const existing = prev.find((it) => it.id === product.id || it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          (it.id === product.id || it.productId === product.id)
            ? { ...it, quantity: it.quantity + quantity }
            : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          productId: product.id,
          description: product.name,
          quantity: quantity,
          unitPrice: product.price,
          costPrice: product.costPrice
        }
      ];
    });

    setAmountStr((prev) => {
      if (prev === '0') {
        return itemTotal.toString();
      } else if (prev.trim().endsWith('+')) {
        return prev + itemTotal.toString();
      } else {
        return prev + ' + ' + itemTotal.toString();
      }
    });

    setScanToast(`✓ ${quantity}x ${product.name} ajouté(s) (+${formatCurrency(itemTotal)})`);
    setTimeout(() => setScanToast(null), 3000);

    setProductForQuantity(null);
    setIsArticlePickerOpen(false);
  };

  /**
   * Traitement d'un code-barres scanné (Caméra ou Douchette)
   */
  const handleBarcodeScanned = async (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    const matched = await productsService.findByBarcode(cleanCode);

    if (matched) {
      const stock = typeof matched.stockQuantity === 'number' ? matched.stockQuantity : 0;
      if (stock <= 0) {
        triggerHaptic(60);
        setScanToast(`⚠️ Vente impossible : "${matched.name}" scanné est en rupture de stock (0 unité).`);
        setTimeout(() => setScanToast(null), 3500);
        return;
      }

      handleSelectProduct(matched.id);
      triggerDoubleHaptic();
      
      const newTotal = subtotalAmount + matched.price;
      setLastScannedFeedback({
        name: matched.name,
        price: matched.price,
        totalCartAmount: newTotal
      });
    } else {
      // Produit non reconnu dans le catalogue
      triggerHaptic(60);
      setScannedUnknownBarcode(cleanCode);
      setNewBarcodeArticleName('');
      setNewBarcodeArticlePrice('');
    }
  };

  const handleCreateUnknownBarcodeProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newBarcodeArticlePrice) || 0;
    const cost = parseFloat(newBarcodeArticleCostPrice) || undefined;
    if (!newBarcodeArticleName.trim() || price <= 0 || !scannedUnknownBarcode) return;

    const newProd = await productsService.create(
      newBarcodeArticleName.trim(),
      price,
      scannedUnknownBarcode,
      undefined,
      undefined,
      5,
      cost
    );
    await loadProducts();
    handleSelectProduct(newProd.id);
    
    const newTotal = subtotalAmount + price;
    setLastScannedFeedback({
      name: newProd.name,
      price: newProd.price,
      totalCartAmount: newTotal
    });

    setScannedUnknownBarcode(null);
    setNewBarcodeArticleName('');
    setNewBarcodeArticlePrice('');
    setNewBarcodeArticleCostPrice('');
    setScanToast(`✓ Article créé : ${newProd.name}`);
    setTimeout(() => setScanToast(null), 3000);
  };

  const handleOpenPayment = () => {
    if (finalPayableAmount <= 0) return;
    triggerHaptic(40);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmSale = async (data: any) => {
    let finalNotes = data.notes;
    if (discount && discount.calculatedAmount > 0) {
      const discountDesc = `[Remise: -${formatCurrency(discount.calculatedAmount)} (${discount.type === 'PERCENT' ? `${discount.value}%` : 'Montant fixe'})]`;
      finalNotes = finalNotes ? `${discountDesc} ${finalNotes}` : discountDesc;
    }

    const recorded = await salesService.recordSale({
      totalAmount: finalPayableAmount,
      subtotalAmount: subtotalAmount,
      discountAmount: discount && discount.calculatedAmount > 0 ? discount.calculatedAmount : undefined,
      discountType: discount && discount.calculatedAmount > 0 ? discount.type : undefined,
      discountValue: discount && discount.calculatedAmount > 0 ? discount.value : undefined,
      ...data,
      items: selectedItems.length > 0 ? selectedItems : undefined,
      notes: finalNotes || undefined
    });
    triggerDoubleHaptic();
    soundEffects.notifySaleSuccess(recorded.totalAmount, recorded.isCredit);
    setIsPaymentModalOpen(false);
    setLastSale(recorded);
    setIsReceiptModalOpen(true);
    setAmountStr('0');
    setSelectedItems([]);
    setDiscount(null);
    await loadProducts();
  };

  const hasCalculation = /[+]/.test(amountStr);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(articleSearch.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(articleSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedCategory === 'in_stock') return (p.stockQuantity ?? 0) > 0;
    if (selectedCategory === 'out_of_stock') return (p.stockQuantity ?? 0) <= 0;
    if (selectedCategory === 'low_stock') return (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= (p.minStockAlert ?? 5);
    return true;
  });

  return (
    <div className="max-w-[1680px] mx-auto w-full px-2 sm:px-3.5 lg:px-4 pt-1 sm:pt-1.5 pb-[64px] md:pb-2.5 h-full max-h-full flex flex-col min-h-0 overflow-hidden space-y-1">
      {/* Toast de Notification */}
      {scanToast && (
        <div className="bg-emerald-900 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top duration-200 border border-emerald-500/40 shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{scanToast}</span>
          </div>
          <span className="text-[11px] bg-emerald-700/80 px-2 py-0.5 rounded-md font-mono font-bold">OK</span>
        </div>
      )}

      {/* DISPOSITION RESPONSIVE : CALCULATRICE STATIQUE À GAUCHE & CATALOGUE DÉFILANT À DROITE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 items-stretch flex-1 min-h-0 h-full overflow-hidden">
        
        {/* ======================================================== */}
        {/* COLONNE GAUCHE (DESKTOP) : CALCULATRICE STATIQUE & FIXE  */}
        {/* ======================================================== */}
        <div 
          className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 h-full max-h-full flex flex-col justify-between shrink-0 overflow-y-auto lg:overflow-y-auto scrollbar-none select-none min-h-0 gap-1.5 sm:gap-2"
          onWheel={(e) => e.stopPropagation()}
          style={{ overscrollBehavior: 'none' }}
        >
          {/* Section Haute : Afficheur, Actions Scanner/Remise, Puces */}
          <div className="space-y-1.5 sm:space-y-2 shrink-0">
            {/* Écran d'affichage du montant, de la remise et du calcul */}
            <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between border border-emerald-700/60 shrink-0">
              <div className="flex items-center justify-between text-emerald-300 text-xs sm:text-sm font-black tracking-wider uppercase">
                <div className="flex items-center space-x-1.5">
                  {hasCalculation ? (
                    <Calculator className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  <span>{hasCalculation ? 'Total Additionné' : 'Montant à Encaisser'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {discount && discount.calculatedAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="bg-amber-400 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-black tracking-wide flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      <span>-{formatCurrency(discountAmount)}</span>
                    </button>
                  )}
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="bg-red-500/25 hover:bg-red-500/40 text-red-200 border border-red-500/30 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-black flex items-center space-x-1 transition-all cursor-pointer"
                      title="Vider le panier"
                    >
                      <Trash2 className="w-3 h-3 text-red-300" />
                      <span>Vider ({selectedItems.length})</span>
                    </button>
                  )}
                  <span className="bg-emerald-700/80 px-2 py-0.5 rounded-md text-xs font-black tracking-wide">FCFA</span>
                </div>
              </div>

              <div className="text-right mt-1">
                {/* Formule de calcul si addition en cours */}
                {hasCalculation && (
                  <div className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/50 px-2.5 py-0.5 rounded-md inline-block max-w-full truncate mb-0.5 border border-amber-500/30">
                    {formatPosExpressionDisplay(amountStr)} {/[+]\s*$/.test(amountStr) ? '...' : '='}
                  </div>
                )}

                {/* Affichage du sous-total barré si remise active */}
                {discount && discount.calculatedAmount > 0 && (
                  <div className="text-xs sm:text-sm font-bold text-emerald-300/80 line-through">
                    {formatCurrency(subtotalAmount)}
                  </div>
                )}

                <div className="text-4xl sm:text-5xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white drop-shadow-xs truncate leading-tight font-display py-0.5">
                  {formatCurrency(finalPayableAmount).replace(' FCFA', '')}
                </div>

                {/* LISTE COMPACTE DES ARTICLES INTÉGRÉE DIRECTEMENT DANS LA CARTE */}
                {selectedItems.length > 0 ? (
                  <div className="mt-1 pt-1 border-t border-emerald-700/50 flex flex-wrap gap-1 justify-end max-h-14 sm:max-h-20 overflow-y-auto scrollbar-none text-left">
                    {selectedItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 bg-emerald-950/80 border border-emerald-600/50 px-1.5 py-0.5 rounded-md text-xs text-emerald-100 shadow-2xs"
                      >
                        <span className="font-bold text-white truncate max-w-[100px] sm:max-w-[150px]">{item.description}</span>
                        <span className="text-[11px] text-amber-300 font-extrabold">
                          {item.quantity > 1 ? `${item.quantity}×` : ''}{formatCurrency(item.unitPrice * item.quantity).replace(' FCFA', '')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(idx);
                          }}
                          className="text-emerald-400 hover:text-red-300 p-0.5 transition-colors cursor-pointer ml-0.5"
                          title="Retirer cet article"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-emerald-200/90 mt-0.5 font-medium">
                    {discount && discount.calculatedAmount > 0 ? (
                      <span className="font-bold text-amber-300">
                        Remise : -{formatCurrency(discountAmount)} ({discount.type === 'PERCENT' ? `${discount.value}%` : 'Fixe'})
                      </span>
                    ) : (
                      'Saisissez un montant ou sélectionnez des articles'
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TOUCHES D'ACTION ALLONGÉES & VISIBLES : SCANNER & REMISE */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 shrink-0">
              {/* Bouton Scanner Caméra Code-Barres grand format allongé */}
              <button
                type="button"
                onClick={() => setIsBarcodeScannerOpen(true)}
                className="h-10 sm:h-11 lg:h-10 xl:h-11 px-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center space-x-1.5 shadow-xs shadow-amber-500/20 active:scale-95 transition-all cursor-pointer font-display"
                title="Scanner un code-barres avec la caméra ou douchette"
              >
                <Camera className="w-4.5 h-4.5 text-amber-100 shrink-0" />
                <span className="tracking-wide">Scanner</span>
              </button>

              {/* Bouton Remise (% ou FCFA) grand format allongé */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(30);
                  setIsDiscountModalOpen(true);
                }}
                className={`h-10 sm:h-11 lg:h-10 xl:h-11 px-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center space-x-1.5 shadow-xs active:scale-95 transition-all cursor-pointer font-display ${
                  discount && discount.calculatedAmount > 0
                    ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-500 shadow-amber-400/30'
                    : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-slate-900/20'
                }`}
                title="Appliquer une remise en % ou FCFA"
              >
                <Tag className="w-4.5 h-4.5 text-amber-300 shrink-0" />
                <span className="tracking-wide truncate">{discount && discount.calculatedAmount > 0 ? `Remise (-${formatCurrency(discountAmount)})` : 'Remise Client'}</span>
              </button>
            </div>

            {/* Bouton catalogue complet & Puces rapides en 1 ligne compacte (Sur mobile) */}
            <div className="lg:hidden space-y-1 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setArticleSearch('');
                      setIsArticlePickerOpen(true);
                    }}
                    className="h-8.5 px-2.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black flex items-center space-x-1 shadow-2xs active:scale-95 transition-all cursor-pointer font-display shrink-0"
                    title="Ouvrir le catalogue d'articles"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-300" />
                    <span>Catalogue ({products.length})</span>
                  </button>
                )}

                {/* Puces des articles fréquents en 1-tap direct */}
                {products.slice(0, 6).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod.id)}
                    className={`h-8.5 px-2.5 bg-white hover:bg-emerald-50/70 text-slate-800 border rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer ${
                      typeof prod.stockQuantity === 'number' && prod.stockQuantity <= 0
                        ? 'border-red-300 bg-red-50/30'
                        : typeof prod.stockQuantity === 'number' && prod.stockQuantity <= (prod.minStockAlert ?? 5)
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <span className="font-extrabold text-slate-900 truncate max-w-[100px]">{prod.name}</span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {formatCurrency(prod.price).replace(' FCFA', '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section Centrale : Clavier tactile Agrandie */}
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 shrink-0 my-auto">
            <Keypad
              value={amountStr}
              onChange={setAmountStr}
              onClear={handleClear}
            />
          </div>

          {/* Section Basse : Bouton d'encaissement descendu tout en bas */}
          <div className="shrink-0 mt-auto pt-1">
            <button
              type="button"
              disabled={finalPayableAmount <= 0}
              onClick={handleOpenPayment}
              className={`w-full py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg lg:text-lg xl:text-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer font-display shrink-0 ${
                finalPayableAmount > 0
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-700/25 active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span>ENCAISSER ({formatCurrency(finalPayableAmount)})</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLONNE DROITE (DESKTOP) : CATALOGUE D'ARTICLES & RECHERCHE */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex-col h-full max-h-full min-h-0 space-y-2.5 overflow-hidden">
          {/* Barre supérieure du Catalogue */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-inner">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">Catalogue d'Articles</h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold">{products.length} article(s) enregistrés</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center space-x-2 shadow-xs active:scale-95 transition-all cursor-pointer font-display"
                  title="Scanner un code-barres"
                >
                  <Camera className="w-4.5 h-4.5 text-amber-400" />
                  <span>Scanner Code-Barres</span>
                </button>
              </div>
            </div>

            {/* Barre de Recherche & Filtres */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par nom d'article ou code-barres..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                {articleSearch && (
                  <button
                    type="button"
                    onClick={() => setArticleSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtres de Stock */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs sm:text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-white text-emerald-800 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('in_stock')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    selectedCategory === 'in_stock'
                      ? 'bg-white text-emerald-800 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  En stock
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('low_stock')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    selectedCategory === 'low_stock'
                      ? 'bg-white text-amber-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Stock Faible
                </button>
              </div>
            </div>
          </div>

          {/* Grille des Articles défilante avec survol molette fluide */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center space-y-3 border border-slate-200/80 shadow-xs flex-1 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="font-black text-sm sm:text-base text-slate-800">Aucun article trouvé</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                {articleSearch 
                  ? `Aucun article ne correspond à "${articleSearch}".` 
                  : "Ajoutez des articles dans votre catalogue depuis l'onglet Boutique ou en scannant un code-barres."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 overflow-y-auto pr-1.5 pb-2 scrollbar-thin flex-1 min-h-0 overscroll-contain content-start auto-rows-max items-start">
              {filteredProducts.map((prod) => {
                const stock = prod.stockQuantity ?? 0;
                const isZeroStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= (prod.minStockAlert ?? 5);

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      if (isZeroStock) {
                        setScanToast(`⚠️ "${prod.name}" est épuisé (0 unité). Réapprovisionnez l'article.`);
                        triggerHaptic(60);
                        return;
                      }
                      handleSelectProduct(prod.id);
                    }}
                    className={`bg-white p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all group shadow-2xs hover:shadow-md cursor-pointer min-h-[125px] ${
                      isZeroStock
                        ? 'border-red-200 bg-red-50/20 opacity-70 cursor-not-allowed'
                        : isLowStock
                        ? 'border-amber-200 hover:border-amber-400'
                        : 'border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shadow-xs shrink-0 font-display ${
                          isZeroStock
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {prod.name.charAt(0).toUpperCase()}
                        </div>

                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg border shrink-0 ${
                            isZeroStock
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isZeroStock ? 'Épuisé' : `Stock: ${stock}`}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-emerald-800 line-clamp-2 leading-snug">
                          {prod.name}
                        </h4>
                        {prod.barcode && (
                          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5 truncate">{prod.barcode}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between mt-2">
                      <span className="text-base sm:text-lg font-black text-emerald-700 font-display">
                        {formatCurrency(prod.price)}
                      </span>
                      <span className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl transition-colors ${
                        isZeroStock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}>
                        {isZeroStock ? 'Épuisé' : '+ Ajouter'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de sélection de mode de paiement */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={finalPayableAmount}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmSale}
      />

      {/* Modal de Remise (% ou Montant Fixe) */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        subtotal={subtotalAmount}
        currentDiscount={discount}
        onClose={() => setIsDiscountModalOpen(false)}
        onApply={(appliedDiscount) => setDiscount(appliedDiscount)}
      />

      {/* Modal de reçu et partage WhatsApp */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        sale={lastSale}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Modal de Choix de Quantité d'un Article */}
      <QuantityModal
        isOpen={!!productForQuantity}
        product={productForQuantity}
        onClose={() => setProductForQuantity(null)}
        onConfirm={handleConfirmQuantity}
      />

      {/* Modal de Sélection Rapide d'Articles du Catalogue (sur Mobile) */}
      {isArticlePickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-white font-display">Catalogue d'Articles</h3>
                  <p className="text-xs text-emerald-200/90 font-medium">{products.length} article(s) disponible(s)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArticlePickerOpen(false)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-2xs"
                  autoFocus
                />
              </div>
            </div>

            {/* Liste des articles */}
            <div className="p-3.5 space-y-2 overflow-y-auto max-h-80 divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  Aucun article trouvé.
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const isZeroStock = (prod.stockQuantity ?? 0) <= 0;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        if (isZeroStock) {
                          setScanToast(`⚠️ "${prod.name}" est épuisé (0 unité). Réapprovisionnez l'article.`);
                          triggerHaptic(60);
                          return;
                        }
                        handleSelectProduct(prod.id);
                        setIsArticlePickerOpen(false);
                      }}
                      className={`w-full pt-2.5 pb-2 px-2.5 rounded-xl flex items-center justify-between text-left transition-all group ${
                        isZeroStock
                          ? 'bg-red-50/30 opacity-70 hover:bg-red-50/50 cursor-not-allowed'
                          : 'hover:bg-emerald-50/80 active:bg-emerald-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-xs shrink-0 font-display ${
                          isZeroStock
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                        }`}>
                          {prod.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-slate-900 block text-sm truncate">{prod.name}</span>
                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded-md border shrink-0 ${
                                isZeroStock
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : (prod.stockQuantity ?? 0) <= (prod.minStockAlert ?? 5)
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isZeroStock ? 'Épuisé (0)' : `Stock: ${prod.stockQuantity}`}
                            </span>
                          </div>
                          <span className="text-emerald-700 font-extrabold text-xs tracking-tight">{formatCurrency(prod.price)}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all shrink-0 shadow-2xs font-display ${
                        isZeroStock
                          ? 'text-red-700 bg-red-100/60 border-red-200'
                          : 'text-emerald-700 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white border-emerald-200/80'
                      }`}>
                        {isZeroStock ? 'Épuisé' : 'Choisir'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner Code-Barres Caméra */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => {
          setIsBarcodeScannerOpen(false);
          setLastScannedFeedback(null);
        }}
        onScan={(code) => {
          handleBarcodeScanned(code);
        }}
        lastScannedItem={lastScannedFeedback}
        onScanNext={() => {
          setLastScannedFeedback(null);
        }}
      />

      {/* Modal Produit Inconnu Scanné (Création & Ajout Immédiat) */}
      {scannedUnknownBarcode && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center space-x-2 text-amber-900">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-amber-950">Article Non Répertorié</h3>
                  <p className="text-xs text-amber-700 font-mono tracking-tight">{scannedUnknownBarcode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedUnknownBarcode(null)}
                className="p-1.5 text-amber-600 hover:text-amber-950 rounded-full hover:bg-amber-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnknownBarcodeProduct} className="p-4 space-y-3.5">
              <p className="text-sm text-slate-600">
                Ce code-barres n'est pas encore dans votre catalogue. Saisissez son nom et son prix pour l'ajouter immédiatement :
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nom de l'article *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Coca-Cola 33cl, Savon..."
                  value={newBarcodeArticleName}
                  onChange={(e) => setNewBarcodeArticleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Prix de vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="Ex: 500"
                    value={newBarcodeArticlePrice}
                    onChange={(e) => setNewBarcodeArticlePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Prix d'achat (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ex: 350"
                    value={newBarcodeArticleCostPrice}
                    onChange={(e) => setNewBarcodeArticleCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScannedUnknownBarcode(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer & Ajouter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
