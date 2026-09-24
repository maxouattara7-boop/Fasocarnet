import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export interface AppUpdateInfo {
  version: string;
  versionCode: number;
  releaseDate?: string;
  title?: string;
  releaseNotes: string;
  bundleUrl?: string;
  apkUrl: string;
  mandatory?: boolean;
}

export const CURRENT_APP_VERSION = '1.2.18';
export const CURRENT_VERSION_CODE = 21;

// Réseau multi-CDN redondant (GitHub Raw en direct + CDN jsDelivr + Render)
const UPDATE_SERVERS = [
  'https://raw.githubusercontent.com/maxouattara7-boop/Fasocarnet/main/version.json',
  'https://cdn.jsdelivr.net/gh/maxouattara7-boop/Fasocarnet@main/version.json',
  'https://fastly.jsdelivr.net/gh/maxouattara7-boop/Fasocarnet@main/version.json',
  'https://fasocarnet.onrender.com/version.json'
];

const DISMISSED_UPDATE_KEY = 'fasocarnet_dismissed_update';

/**
 * Récupère le JSON via XMLHttpRequest en tant que fallback WebView
 */
const fetchWithXhr = (url: string, timeoutMs: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = timeoutMs;
      if (typeof xhr.setRequestHeader === 'function') {
        try {
          xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          xhr.setRequestHeader('Pragma', 'no-cache');
        } catch {
          // Ignore
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response || JSON.parse(xhr.responseText);
            resolve(data);
          } catch (jsonErr) {
            reject(jsonErr);
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Erreur réseau XHR'));
      xhr.ontimeout = () => reject(new Error('Timeout XHR'));
      xhr.send();
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Compare deux chaînes de versions sémantiques (ex: '1.2.14' vs '1.2.13')
 * @returns true si remoteVersion > localVersion
 */
export function isNewerVersion(remoteVersion: string, localVersion: string = CURRENT_APP_VERSION): boolean {
  try {
    const rParts = remoteVersion.replace(/^v/, '').split('.').map(Number);
    const lParts = localVersion.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
      const r = rParts[i] || 0;
      const l = lParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    return false;
  } catch {
    return false;
  }
}

class UpdateService {
  /**
   * Notifie le plugin natif CapacitorUpdater que l'application actuelle a bien démarré
   */
  async notifyAppReady(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CapacitorUpdater.notifyAppReady();
      console.log('[UpdateService] App déclarée prête avec succès');
    } catch (err) {
      console.warn('[UpdateService] notifyAppReady warning:', err);
    }
  }

  /**
   * Vérifie la disponibilité d'une nouvelle version sur GitHub / jsDelivr / Render
   */
  async checkForUpdate(): Promise<{ hasUpdate: boolean; updateInfo?: AppUpdateInfo; error?: string }> {
    const timestamp = Date.now();
    let lastError: any = null;

    for (const baseUrl of UPDATE_SERVERS) {
      const url = `${baseUrl}?_t=${timestamp}`;
      try {
        let data: AppUpdateInfo | null = null;
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch (fetchErr) {
          console.warn(`[UpdateService] Échec fetch sur ${baseUrl}, tentative XHR...`);
        }

        if (!data) {
          data = await fetchWithXhr(url, 5000);
        }

        if (data && data.version) {
          const isNewer = isNewerVersion(data.version, CURRENT_APP_VERSION);
          const hasHigherCode = (data.versionCode || 0) > CURRENT_VERSION_CODE;
          const hasUpdate = isNewer || hasHigherCode;

          if (hasUpdate) {
            return { hasUpdate: true, updateInfo: data };
          } else {
            return { hasUpdate: false };
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[UpdateService] Erreur vérification sur ${baseUrl}:`, err);
      }
    }

    if (lastError) {
      return { hasUpdate: false, error: 'Connexion au serveur impossible' };
    }

    return { hasUpdate: false };
  }

  /**
   * Télécharge une mise à jour à chaud (Live Update / OTA)
   */
  async downloadLiveUpdate(bundleUrl: string, version: string): Promise<{ success: boolean; message?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, message: 'Les mises à jour à chaud sont réservées à l\'application installée.' };
    }

    // Essayer l'URL principale puis le CDN jsDelivr comme secours
    const downloadCandidates = [
      bundleUrl,
      'https://cdn.jsdelivr.net/gh/maxouattara7-boop/Fasocarnet@main/dist.zip',
      'https://raw.githubusercontent.com/maxouattara7-boop/Fasocarnet/main/dist.zip'
    ];

    let lastErr: any = null;

    for (const url of downloadCandidates) {
      try {
        console.log(`[UpdateService] Téléchargement Live Update v${version} depuis ${url}...`);
        const bundle = await CapacitorUpdater.download({
          url: `${url}?_t=${Date.now()}`,
          version: version
        });

        console.log(`[UpdateService] Application du bundle v${version}...`);
        await CapacitorUpdater.set(bundle);
        return { success: true };
      } catch (err: any) {
        lastErr = err;
        console.warn(`[UpdateService] Échec téléchargement bundle depuis ${url}:`, err);
      }
    }

    return {
      success: false,
      message: lastErr?.message || 'Impossible de télécharger la mise à jour à chaud.'
    };
  }

  /**
   * Alias pour compatibilité
   */
  async applyLiveUpdate(bundleUrl: string, version: string): Promise<{ success: boolean; message?: string }> {
    return this.downloadLiveUpdate(bundleUrl, version);
  }

  /**
   * Applique le rechargement lorsque l'utilisateur clique sur "Compris / C'est noté"
   */
  async reloadApp(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorUpdater.reload();
        return;
      } catch (e) {
        console.warn('Capacitor reload fallback:', e);
      }
    }
    window.location.reload();
  }

  /**
   * Vérification et téléchargement silencieux en arrière-plan (sans rechargement brusque)
   */
  async performBackgroundLiveUpdate(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const res = await this.checkForUpdate();
      if (res.hasUpdate && res.updateInfo?.bundleUrl) {
        console.log(`[LiveUpdate] Nouvelle version détectée en tâche de fond : v${res.updateInfo.version}`);
        const bundle = await CapacitorUpdater.download({
          url: res.updateInfo.bundleUrl,
          version: res.updateInfo.version
        });
        await CapacitorUpdater.set(bundle);
        console.log(`[LiveUpdate] Mise à jour v${res.updateInfo.version} enregistrée pour le prochain redémarrage !`);
      }
    } catch (err) {
      console.warn('[LiveUpdate] Échec mise à jour silencieuse:', err);
    }
  }

  /**
   * Vérifie si l'utilisateur a déjà ignoré cette version aujourd'hui.
   */
  isDismissed(version: string): boolean {
    try {
      const stored = localStorage.getItem(DISMISSED_UPDATE_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      const today = new Date().toISOString().slice(0, 10);
      return parsed.version === version && parsed.date === today;
    } catch {
      return false;
    }
  }

  /**
   * Marque la mise à jour comme ignorée pour aujourd'hui.
   */
  dismissUpdate(version: string): void {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(DISMISSED_UPDATE_KEY, JSON.stringify({ version, date: today }));
    } catch {
      // Ignore
    }
  }

  /**
   * Téléchargement manuel du fichier APK complet si besoin.
   */
  downloadAndInstallApk(apkUrl: string): void {
    if (!apkUrl) return;
    try {
      window.open(apkUrl, '_blank');
    } catch {
      window.location.href = apkUrl;
    }
  }
}

export const updateService = new UpdateService();
