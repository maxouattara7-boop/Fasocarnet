export interface AppUpdateInfo {
  version: string;
  versionCode: number;
  releaseDate?: string;
  title?: string;
  releaseNotes: string;
  apkUrl: string;
  mandatory?: boolean;
}

export const CURRENT_APP_VERSION = '1.2.2';
export const CURRENT_VERSION_CODE = 6;

const REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/maxouattara7-boop/Fasocarnet/main/version.json';
const DISMISSED_UPDATE_KEY = 'fasocarnet_dismissed_update';

class UpdateService {
  /**
   * Vérifie si une mise à jour distante est disponible.
   * Ne bloque jamais l'application en cas d'absence de réseau ou d'erreur.
   */
  async checkForUpdate(): Promise<{ hasUpdate: boolean; updateInfo?: AppUpdateInfo }> {
    try {
      // Ajout d'un paramètre timestamp pour éviter le cache HTTP
      const cacheBusterUrl = `${REMOTE_VERSION_URL}?_t=${Date.now()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(cacheBusterUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
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
      // En cas de coupure de réseau ou d'erreur réseau, continuer silencieusement
      return { hasUpdate: false };
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
      // Ignoré pour cette version et aujourd'hui
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
      // Ignore localStorage errors
    }
  }

  /**
   * Lance le téléchargement direct du fichier APK.
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
