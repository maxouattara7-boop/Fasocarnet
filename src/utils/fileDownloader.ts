import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Convertit un DataURL (base64) en Blob de manière synchrone et ultra-rapide
 * (évite les délais asynchrones de fetch() qui révoquent l'activation utilisateur pour le Web Share API)
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
 * Sauvegarde et/ou ouvre un fichier Excel / CSV sur l'appareil (Android & Web)
 */
export async function downloadOrShareTextFile(params: {
  fileName: string;
  content: string;
  mimeType?: string;
  title?: string;
}): Promise<FileActionResult> {
  const { fileName, content, mimeType = 'text/csv;charset=utf-8;', title = 'Bilan Comptable' } = params;

  // 1. Tenter l'utilisation des plugins natifs Capacitor si disponibles dans le binaire APK
  if (Capacitor.isPluginAvailable('Filesystem') && Capacitor.isPluginAvailable('Share')) {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(content)));
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title,
        text: `Fichier : ${fileName}`,
        url: writeResult.uri,
        dialogTitle: `Ouvrir / Sauvegarder ${fileName}`
      });

      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return { success: true, method: 'native' };
      }
      console.warn('[Downloader] Échec natif Filesystem/Share, tentative Web Share:', err);
    }
  }

  // 2. Web Share API avec fichier réel (Fonctionne directement dans les WebViews modernes et navigateurs mobiles)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const file = new File([blob], fileName, { type: 'text/csv' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `Export Bilan : ${fileName}`
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'web-share' };
      }
      console.warn('[Downloader] Web Share CSV non supporté ou échoué:', shareErr);
    }
  }

  // 3. Téléchargement standard via élément <a> (Navigateur web / PC)
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement texte:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}

/**
 * Sauvegarde une image (reçu PNG) dans la mémoire / galerie et/ou partage
 */
export async function downloadOrShareImage(params: {
  fileName: string;
  dataUrl: string;
  title?: string;
  text?: string;
  directShare?: boolean;
}): Promise<FileActionResult> {
  const { fileName, dataUrl, title = 'Reçu de caisse', text = 'Votre reçu de caisse', directShare = false } = params;

  // 1. Tenter les plugins natifs Capacitor si présents dans l'APK
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
        dialogTitle: directShare ? 'Partager le reçu (WhatsApp / Galerie)' : 'Enregistrer le reçu'
      });

      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return { success: true, method: 'native' };
      }
      console.warn('[Downloader] Erreur native Filesystem/Share image:', err);
    }
  }

  // 2. Web Share API avec fichier Image PNG (Permet l'envoi direct de l'image sur WhatsApp / Enregistrement dans les fichiers)
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

  // 3. Téléchargement navigateur classique (PC / Web standard)
  try {
    const blob = dataUrlToBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[Downloader] Échec téléchargement image web:', err);
    return { success: false, method: 'failed', error: err?.message };
  }
}
