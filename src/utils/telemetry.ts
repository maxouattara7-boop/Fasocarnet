import { DeviceTelemetry } from '../types';

const DEVICE_ID_KEY = 'fasocarnet_device_id_v1';
const INSTALL_DATE_KEY = 'fasocarnet_install_date_v1';

export const APP_VERSION = '1.2.0';

/**
 * Détecte l'opérateur mobile à partir d'un numéro de téléphone burkinabè (8 chiffres)
 */
export const detectBurkinaOperator = (phone?: string): 'ORANGE' | 'MOOV' | 'TELECEL' | 'OTHER' => {
  if (!phone) return 'OTHER';
  const clean = phone.replace(/\D/g, '').slice(-8);
  if (clean.length < 2) return 'OTHER';

  const prefix = clean.substring(0, 2);

  // Préfixes Orange Burkina Faso : 05, 06, 07, 54, 55, 56, 57, 64, 65, 66, 67, 74, 75, 76, 77
  const orangePrefixes = ['05', '06', '07', '54', '55', '56', '57', '64', '65', '66', '67', '74', '75', '76', '77'];
  if (orangePrefixes.includes(prefix)) return 'ORANGE';

  // Préfixes Moov Africa Burkina Faso : 01, 02, 03, 50, 51, 52, 53, 60, 61, 62, 63, 70, 71, 72, 73
  const moovPrefixes = ['01', '02', '03', '50', '51', '52', '53', '60', '61', '62', '63', '70', '71', '72', '73'];
  if (moovPrefixes.includes(prefix)) return 'MOOV';

  // Préfixes Telecel Faso : 58, 68, 69, 78, 79
  const telecelPrefixes = ['58', '68', '69', '78', '79'];
  if (telecelPrefixes.includes(prefix)) return 'TELECEL';

  return 'OTHER';
};

/**
 * Récupère ou génère un identifiant unique persistant pour cet appareil
 */
export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server_device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

/**
 * Récupère ou enregistre la date de première installation de l'application sur cet appareil
 */
export const getOrCreateInstallDate = (): string => {
  if (typeof window === 'undefined') return new Date().toISOString();
  let installDate = localStorage.getItem(INSTALL_DATE_KEY);
  if (!installDate) {
    installDate = new Date().toISOString();
    localStorage.setItem(INSTALL_DATE_KEY, installDate);
  }
  return installDate;
};

/**
 * Détecte la plateforme de l'appareil (Android Capacitor, iOS, Web Mobile ou Desktop)
 */
export const detectPlatform = (): 'android' | 'ios' | 'web_mobile' | 'desktop' => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';

  const userAgent = navigator.userAgent || '';
  const isCapacitor = (window as any).Capacitor !== undefined;

  if (isCapacitor) {
    if (/android/i.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  }

  if (/android/i.test(userAgent)) {
    return 'web_mobile';
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'ios';
  }
  if (/mobile|tablet/i.test(userAgent)) {
    return 'web_mobile';
  }

  return 'desktop';
};

/**
 * Génère le rapport de télémétrie actuel pour cet appareil
 */
export const collectCurrentTelemetry = (phone?: string, city?: string): DeviceTelemetry => {
  const deviceId = getOrCreateDeviceId();
  const installedAt = getOrCreateInstallDate();
  const platform = detectPlatform();
  const operator = detectBurkinaOperator(phone);
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  return {
    deviceId,
    platform,
    appVersion: APP_VERSION,
    userAgent,
    installedAt,
    lastActiveAt: new Date().toISOString(),
    city: city?.trim() || undefined,
    operator
  };
};
