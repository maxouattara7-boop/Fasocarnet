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

export const CURRENT_APP_VERSION = '1.2.8';
export const CURRENT_VERSION_CODE = 11;

const PRIMARY_VERSION_URL = 'https://raw.githubusercontent.com/maxouattara7-boop/Fasocarnet/main/version.json';
const BACKUP_VERSION_URL = 'https://fasocarnet.onrender.com/version.json';
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
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            reject(new Error('Format JSON invalide'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Erreur réseau XHR'));
      xhr.ontimeout = () => reject(new Error('Délai dépassé XHR'));
      xhr.send();
    } catch (err) {
      reject(err);
    }
  });
};

class UpdateService {
  /**
   * Confirme au plugin Capgo que la version active fonctionne correctement (anti-rollback)
   */
  async notifyAppReady(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorUpdater.notifyAppReady();
        console.log('[UpdateService] App déclarée prête avec succès');
      } catch (err) {
        console.warn('[UpdateService] Erreur notifyAppReady:', err);
      }
    }
  }

  /**
   * Vérifie si une mise à jour distante est disponible.
   * Ne bloque jamais l'application en cas d'absence de réseau ou d'erreur.
   */
  async checkForUpdate(): Promise<{ hasUpdate: boolean; updateInfo?: AppUpdateInfo; error?: string }> {
    const cacheBuster = `?_t=${Date.now()}`;
    const endpoints = [
      `${PRIMARY_VERSION_URL}${cacheBuster}`,
      `${BACKUP_VERSION_URL}${cacheBuster}`
    ];

    let lastError: any = null;

    for (const url of endpoints) {
      try {
        let timeoutId: any;
        const fetchPromise = fetch(url);
        const timeoutPromise = new Promise<Response>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Délai dépassé')), 5000);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        if (response && (response as Response).ok) {
          const data: AppUpdateInfo = await (response as Response).json();
          if (data && (typeof data.versionCode === 'number' || typeof data.version === 'string')) {
            const hasUpdate = (typeof data.versionCode === 'number' && data.versionCode > CURRENT_VERSION_CODE) ||
                              (typeof data.version === 'string' && data.version !== CURRENT_APP_VERSION);
            return {
              hasUpdate,
              updateInfo: hasUpdate ? data : undefined
            };
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[UpdateService] Échec fetch sur ${url}, tentative XHR...`, err);
        // Fallback XMLHttpRequest
        try {
          const data: AppUpdateInfo = await fetchWithXhr(url, 5000);
          if (data && (typeof data.versionCode === 'number' || typeof data.version === 'string')) {
            const hasUpdate = (typeof data.versionCode === 'number' && data.versionCode > CURRENT_VERSION_CODE) ||
                              (typeof data.version === 'string' && data.version !== CURRENT_APP_VERSION);
            return {
              hasUpdate,
              updateInfo: hasUpdate ? data : undefined
            };
          }
        } catch (xhrErr) {
          console.warn(`[UpdateService] Échec XHR sur ${url}:`, xhrErr);
        }
      }
    }

    if (lastError) {
      return { hasUpdate: false, error: 'Connexion au serveur impossible' };
    }

    return { hasUpdate: false };
  }

  /**
   * Télécharge et applique une mise à jour à chaud (Live Update / OTA)
   */
  async applyLiveUpdate(bundleUrl: string, version: string): Promise<{ success: boolean; message?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, message: 'Les mises à jour à chaud sont réservées à l\'application installée.' };
    }

    try {
      console.log(`[UpdateService] Téléchargement Live Update v${version} depuis ${bundleUrl}...`);
      const bundle = await CapacitorUpdater.download({
        url: bundleUrl,
        version: version
      });

      console.log(`[UpdateService] Application du bundle v${version}...`);
      await CapacitorUpdater.set(bundle);
      
      // Forcer le rechargement immédiat du conteneur natif
      try {
        await CapacitorUpdater.reload();
      } catch {
        window.location.reload();
      }

      return { success: true };
    } catch (err: any) {
      console.error('[UpdateService] Erreur applyLiveUpdate:', err);
      return {
        success: false,
        message: err.message || 'Impossible d\'appliquer la mise à jour à chaud.'
      };
    }
  }

  /**
   * Vérification et téléchargement silencieux en arrière-plan (sans déranger le commerçant)
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
        console.log(`[LiveUpdate] Mise à jour v${res.updateInfo.version} prête pour le prochain démarrage !`);
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
