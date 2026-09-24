import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Utilitaire universel pour sauvegarder et partager des fichiers
 * Fonctionne parfaitement sur Android (Capacitor Native) et sur le Web.
 */

/**
 * Convertit un DataURL (base64) en chaîne base64 pure
 */
function dataUrlToBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : parts[0];
}

/**
 * Sauvegarde et/ou ouvre un fichier Excel / CSV sur l'appareil
 */
export async function downloadOrShareTextFile(params: {
  fileName: string;
  content: string;
  mimeType?: string;
  title?: string;
}): Promise<boolean> {
  const { fileName, content, mimeType = 'text/csv;charset=utf-8;', title = 'Bilan Comptable' } = params;

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Écriture du fichier dans le répertoire Documents / Cache
      const base64Data = btoa(unescape(encodeURIComponent(content)));
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // 2. Partage natif / Ouverture dans Excel ou l'appli de choix
      await Share.share({
        title,
        text: `Fichier : ${fileName}`,
        url: writeResult.uri,
        dialogTitle: `Ouvrir / Sauvegarder ${fileName}`
      });

      return true;
    } catch (err: any) {
      console.warn('[Downloader] Erreur partage natif, tentative fallback web:', err);
    }
  }

  // Fallback navigateur web
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('[Downloader] Échec téléchargement web:', err);
    return false;
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
}): Promise<boolean> {
  const { fileName, dataUrl, title = 'Reçu de caisse', text = 'Votre reçu de caisse', directShare = false } = params;

  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = dataUrlToBase64(dataUrl);

      // Écriture du fichier image dans le cache
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });

      // Partage direct de l'image (pour WhatsApp / Sauvegarder dans Galerie / Imprimer)
      await Share.share({
        title,
        text,
        url: writeResult.uri,
        dialogTitle: directShare ? 'Partager le reçu via WhatsApp ou autre' : 'Enregistrer ou Partager le reçu'
      });

      return true;
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.name === 'AbortError') {
        return true; // Annulation utilisateur
      }
      console.warn('[Downloader] Erreur native image:', err);
    }
  }

  // Web fallback
  if (directShare && typeof navigator !== 'undefined' && navigator.share) {
    try {
      // Conversion DataURL -> File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text
        });
        return true;
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') return true;
      console.warn('[Downloader] navigator.share échoué:', shareErr);
    }
  }

  // Téléchargement navigateur classique
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('[Downloader] Échec téléchargement image web:', err);
    return false;
  }
}
