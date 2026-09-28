/**
 * Utilitaire de résolution de l'URL du serveur Backend REST FasoCarnet
 */

export const PRODUCTION_RENDER_API_URL = 'https://fasocarnet-cloud-api.onrender.com';

let inMemoryCustomServerUrl: string | null = null;

export const setCustomServerUrl = (url: string) => {
  const clean = url.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    if (clean) {
      localStorage.setItem('fasocarnet_server_url', clean);
    } else {
      localStorage.removeItem('fasocarnet_server_url');
    }
  }
  inMemoryCustomServerUrl = clean || null;
};

export const getApiBaseUrl = (): string => {
  // 1. URL personnalisée en mémoire ou dans localStorage
  if (inMemoryCustomServerUrl) {
    return inMemoryCustomServerUrl;
  }

  if (typeof window !== 'undefined') {
    // 2. URL stockée dans localStorage
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('fasocarnet_server_url');
      if (saved && saved.trim()) {
        return saved.trim().replace(/\/+$/, '');
      }
    }

    // 3. Variable d'environnement Vite
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('localhost:5000')) {
      return envUrl.trim().replace(/\/+$/, '');
    }

    // 4. Si l'application tourne sur le Web (Render, Vercel, domaine personnalisé)
    if (
      window.location &&
      window.location.protocol &&
      window.location.protocol.startsWith('http') &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ) {
      return window.location.origin;
    }

    // 5. Si l'application tourne sur mobile (Capacitor / Android WebView / PWA installée)
    const isMobileApp = 
      window.location.protocol === 'capacitor:' || 
      window.location.protocol === 'file:' || 
      window.location.hostname === 'localhost';

    if (isMobileApp && typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
      return PRODUCTION_RENDER_API_URL;
    }
  }

  // 6. Environnement par défaut
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
};
