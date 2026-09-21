import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Utilitaire de retours haptiques / vibration mobile
 * Optimisé pour smartphones Android et tablettes (Web & APK Capacitor)
 */

export const isHapticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const pref = localStorage.getItem('fasocarnet_haptics_enabled');
  return pref !== null ? pref === 'true' : true;
};

export const setHapticsEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fasocarnet_haptics_enabled', String(enabled));
  }
};

/**
 * Déclenche une vibration haptique franche et réactive (touches calculatrice, touches de caisse)
 */
export const triggerHaptic = (durationMs: number = 40): void => {
  if (!isHapticsEnabled()) return;

  try {
    // 1. Si on est sur l'APK native Android / Capacitor
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        Haptics.vibrate({ duration: durationMs }).catch(() => {});
      });
    }

    // 2. Déclenchement via l'API Web Vibration (fonctionne sur Chrome Android et navigateurs mobiles)
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Silencieux si non supporté
  }
};

/**
 * Vibration double pour actions importantes (validation, addition +, encaissement)
 */
export const triggerDoubleHaptic = (): void => {
  if (!isHapticsEnabled()) return;

  try {
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {
        Haptics.vibrate({ duration: 60 }).catch(() => {});
      });
    }

    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      navigator.vibrate([45, 50, 45]);
    }
  } catch {
    // Silencieux
  }
};