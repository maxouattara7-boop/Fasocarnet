import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Enregistrement du Service Worker pour le fonctionnement PWA et hors-ligne
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[PWA] ServiceWorker actif avec succès:', registration.scope);
        // Forcer la vérification immédiate d'une mise à jour
        registration.update().catch(() => {});
      },
      (err) => {
        console.warn('[PWA] Échec enregistrement ServiceWorker:', err);
      }
    );
  });
}
