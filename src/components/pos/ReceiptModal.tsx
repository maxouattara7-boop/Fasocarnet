import React, { useState, useEffect } from 'react';
import { Sale } from '../../types';
import { useAppStore } from '../../store/appStore';
import { generateReceiptDataUrl, generateReceiptFile, extractReceiptItems } from '../../utils/receiptGenerator';
import { printViaBluetooth, isBluetoothSupported } from '../../utils/bluetoothPrinter';
import { formatDateTime } from '../../utils/formatters';
import { CheckCircle2, ArrowRight, Download, Share2, Printer, Loader2 } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, sale, onClose }) => {
  const { shopProfile } = useAppStore();
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale) {
      generateImage();
      setPrintStatus(null);
    } else {
      setReceiptImageUrl(null);
      setPrintStatus(null);
    }
  }, [isOpen, sale]);

  const generateImage = async () => {
    if (!sale) return;
    setIsGenerating(true);
    try {
      const url = await generateReceiptDataUrl(sale, shopProfile || undefined);
      setReceiptImageUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || !sale) return null;

  const handleShareReceiptImage = async () => {
    try {
      const file = await generateReceiptFile(sale, shopProfile || undefined);

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Reçu de caisse - ${shopProfile?.name || 'FasoCarnet'}`,
          text: `Voici votre reçu de paiement pour vos achats chez ${shopProfile?.name || 'FasoCarnet'}.`
        });
      } else {
        handleDownloadImage();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadImage = () => {
    if (!receiptImageUrl) return;
    const a = document.createElement('a');
    a.href = receiptImageUrl;
    a.download = `recu-${sale.id.slice(-6)}.png`;
    a.click();
  };

  /**
   * Impression directe Bluetooth ESC/POS (ou fallback navigateur si non supporté)
   */
  const handlePrintReceipt = async () => {
    if (isBluetoothSupported()) {
      setIsPrinting(true);
      setPrintStatus('Recherche des imprimantes Bluetooth aux alentours...');
      try {
        const res = await printViaBluetooth(sale, shopProfile || undefined);
        if (res.success) {
          setPrintStatus('✓ Ticket imprimé avec succès !');
          setTimeout(() => {
            setIsPrinting(false);
            setPrintStatus(null);
          }, 2000);
          return;
        } else {
          setPrintStatus(res.message);
          setTimeout(() => {
            setIsPrinting(false);
          }, 3000);
        }
      } catch (err: any) {
        setPrintStatus(`Erreur Bluetooth: ${err.message || 'Échec de connexion'}`);
        setTimeout(() => setIsPrinting(false), 3000);
      }
    } else {
      // Fallback impression standard navigateur / thermique
      handlePrintBrowserFallback();
    }
  };

  const handlePrintBrowserFallback = () => {
    const shopName = shopProfile?.name || 'FASOCARNET';
    const phone = shopProfile?.phone || '';
    const city = shopProfile?.city || '';
    const dateStr = formatDateTime(sale.createdAt);
    const items = extractReceiptItems(sale);

    const itemsHtml = items.map(it => `
      <div class="row">
        <span class="bold">${it.description}</span>
        <span>${it.total.toLocaleString('fr-FR')} F</span>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket #${sale.id.slice(-6).toUpperCase()}</title>
          <style>
            @page { margin: 0; size: auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              font-weight: 600;
              line-height: 1.35;
              width: 58mm;
              max-width: 100%;
              margin: 0 auto;
              padding: 8px 4px;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 900; }
            .shop-title { font-size: 15px; font-weight: 900; margin-bottom: 2px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total-row { font-size: 14px; font-weight: 900; margin: 6px 0; }
            .footer { font-size: 10px; margin-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="shop-title">${shopName.toUpperCase()}</div>
            ${phone ? `<div>Tél : ${phone}</div>` : ''}
            ${city ? `<div>${city}</div>` : ''}
            <div style="font-size: 10px; margin-top: 2px; font-weight: 900;">REÇU DE CAISSE</div>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Date :</span>
            <span>${dateStr}</span>
          </div>
          <div class="row">
            <span>Réf :</span>
            <span>#${sale.id.slice(-8).toUpperCase()}</span>
          </div>
          ${sale.customerName ? `
          <div class="row">
            <span>Client :</span>
            <span>${sale.customerName}</span>
          </div>` : ''}

          <div class="divider"></div>
          <div class="row bold">
            <span>ARTICLES</span>
            <span>PRIX</span>
          </div>
          <div class="divider"></div>

          ${itemsHtml}

          <div class="double-divider"></div>

          <div class="row total-row">
            <span>TOTAL :</span>
            <span>${sale.totalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <div class="row">
            <span>Mode :</span>
            <span>${sale.isCredit ? 'À CRÉDIT' : sale.paymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : sale.paymentMethod === 'WAVE' ? 'Wave' : 'Espèces'}</span>
          </div>

          ${!sale.isCredit && sale.receivedAmount && sale.receivedAmount > sale.totalAmount ? `
          <div class="row">
            <span>Reçu :</span>
            <span>${sale.receivedAmount.toLocaleString('fr-FR')} F</span>
          </div>
          <div class="row bold">
            <span>Monnaie :</span>
            <span>${(sale.changeAmount || 0).toLocaleString('fr-FR')} F</span>
          </div>
          ` : ''}

          <div class="divider"></div>

          <div class="footer">
            <div>Merci pour votre achat !</div>
            <div style="font-size: 9px; margin-top: 3px;">FASOCARNET</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    try {
      const printWindow = window.open('', '_blank', 'width=380,height=600');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl p-4 text-center space-y-2.5 max-h-[92vh] flex flex-col justify-between animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
          <div className="flex items-center space-x-1.5 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-extrabold">Vente Enregistrée !</h3>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
            {sale.isCredit ? 'À CRÉDIT' : 'PAYÉ'}
          </span>
        </div>

        {/* APERÇU DU REÇU IMAGE STYLISÉ AVEC TAMPON */}
        <div className="bg-gray-100 rounded-xl p-1.5 border border-gray-200 overflow-hidden max-h-48 sm:max-h-56 flex items-center justify-center shadow-inner">
          {isGenerating ? (
            <div className="py-10 text-xs text-gray-500 font-semibold animate-pulse">
              Génération du ticket stylisé...
            </div>
          ) : receiptImageUrl ? (
            <img
              src={receiptImageUrl}
              alt="Reçu de Caisse"
              className="max-h-44 sm:max-h-52 rounded-lg shadow-sm object-contain"
            />
          ) : null}
        </div>

        {/* STATUT IMPRESSION BLUETOOTH */}
        {printStatus && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-2 rounded-xl flex items-center justify-center space-x-2 animate-in fade-in">
            {isPrinting ? <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="font-bold">{printStatus}</span>
          </div>
        )}

        {/* BOUTONS D'ACTION */}
        <div className="space-y-2 pt-0.5">
          {/* 1. Bouton Principal : Partager le Reçu */}
          <button
            type="button"
            onClick={handleShareReceiptImage}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Partager le Reçu (WhatsApp)</span>
          </button>

          {/* 2. Grille 2 boutons : Imprimer & Télécharger */}
          <div className="grid grid-cols-2 gap-2">
            {/* Bouton Imprimer (Bluetooth / ESC-POS) */}
            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrintReceipt}
              className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
              title="Rechercher et imprimer directement sur imprimante Bluetooth 58mm ou Wi-Fi"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isPrinting ? 'Impression...' : 'Imprimer Ticket'}</span>
            </button>

            {/* Bouton Télécharger l'image */}
            <button
              type="button"
              onClick={handleDownloadImage}
              className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-slate-200/80 active:scale-98"
              title="Enregistrer l'image du reçu sur votre appareil"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Télécharger</span>
            </button>
          </div>

          {/* 3. Bouton Nouvelle Vente */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Nouvelle Vente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
