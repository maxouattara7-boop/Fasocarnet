import React, { useState, useEffect } from 'react';
import { Sale } from '../../types';
import { useAppStore } from '../../store/appStore';
import { generateReceiptDataUrl, extractReceiptItems } from '../../utils/receiptGenerator';
import { printViaBluetooth, printViaRawBt, printViaHiddenIframe, isBluetoothSupported } from '../../utils/bluetoothPrinter';
import { generateWhatsAppReceiptUrl } from '../../utils/whatsapp';
import { formatDateTime } from '../../utils/formatters';
import { CheckCircle2, ArrowRight, Download, Share2, Printer, Loader2, Maximize2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { downloadOrShareImage } from '../../utils/fileDownloader';

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
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      generateImage();
      setPrintStatus(null);
    } else {
      setReceiptImageUrl(null);
      setPrintStatus(null);
      setIsFullscreenImageOpen(false);
    }
  }, [isOpen, sale]);

  const generateImage = async () => {
    if (!sale) return;
    setIsGenerating(true);
    try {
      const url = await generateReceiptDataUrl(sale, shopProfile || undefined);
      setReceiptImageUrl(url);
    } catch (err) {
      console.error('Erreur génération image reçu:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || !sale) return null;

  const handleShareReceiptImage = async () => {
    if (!receiptImageUrl) {
      if (isGenerating) {
        setPrintStatus('⏳ Génération du reçu en cours...');
        return;
      }
      return;
    }

    setIsSharing(true);
    setPrintStatus('📤 Ouverture du partage...');

    const safeShop = (shopProfile?.name || 'fasocarnet').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `recu_${safeShop}_${sale.id.slice(-6)}.png`;

    try {
      const result = await downloadOrShareImage({
        fileName,
        dataUrl: receiptImageUrl,
        title: `Reçu de caisse - ${shopProfile?.name || 'FasoCarnet'}`,
        text: `Voici votre reçu de paiement pour vos achats chez ${shopProfile?.name || 'FasoCarnet'}.`,
        directShare: true
      });

      if (result.success) {
        setPrintStatus('✓ Reçu partagé avec succès !');
        setTimeout(() => setPrintStatus(null), 3500);
      } else {
        // Fallback WhatsApp Web/URL
        setPrintStatus('✓ Ouverture de WhatsApp...');
        const waUrl = generateWhatsAppReceiptUrl(sale, shopProfile || undefined, sale.customerPhone);
        window.open(waUrl, '_blank');
        setTimeout(() => setPrintStatus(null), 3500);
      }
    } catch (err) {
      console.error('Erreur partage:', err);
      const waUrl = generateWhatsAppReceiptUrl(sale, shopProfile || undefined, sale.customerPhone);
      window.open(waUrl, '_blank');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!receiptImageUrl) {
      if (isGenerating) {
        setPrintStatus('⏳ Génération du reçu en cours...');
        return;
      }
      return;
    }

    setIsDownloading(true);
    setPrintStatus('💾 Enregistrement du reçu...');

    const safeShop = (shopProfile?.name || 'fasocarnet').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `recu_${safeShop}_${sale.id.slice(-6)}.png`;

    try {
      const result = await downloadOrShareImage({
        fileName,
        dataUrl: receiptImageUrl,
        title: `Reçu de caisse - ${shopProfile?.name || 'FasoCarnet'}`,
        text: `Reçu de paiement #${sale.id.slice(-6).toUpperCase()}`,
        directShare: false
      });

      if (result.success) {
        setPrintStatus('✓ Reçu téléchargé avec succès !');
      } else {
        setIsFullscreenImageOpen(true);
        setPrintStatus('💡 Maintenez le doigt sur l\'image pour l\'enregistrer');
      }
      setTimeout(() => setPrintStatus(null), 4000);
    } catch (err) {
      console.error('Erreur téléchargement image:', err);
      setIsFullscreenImageOpen(true);
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Construit le code HTML ultra-propre pour impression directe
   */
  const buildReceiptHtml = () => {
    const shopName = shopProfile?.name || 'FASOCARNET';
    const phone = shopProfile?.phone || '';
    const city = shopProfile?.city || '';
    const ifu = shopProfile?.ifu || '';
    const rccm = shopProfile?.rccm || '';
    const dateStr = formatDateTime(sale.createdAt);
    const items = extractReceiptItems(sale);

    const itemsHtml = items.map(it => `
      <div style="margin: 4px 0; border-bottom: 1px dotted #ccc; padding-bottom: 3px;">
        <div class="row bold">
          <span>${it.description}</span>
          <span>${it.total.toLocaleString('fr-FR')} F</span>
        </div>
        <div style="font-size: 11px; color: #444; display: flex; justify-content: space-between;">
          <span>Qté: ${it.quantity} x ${it.unitPrice.toLocaleString('fr-FR')} F</span>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket #${sale.id.slice(-6).toUpperCase()}</title>
          <style>
            @page { margin: 0; size: auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
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
            .shop-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total-row { font-size: 15px; font-weight: 900; margin: 6px 0; }
            .footer { font-size: 10px; margin-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="shop-title">${shopName.toUpperCase()}</div>
            ${phone ? `<div>Tél : ${phone}</div>` : ''}
            ${city ? `<div>${city}</div>` : ''}
            ${ifu ? `<div style="font-size: 11px;">IFU : ${ifu}</div>` : ''}
            ${rccm ? `<div style="font-size: 11px;">RCCM : ${rccm}</div>` : ''}
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
          <div class="row bold" style="font-size: 11px;">
            <span>ARTICLE (QTÉ x P.U.)</span>
            <span>TOTAL</span>
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
            <span>${sale.isCredit ? 'À CRÉDIT' : sale.paymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : sale.paymentMethod === 'WAVE' ? 'Wave' : sale.paymentMethod === 'MOOV_MONEY' ? 'Moov Money' : 'Espèces'}</span>
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
        </body>
      </html>
    `;
  };

  /**
   * Impression directe Bluetooth ESC/POS ou Impression Système intégrée
   */
  const handlePrintReceipt = async () => {
    setIsPrinting(true);

    // 1. Si Web Bluetooth direct est disponible (navigateur supporté)
    if (isBluetoothSupported()) {
      setPrintStatus('Recherche des imprimantes Bluetooth...');
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
          setTimeout(() => setIsPrinting(false), 3000);
          return;
        }
      } catch (err: any) {
        console.warn('Web Bluetooth error:', err);
      }
    }

    // 2. Sur Android Native : Tenter l'envoi direct ESC/POS Bluetooth via RawBT
    if (Capacitor.isNativePlatform()) {
      setPrintStatus('Envoi vers l\'imprimante Bluetooth...');
      printViaRawBt(sale, shopProfile || undefined);
    }

    // 3. Impression système intégrée via iframe cachée
    const html = buildReceiptHtml();
    printViaHiddenIframe(html);

    setTimeout(() => {
      setIsPrinting(false);
      setPrintStatus(null);
    }, 1500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-4 text-center space-y-2.5 max-h-[92vh] flex flex-col justify-between animate-in zoom-in-95 duration-150 border border-slate-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <div className="flex items-center space-x-1.5 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-extrabold font-display">Vente Enregistrée !</h3>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              {sale.isCredit ? 'À CRÉDIT' : 'PAYÉ'}
            </span>
          </div>

          {/* APERÇU DU REÇU IMAGE STYLISÉ AVEC TAMPON */}
          <div 
            onClick={() => receiptImageUrl && setIsFullscreenImageOpen(true)}
            className="relative group bg-slate-50 rounded-2xl p-1.5 border border-slate-200/80 overflow-hidden max-h-48 sm:max-h-56 flex items-center justify-center shadow-inner cursor-pointer"
            title="Cliquer pour voir en grand"
          >
            {isGenerating ? (
              <div className="py-10 text-xs text-slate-500 font-semibold animate-pulse flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Génération du ticket stylisé...</span>
              </div>
            ) : receiptImageUrl ? (
              <>
                <img
                  src={receiptImageUrl}
                  alt="Reçu de Caisse"
                  className="max-h-44 sm:max-h-52 rounded-xl shadow-xs object-contain"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                  <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center space-x-1">
                    <Maximize2 className="w-3 h-3" />
                    <span>Agrandir</span>
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {/* STATUT IMPRESSION & TELECHARGEMENT */}
          {printStatus && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-2 rounded-xl flex items-center justify-center space-x-2 animate-in fade-in">
              {isPrinting || isSharing || isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="font-bold">{printStatus}</span>
            </div>
          )}

          {/* BOUTONS D'ACTION */}
          <div className="space-y-2 pt-0.5">
            {/* 1. Bouton Principal : Partager le Reçu IMAGE PNG */}
            <button
              type="button"
              disabled={isSharing || isGenerating}
              onClick={handleShareReceiptImage}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-60"
            >
              {isSharing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>{isSharing ? 'Partage en cours...' : 'Partager le Reçu (Photo WhatsApp)'}</span>
            </button>

            {/* 2. Grille 2 boutons : Imprimer & Télécharger */}
            <div className="grid grid-cols-2 gap-2">
              {/* Bouton Imprimer (Bluetooth / ESC-POS / Système) */}
              <button
                type="button"
                disabled={isPrinting || isGenerating}
                onClick={handlePrintReceipt}
                className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                title="Imprimer directement sur imprimante thermique Bluetooth ou système"
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
                disabled={isDownloading || isGenerating}
                onClick={handleDownloadImage}
                className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-slate-200/80 active:scale-98 disabled:opacity-50"
                title="Enregistrer l'image du reçu sur votre appareil"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-slate-600" />
                )}
                <span>{isDownloading ? 'Enregistrement...' : 'Télécharger'}</span>
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

      {/* MODALE PLEIN ÉCRAN POUR ENREGISTRER / VISUALISER L'IMAGE */}
      {isFullscreenImageOpen && receiptImageUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm flex items-center justify-between text-white pb-2">
            <span className="text-xs font-bold">Aperçu HD du Reçu</span>
            <button
              type="button"
              onClick={() => setIsFullscreenImageOpen(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            <img
              src={receiptImageUrl}
              alt="Reçu de Caisse Plein Écran"
              className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
          </div>

          <div className="w-full max-w-sm space-y-2 pt-2 text-center">
            <p className="text-[11px] text-slate-300 font-medium">
              💡 <strong>Astuce :</strong> Maintenez votre doigt sur l'image pour l'enregistrer dans votre galerie photos.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShareReceiptImage}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenImageOpen(false)}
                className="py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
