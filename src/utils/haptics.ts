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
 * Déclenche une vibration haptique franche et réactive
 */
export const triggerHaptic = (durationMs: number = 35): void => {
  if (!isHapticsEnabled()) return;
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      // 35ms à 45ms offre la sensation tactile la plus nette sur les moteurs de vibration Android
      navigator.vibrate(durationMs);
    }
  } catch {
    // Silencieux sur navigateurs desktop
  }
};

/**
 * Vibration double pour actions importantes (validation, addition, encaissement)
 */
export const triggerDoubleHaptic = (): void => {
  if (!isHapticsEnabled()) return;
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate([30, 40, 40]);
    }
  } catch {
    // Silencieux
  }
};