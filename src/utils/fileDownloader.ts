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
  if (Capacitor.isPluginAvailable('Filesystem')) {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(content)));
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      if (Capacitor.isPluginAvailable('Share')) {
        await Share.share({
          title,
          text: `Fichier : ${fileName}`,
          url: writeResult.uri,
          dialogTitle: `Ouvrir / Sauvegarder ${fileName}`
        });
      }

      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return { success: true, method: 'native' };
      }
      console.warn('[Downloader] Échec natif Filesystem/Share, tentative Web Share:', err);
    }
  }

  // 2. Web Share API avec fichier réel
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

  // 3. Téléchargement standard via élément <a>
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
