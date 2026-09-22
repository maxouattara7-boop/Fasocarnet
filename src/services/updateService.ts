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

export const CURRENT_APP_VERSION = '1.2.3';
export const CURRENT_VERSION_CODE = 7;

const REMOTE_VERSION_URL = 'https://fasocarnet.onrender.com/version.json';
const BACKUP_VERSION_URL = 'https://raw.githubusercontent.com/maxouattara7-boop/Fasocarnet/main/version.json';
const DISMISSED_UPDATE_KEY = 'fasocarnet_dismissed_update';

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
  async checkForUpdate(): Promise<{ hasUpdate: boolean; updateInfo?: AppUpdateInfo }> {
    try {
      const cacheBuster = `?_t=${Date.now()}`;
      let response: Response | null = null;

      // 1. Essai Render d'abord
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        response = await fetch(`${REMOTE_VERSION_URL}${cacheBuster}`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);
      } catch {
        response = null;
      }

      // 2. Fallback GitHub
      if (!response || !response.ok) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          response = await fetch(`${BACKUP_VERSION_URL}${cacheBuster}`, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
          clearTimeout(timeoutId);
        } catch {
          response = null;
        }
      }

      if (!response || !response.ok) {
        return { hasUpdate: false };
      }

      const data: AppUpdateInfo = await response.json();

      if (data && typeof data.versionCode === 'number') {
        const hasUpdate = data.versionCode > CURRENT_VERSION_CODE;
        return {
          hasUpdate,
          updateInfo: hasUpdate ? data : undefined
        };
      }

      return { hasUpdate: false };
    } catch {
      return { hasUpdate: false };
    }
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
