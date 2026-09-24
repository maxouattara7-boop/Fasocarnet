import { Sale, ShopProfile } from '../types';
import { formatDateTime } from './formatters';

// Commandes standards ESC/POS
const ESC = 0x1B;
const GS = 0x1D;

const CMD = {
  INIT: [ESC, 0x40], // Initialisation
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11], // 2x Hauteur et Largeur
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  NORMAL_TEXT: [GS, 0x21, 0x00],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  CUT: [GS, 0x56, 0x41, 0x03] // Coupe papier partielle
};

// UUIDs standards pour services Bluetooth d'imprimantes thermiques (SPP / Serial Port Profile)
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Android thermal printers (POS-58/80)
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb'
];

let connectedDevice: any = null;
let writeCharacteristic: any = null;

/**
 * Nettoie les caractères accentués pour éviter les caractères chinois ou corrompus sur imprimante thermique
 */
export function sanitizeTextForPrinter(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r]/g, ' ');
}

/**
 * Formate deux colonnes de texte avec espacement parfait (ex: Désignation ...... 15 000 F)
 */
export function formatTwoColumns(left: string, right: string, maxCols = 32): string {
  const cleanLeft = sanitizeTextForPrinter(left);
  const cleanRight = sanitizeTextForPrinter(right);
  const totalLen = cleanLeft.length + cleanRight.length;

  if (totalLen >= maxCols) {
    const truncatedLeft = cleanLeft.slice(0, Math.max(0, maxCols - cleanRight.length - 1));
    const spaces = Math.max(1, maxCols - (truncatedLeft.length + cleanRight.length));
    return `${truncatedLeft}${' '.repeat(spaces)}${cleanRight}`;
  }

  const spaces = maxCols - totalLen;
  return `${cleanLeft}${' '.repeat(spaces)}${cleanRight}`;
}

/**
 * Formate une ligne d'article simple :
 * Article à gauche             Prix à droite
 * Ex: Cahier 200p                1 500 F
 */
export function formatArticleLine(description: string, price: number, maxCols = 32): string {
  const priceStr = `${price.toLocaleString('fr-FR')} F`;
  return formatTwoColumns(description, priceStr, maxCols);
}

/**
 * Construit le flux binaire ESC/POS pour le ticket de caisse
 */
