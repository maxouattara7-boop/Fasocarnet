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
 * Sauvegarde une image (PNG ou JPEG) directement dans les fichiers de l'appareil (Téléchargements / Documents)
 */
export async function downloadOrShareImage(params: {
  fileName: string;
  dataUrl: string;
  title?: string;
  text?: string;
  directShare?: boolean;
  mimeType?: string;
}): Promise<FileActionResult> {
  const { fileName, dataUrl, title = 'Reçu de caisse', text = 'Votre reçu de caisse', directShare = false, mimeType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'image/png' } = params;

  // CAS 1 : Partage explicite demandé (WhatsApp, Bluetooth ou Partage système)
  if (directShare) {
    if (Capacitor.isPluginAvailable('Filesystem') && Capacitor.isPluginAvailable('Share')) {
      try {
        const base64 = dataUrlToBase64(dataUrl);
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache
        });

        await Share.share({
          title,
          text,
          url: writeResult.uri,
          dialogTitle: 'Envoyer ou partager l\'image'
        });

        return { success: true, method: 'native' };
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
          return { success: true, method: 'native' };
        }
        console.warn('[Downloader] Erreur partage natif image:', err);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], fileName, { type: mimeType });

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
        console.warn('[Downloader] navigator.share non disponible:', shareErr);
      }
    }
  }

  // CAS 2 : Téléchargement direct standard (Ordinateur & Téléphone -> Dossier Documents / Téléchargements)
  // 1. Si environnement natif Android APK, écrire dans le dossier Documents de l'appareil
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')) {
    try {
      const base64 = dataUrlToBase64(dataUrl);
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (fsErr) {
      console.warn('[Downloader] Écriture native Documents:', fsErr);
    }
  }

  // 2. Déclencher le téléchargement navigateur standard
  try {
    const blob = dataUrlToBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement image web:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}

/**
 * Sauvegarde et/ou partage un fichier PDF (Facture, Devis, Bilan) directement dans les documents
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

  // CAS 1 : Partage explicite demandé
  if (directShare) {
    if (Capacitor.isPluginAvailable('Filesystem') && Capacitor.isPluginAvailable('Share')) {
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
          directory: Directory.Cache
        });

        await Share.share({
          title,
          text,
          url: writeResult.uri,
          dialogTitle: `Partager ${fileName}`
        });

        return { success: true, method: 'native' };
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
          return { success: true, method: 'native' };
        }
        console.warn('[Downloader] Erreur partage natif PDF:', err);
      }
    }

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
  }

  // CAS 2 : Téléchargement direct standard (Ordinateur & Téléphone -> Dossier Documents / Téléchargements)
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')) {
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

      await Filesystem.writeFile({
        path: fileName,
        data: b64,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (fsErr) {
      console.warn('[Downloader] Écriture native PDF Documents:', fsErr);
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement PDF web:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}

