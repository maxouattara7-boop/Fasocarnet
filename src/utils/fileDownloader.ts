import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Convertit un DataURL (base64) en Blob de manière synchrone et ultra-rapide
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const base64Data = parts.length > 1 ? parts[1] : parts[0];
  
  const byteChars = atob(base64Data);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mime });
}

/**
 * Convertit un DataURL en chaîne Base64 pure
 */
export function dataUrlToBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : parts[0];
}

export interface FileActionResult {
  success: boolean;
  method: 'native' | 'web-share' | 'download' | 'failed';
  error?: string;
}

/**
 * Sauvegarde et télécharge un fichier Excel / CSV directement vers les documents de l'appareil
 */
export async function downloadOrShareTextFile(params: {
  fileName: string;
  content: string;
  mimeType?: string;
  title?: string;
}): Promise<FileActionResult> {
  const { fileName, content, mimeType = 'text/csv;charset=utf-8;' } = params;

  // 1. Tenter l'utilisation des plugins natifs Capacitor si installés en binaire natif APK
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')) {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(content)));
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      console.warn('[Downloader] Échec écriture native Filesystem:', err);
    }
  }

  // 2. Téléchargement direct standard navigateur / ordinateur / mobile (Dossier Téléchargements / Documents)
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement texte:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}

/**
 * Sauvegarde la photo du reçu dans le stockage / Galerie de l'appareil
 */
export async function downloadOrShareImage(params: {
  fileName: string;
  dataUrl: string;
  title?: string;
  text?: string;
  directShare?: boolean;
}): Promise<FileActionResult> {
  const { fileName, dataUrl, title = 'Reçu de caisse', text = 'Votre reçu de caisse', directShare = false } = params;

  // 1. Tenter les plugins natifs Capacitor pour écrire dans Documents / Galerie
  if (Capacitor.isPluginAvailable('Filesystem')) {
    try {
      const base64 = dataUrlToBase64(dataUrl);

      // Écriture dans Documents (accessible dans la mémoire de l'appareil)
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });

      // Également dans Cache pour partage immédiat si besoin
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });

      if (Capacitor.isPluginAvailable('Share')) {
        await Share.share({
          title,
          text,
          url: writeResult.uri,
          dialogTitle: directShare ? 'Envoyer la photo sur WhatsApp / Galerie' : 'Enregistrer dans la Galerie / Photos'
        });
      }

      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return { success: true, method: 'native' };
      }
      console.warn('[Downloader] Erreur native Filesystem/Share image:', err);
    }
  }

  // 2. Web Share API avec fichier réel Image PNG
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'web-share' };
      }
      console.warn('[Downloader] navigator.share image non disponible:', shareErr);
    }
  }

  // 3. Téléchargement navigateur classique (PC / Navigateur standard)
  try {
    const blob = dataUrlToBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement image web:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}

/**
 * Sauvegarde et/ou partage un fichier PDF (Facture, Devis, Bilan) sur Android ou le Web
 */
export async function downloadOrSharePdfBlob(params: {
  fileName: string;
  blob: Blob;
  base64Data?: string;
  title?: string;
  text?: string;
  directShare?: boolean;
}): Promise<FileActionResult> {
  const { fileName, blob, base64Data, title = 'Document PDF', text = 'Votre document', directShare = false } = params;

  // 1. Capacitor Filesystem / Share sur Android APK
  if (Capacitor.isPluginAvailable('Filesystem')) {
    try {
      let b64 = base64Data;
      if (!b64) {
        const reader = new FileReader();
        b64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: b64,
        directory: Directory.Documents,
        recursive: true
      });

      // Également dans le Cache pour partage immédiat
      await Filesystem.writeFile({
        path: fileName,
        data: b64,
        directory: Directory.Cache
      });

      if (Capacitor.isPluginAvailable('Share')) {
        await Share.share({
          title,
          text,
          url: writeResult.uri,
          dialogTitle: directShare ? `Partager ${fileName} sur WhatsApp / Email` : `Enregistrer ${fileName}`
        });
      }

      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return { success: true, method: 'native' };
      }
      console.warn('[Downloader] Erreur native Filesystem/Share PDF:', err);
    }
  }

  // 2. Web Share API avec fichier réel PDF
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') {
        return { success: true, method: 'web-share' };
      }
      console.warn('[Downloader] navigator.share PDF non disponible:', shareErr);
    }
  }

  // 3. Téléchargement direct standard (PC / Web / Navigateur)
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement PDF web:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}