export function buildEscPosPayload(
  sale: Sale,
  shop?: Partial<ShopProfile>,
  paperWidth: '58mm' | '80mm' = '58mm'
): Uint8Array {
  const maxCols = paperWidth === '80mm' ? 48 : 32;
  const buffer: number[] = [];

  const write = (bytes: number[]) => {
    buffer.push(...bytes);
  };

  const writeText = (text: string) => {
    const clean = sanitizeTextForPrinter(text);
    for (let i = 0; i < clean.length; i++) {
      buffer.push(clean.charCodeAt(i));
    }
  };

  const writeLine = (text: string) => {
    writeText(text);
    buffer.push(0x0A); // LF (\n)
  };

  // 1. Initialisation
  write(CMD.INIT);

  // 2. En-tête Centré
  write(CMD.ALIGN_CENTER);
  write(CMD.BOLD_ON);
  write(CMD.DOUBLE_SIZE_ON);
  const shopName = shop?.name || 'FASOCARNET';
  writeLine(shopName.toUpperCase());

  write(CMD.NORMAL_TEXT);
  write(CMD.BOLD_OFF);

  if (shop?.phone) {
    writeLine(`Tel : ${shop.phone}`);
  }
  if (shop?.city) {
    writeLine(shop.city);
  }
  if (shop?.ifu) {
    writeLine(`IFU : ${shop.ifu}`);
  }
  if (shop?.rccm) {
    writeLine(`RCCM: ${shop.rccm}`);
  }

  writeLine('--------------------------------');
  write(CMD.BOLD_ON);
  writeLine('RECU DE CAISSE');
  write(CMD.BOLD_OFF);
  writeLine('--------------------------------');

  // 3. Métadonnées (Date, Réf, Client)
  write(CMD.ALIGN_LEFT);
  writeLine(`Date : ${formatDateTime(sale.createdAt)}`);
  writeLine(`Ref  : #${sale.id.slice(-8).toUpperCase()}`);
  if (sale.customerName) {
    writeLine(`Client : ${sale.customerName}`);
  }

  writeLine('--------------------------------');

  // 4. Liste détaillée des articles ligne par ligne (Nom à gauche, Prix à droite)
  write(CMD.BOLD_ON);
  writeLine(formatTwoColumns('ARTICLES / FOURNITURES', 'PRIX', maxCols));
  write(CMD.BOLD_OFF);
  writeLine('- - - - - - - - - - - - - - - -');

  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      writeLine(formatArticleLine(item.description, item.unitPrice * (item.quantity || 1), maxCols));
    }
  } else if (sale.notes) {
    // Si la note contient plusieurs articles séparés par des virgules ou des +
    const splitItems = sale.notes.split(/[,+]/).map(s => s.trim()).filter(Boolean);
    if (splitItems.length > 1) {
      for (const subItem of splitItems) {
        const matchPrice = subItem.match(/\((\d+)\)/);
        const p = matchPrice ? parseInt(matchPrice[1], 10) : Math.round(sale.totalAmount / splitItems.length);
        const name = subItem.replace(/\(\d+\)/, '').trim() || subItem;
        writeLine(formatArticleLine(name, p, maxCols));
      }
    } else {
      writeLine(formatArticleLine(sale.notes, sale.totalAmount, maxCols));
    }
  } else {
    writeLine(formatArticleLine('Vente Directe Caisse', sale.totalAmount, maxCols));
  }

  writeLine('================================');

  // 5. Total Net en Grand
  write(CMD.ALIGN_RIGHT);
  write(CMD.BOLD_ON);
  write(CMD.DOUBLE_HEIGHT_ON);
  writeLine(`TOTAL : ${sale.totalAmount.toLocaleString('fr-FR')} FCFA`);

  write(CMD.NORMAL_TEXT);
  write(CMD.BOLD_OFF);

  // 6. Mode de paiement et Monnaie
  let modeStr = 'Especes';
  if (sale.isCredit) modeStr = 'A CREDIT';
  else if (sale.paymentMethod === 'ORANGE_MONEY') modeStr = 'Orange Money';
  else if (sale.paymentMethod === 'MOOV_MONEY') modeStr = 'Moov Money';
  else if (sale.paymentMethod === 'WAVE') modeStr = 'Wave';

  writeLine(formatTwoColumns('Reglement :', modeStr, maxCols));

  if (!sale.isCredit && sale.receivedAmount && sale.receivedAmount > sale.totalAmount) {
    writeLine(formatTwoColumns('Recu :', `${sale.receivedAmount.toLocaleString('fr-FR')} F`, maxCols));
    write(CMD.BOLD_ON);
    writeLine(formatTwoColumns('Monnaie rendue :', `${(sale.changeAmount || 0).toLocaleString('fr-FR')} F`, maxCols));
    write(CMD.BOLD_OFF);
  }

  writeLine('--------------------------------');

  // 7. Statut & Tampon Texte
  write(CMD.ALIGN_CENTER);
  write(CMD.BOLD_ON);
  if (sale.isCredit) {
    writeLine('*** ACCORDE A CREDIT ***');
  } else {
    writeLine('*** PAYE ENTIEREMENT ***');
  }
  write(CMD.BOLD_OFF);

  // 8. Pied de page
  writeLine('');
  writeLine('Merci pour votre achat !');
  writeLine('FASOCARNET - Application de Gestion');
  writeLine('');

  // 9. Saut de ligne et coupe papier
  write(CMD.FEED_LINES(4));
  write(CMD.CUT);

  return new Uint8Array(buffer);
}

/**
 * Vérifie si le navigateur supporte Web Bluetooth
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as any).bluetooth);
}

/**
 * Recherche et connecte une imprimante thermique Bluetooth à proximité
 */
