import React, { useState, useEffect } from 'react';
import { Sale } from '../../types';
import { useAppStore } from '../../store/appStore';
import { generateWhatsAppReceiptUrl } from '../../utils/whatsapp';
import { generateReceiptDataUrl, generateReceiptFile } from '../../utils/receiptGenerator';
import { formatDateTime } from '../../utils/formatters';
import { CheckCircle2, MessageSquare, ArrowRight, Download, Share2, Printer } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, sale, onClose }) => {
  const { shopProfile } = useAppStore();
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      generateImage();
    } else {
      setReceiptImageUrl(null);
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

  const handleSendTextWhatsApp = () => {
    const url = generateWhatsAppReceiptUrl(sale, shopProfile || undefined, sale.customerPhone);
    window.open(url, '_blank');
  };

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

  const handlePrintThermalReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    const shopName = shopProfile?.name || 'FASOCARNET';
    const phone = shopProfile?.phone || '';
    const city = shopProfile?.city || '';
    const dateStr = formatDateTime(sale.createdAt);

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
              padding: 10px 4px;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 900; }
            .shop-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
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

          ${sale.notes ? `
          <div style="margin-bottom: 4px;">
            <div class="bold">DÉSIGNATION :</div>
            <div style="padding-left: 2px; font-size: 11px;">${sale.notes}</div>
          </div>
          ` : `
          <div class="row">
            <span>Vente Directe Caisse</span>
            <span>${sale.totalAmount.toLocaleString('fr-FR')} F</span>
          </div>
          `}

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
            <div style="font-size: 9px; margin-top: 3px;">FASOCARNET MOBILE</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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

        {/* BOUTONS D'ACTION */}
        <div className="space-y-1.5 pt-0.5">
          {/* Bouton Partage Image WhatsApp */}
          <button
            type="button"
            onClick={handleShareReceiptImage}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-1.5 text-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>PARTAGER L'IMAGE DU REÇU (WhatsApp)</span>
          </button>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Bouton Message Texte WhatsApp */}
            <button
              type="button"
              onClick={handleSendTextWhatsApp}
              className="py-2 px-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold rounded-lg text-xs flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer"
              title="Envoyer le détail de la vente en texte sur WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-[#128C7E]" />
              <span className="text-[9px]">Texte WhatsApp</span>
            </button>

            {/* Bouton Imprimer Ticket Thermique */}
            <button
              type="button"
              onClick={handlePrintThermalReceipt}
              className="py-2 px-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer shadow-xs"
              title="Imprimer le ticket sur imprimante Bluetooth 58mm ou de caisse"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px]">Imprimer Ticket</span>
            </button>

            {/* Bouton Télécharger l'image */}
            <button
              type="button"
              onClick={handleDownloadImage}
              className="py-2 px-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs flex flex-col items-center justify-center space-y-0.5 transition-all cursor-pointer"
              title="Enregistrer l'image du reçu sur votre appareil"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[9px]">Télécharger</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Nouvelle Vente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