export async function requestBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      error: 'Votre navigateur ou appareil ne supporte pas la recherche directe Bluetooth. Utilisez Chrome sur Android ou l\'application installée.'
    };
  }

  try {
    const bluetooth = (navigator as any).bluetooth;

    // Déclenche la modale système de recherche d'appareils Bluetooth
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES
    });

    if (!device) {
      return { success: false, error: 'Aucun appareil sélectionné.' };
    }

    connectedDevice = device;
    const server = await device.gatt.connect();

    // Recherche de la caractéristique d'écriture (Write / WriteWithoutResponse)
    const services = await server.getPrimaryServices();
    let targetChar: any = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetChar = char;
            break;
          }
        }
        if (targetChar) break;
      } catch {
        continue;
      }
    }

    if (!targetChar) {
      return {
        success: false,
        error: `Connecté à ${device.name || 'Appareil'}, mais aucun canal d'impression thermique n'a été trouvé.`
      };
    }

    writeCharacteristic = targetChar;
    return { success: true, deviceName: device.name || 'Imprimante Thermique' };
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
      return { success: false, error: 'Recherche Bluetooth annulée.' };
    }
    return { success: false, error: err.message || 'Impossible de se connecter à l\'imprimante Bluetooth.' };
  }
}

/**
 * Envoie le ticket de caisse vers l'imprimante Bluetooth connectée
 */
export async function printViaBluetooth(
  sale: Sale,
  shop?: Partial<ShopProfile>,
  paperWidth: '58mm' | '80mm' = '58mm'
): Promise<{ success: boolean; message: string }> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      message: 'Bluetooth non supporté sur ce navigateur.'
    };
  }

  try {
    if (!writeCharacteristic || !connectedDevice?.gatt?.connected) {
      const connectRes = await requestBluetoothPrinter();
      if (!connectRes.success) {
        return { success: false, message: connectRes.error || 'Connexion imprimante impossible.' };
      }
    }

    const payload = buildEscPosPayload(sale, shop, paperWidth);

    // Découpage en blocs de 100 octets pour compatibilité Bluetooth BLE
    const CHUNK_SIZE = 100;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      if (writeCharacteristic.writeValueWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      // Pause de 20ms entre les paquets pour ne pas saturer le buffer de l'imprimante
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return {
      success: true,
      message: `Ticket imprimé avec succès sur ${connectedDevice?.name || 'l\'imprimante Bluetooth'} !`
    };
  } catch (err: any) {
    // Reset en cas d'erreur de connexion
    writeCharacteristic = null;
    return {
      success: false,
      message: `Erreur d'impression Bluetooth : ${err.message || 'Vérifiez que l\'imprimante est allumée.'}`
    };
  }
}

/**
 * Envoie le flux binaire ESC/POS directement à l'application driver Bluetooth Android (RawBT)
 * Permet l'impression instantanée sans passer par un navigateur externe.
 */
export function printViaRawBt(
  sale: Sale,
  shop?: Partial<ShopProfile>,
  paperWidth: '58mm' | '80mm' = '58mm'
): { success: boolean; message: string } {
  try {
    const payload = buildEscPosPayload(sale, shop, paperWidth);
    let binary = '';
    const bytes = new Uint8Array(payload);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const rawBtUrl = `rawbt:base64,${base64}`;

    // Tenter l'ouverture du protocole RawBT direct
    window.location.href = rawBtUrl;

    return {
      success: true,
      message: 'Ticket envoyé vers l\'imprimante thermique Bluetooth !'
    };
  } catch (err: any) {
    console.error('Erreur RawBT:', err);
    return {
      success: false,
      message: 'Impossible de joindre le service d\'impression thermique direct.'
    };
  }
}

/**
 * Impression Système Android intégrée via iframe invisible.
 * ÉVITE TOTALEMENT l'ouverture de navigateur externe ("Ouvrir avec Mi / Chrome").
 */
export function printViaHiddenIframe(htmlContent: string): void {
  try {
    const frameId = 'fasocarnet-print-frame';
    const existingFrame = document.getElementById(frameId);
    if (existingFrame) {
      document.body.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = frameId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 15000);
      }, 350);
    }
  } catch (err) {
    console.warn('Erreur iframe print, fallback:', err);
    window.print();
  }
}
