# Plan d'Implémentation : FasoCarnet MVP (Micro-SaaS Mobile Commerçants)

> **Directives pour l'exécutant :** Chaque étape utilise la syntaxe de case à cocher (`- [ ]`) pour assurer un suivi rigoureux. Suivre strictement le cycle TDD (test rouge -> code minimal -> test vert -> commit).

- **Objectif :** Construire le MVP complet et installable de l'application mobile et PWA FasoCarnet pour la gestion des ventes, le carnet de crédit client, les reçus et les relances WhatsApp hors-ligne.
- **Architecture :** Application Frontend PWA Offline-First (React + TypeScript + Tailwind CSS) avec persistance locale dans IndexedDB (Dexie.js), gestion d'état Zustand, générateur de messages de relance WhatsApp et protection par code PIN.
- **Stack Technique :** Node.js 24, React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Dexie.js (IndexedDB), Vitest, React Testing Library.
- **Spécification de référence :** [`docs/specs/2026-09-17-fasocarnet-spec.md`](../specs/2026-09-17-fasocarnet-spec.md)

---

## Contraintes Globales & Invariants

1. **Offline-First Absolu :** Aucune opération vitale (vente, consultation de dette, enregistrement client, calcul de bilan) ne doit dépendre d'une connexion réseau.
2. **Performance Mobile :** Temps de chargement initial < 1s, interface optimisée pour le toucher (touch targets >= 48px), contrastes visuels adaptés au plein soleil.
3. **Format Monétaire :** Tous les montants s'affichent en FCFA (XOF) avec séparateur d'espace pour les milliers (ex: `15 000 FCFA`).
4. **Zéro Erreur de Test :** 100% des tests unitaires et composants doivent passer au vert.

---

## Tâches d'Implémentation

### Tâche 1 : Initialisation du Projet & Outillage (Vite + React + TypeScript + Tailwind + Vitest + Dexie)

**Fichiers concernés :**
- Création : `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `vitest.config.ts`, `src/test/setup.ts`
- Tests : `src/App.test.tsx`

**Contrat d'Interfaces :**
- *Produit :* Environnement de développement prêt avec exécution des tests via `npm test` et build via `npm run build`.

**Étapes d'exécution :**
- [ ] **Étape 1 : Initialiser le projet et installer les dépendances** (`react`, `react-dom`, `lucide-react`, `dexie`, `zustand`, `clsx`, `tailwind-merge`, `canvas-confetti` et devDeps `vite`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@testing-library/react`, `jsdom`, `@testing-library/jest-dom`).
- [ ] **Étape 2 : Écrire le test unitaire défaillant `src/App.test.tsx`** vérifiant le rendu du titre et du composant racine.
- [ ] **Étape 3 : Configurer Vite, Tailwind, Vitest et implémenter `src/App.tsx`**.
- [ ] **Étape 4 : Exécuter `npm test` et constater le passage au vert**.
- [ ] **Étape 5 : Commit atomique Git** (`chore: init project structure with vite, tailwind and vitest`).

---

### Tâche 2 : Couche de Persistance Locale IndexedDB & Services Métier (Dexie.js)

**Fichiers concernés :**
- Création : `src/types/index.ts`, `src/db/db.ts`, `src/db/services/salesService.ts`, `src/db/services/customersService.ts`, `src/db/services/debtsService.ts`
- Tests : `src/db/services/salesService.test.ts`, `src/db/services/customersService.test.ts`, `src/db/services/debtsService.test.ts`

**Contrat d'Interfaces :**
- *Consomme :* Types TypeScript (`ShopProfile`, `Customer`, `Sale`, `DebtRecord`, `PaymentTransaction`).
- *Produit :* Fonctions de persistance :
  - `recordSale(saleData): Promise<Sale>`
  - `addCustomer(customerData): Promise<Customer>`
  - `recordDebtPayment(debtId, amount, method): Promise<DebtRecord>`
  - `getDailySummary(date): Promise<DailySummary>`
  - `getShopProfile() / updateShopProfile(profile)`

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire les tests unitaires défaillants** pour la création d'une vente (cash & crédit), la mise à jour des soldes de dettes et le calcul du bilan journalier.
- [ ] **Étape 2 : Vérifier l'échec des tests** (`npm test src/db/services`).
- [ ] **Étape 3 : Implémenter le schéma Dexie et les 3 services métier**.
- [ ] **Étape 4 : Exécuter les tests et valider le passage au vert**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(db): implement offline indexeddb models and services with dexie`).

---

### Tâche 3 : Utilitaires de Formatage & Moteur de Relance WhatsApp

**Fichiers concernés :**
- Création : `src/utils/formatters.ts`, `src/utils/whatsapp.ts`
- Tests : `src/utils/formatters.test.ts`, `src/utils/whatsapp.test.ts`

**Contrat d'Interfaces :**
- *Consomme :* `Customer`, `ShopProfile`, `DebtRecord`, `Sale`.
- *Produit :*
  - `formatCurrency(amount: number): string` (ex: `15 000 FCFA`)
  - `generateWhatsAppDebtReminderUrl(customer, debt, shop): string`
  - `generateWhatsAppReceiptUrl(sale, customer, shop): string`
  - `calculateChange(totalAmount: number, receivedAmount: number): number`

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire les tests unitaires défaillants** pour le formatage FCFA, le calcul de monnaie et la génération d'URL WhatsApp encodée sans erreur.
- [ ] **Étape 2 : Vérifier l'échec des tests**.
- [ ] **Étape 3 : Coder les fonctions de formatage et de génération d'URL WhatsApp**.
- [ ] **Étape 4 : Valider le passage au vert**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(utils): implement currency formatters and whatsapp link generator`).

---

### Tâche 4 : Composant Caisse Éclair & Pavé Numérique (Screen: Vente)

**Fichiers concernés :**
- Création : `src/components/pos/Keypad.tsx`, `src/components/pos/PaymentModal.tsx`, `src/components/pos/PosView.tsx`, `src/components/pos/ReceiptModal.tsx`
- Tests : `src/components/pos/Keypad.test.tsx`, `src/components/pos/PosView.test.tsx`

**Contrat d'Interfaces :**
- *Consomme :* `salesService`, `customersService`, `formatCurrency`, `calculateChange`.
- *Produit :* Interface de vente complète (< 5s), choix du mode (Cash, OM, Moov, Wave, Crédit), sélection du client si crédit, calcul de monnaie, affichage du reçu avec bouton WhatsApp.

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire le test unitaire défaillant** simulant la saisie d'un montant (ex: 5 000), le choix de "Cash", la saisie d'un billet de 10 000, et la vérification de la monnaie (5 000 FCFA).
- [ ] **Étape 2 : Vérifier l'échec du test**.
- [ ] **Étape 3 : Implémenter les composants `Keypad`, `PaymentModal`, `ReceiptModal` et `PosView`**.
- [ ] **Étape 4 : Valider le passage au vert des tests**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(pos): implement fast keypad and pos checkout flow`).

---

### Tâche 5 : Composant Carnet de Dettes & Recouvrement (Screen: Crédits)

**Fichiers concernés :**
- Création : `src/components/debts/DebtsView.tsx`, `src/components/debts/CustomerCard.tsx`, `src/components/debts/NewCustomerModal.tsx`, `src/components/debts/PaymentModal.tsx`
- Tests : `src/components/debts/DebtsView.test.tsx`

**Contrat d'Interfaces :**
- *Consomme :* `customersService`, `debtsService`, `generateWhatsAppDebtReminderUrl`.
- *Produit :* Vue complète du carnet de dettes avec total général dû, recherche client, déclenchement de la relance WhatsApp 1-clic, enregistrement d'acomptes de remboursement.

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire le test unitaire défaillant** pour l'affichage des clients débiteurs et le clic sur le bouton de relance.
- [ ] **Étape 2 : Vérifier l'échec du test**.
- [ ] **Étape 3 : Implémenter les composants du carnet de dettes**.
- [ ] **Étape 4 : Valider le passage au vert des tests**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(debts): implement debt book, customer debt profiles and whatsapp reminder`).

---

### Tâche 6 : Composant Bilan Journalier & Historique de Caisse (Screen: Rapports)

**Fichiers concernés :**
- Création : `src/components/reports/DailyReportView.tsx`, `src/components/reports/SalesHistoryList.tsx`
- Tests : `src/components/reports/DailyReportView.test.tsx`

**Contrat d'Interfaces :**
- *Consomme :* `salesService`, `debtsService`, `formatCurrency`.
- *Produit :* Tableau de bord journalier synthétique avec ventilation des encaissements (Cash, OM, Moov, Wave), crédits du jour, dettes recouvrées et liste chronologique des ventes.

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire le test unitaire défaillant** pour le calcul et l'affichage des cartes de synthèse du rapport journalier.
- [ ] **Étape 2 : Vérifier l'échec du test**.
- [ ] **Étape 3 : Implémenter `DailyReportView` et `SalesHistoryList`**.
- [ ] **Étape 4 : Valider le passage au vert**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(reports): implement daily financial report and sales history`).

---

### Tâche 7 : Paramètres Boutique, Sécurité par Code PIN & Navigation Mobile

**Fichiers concernés :**
- Création : `src/components/layout/Header.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/settings/SettingsView.tsx`, `src/components/auth/PinLockModal.tsx`, `src/store/appStore.ts`
- Tests : `src/components/auth/PinLockModal.test.tsx`, `src/components/settings/SettingsView.test.tsx`

**Contrat d'Interfaces :**
- *Consomme :* État global Zustand.
- *Produit :* Barre de navigation mobile inférieure (Vente, Dettes, Rapports, Paramètres), écran de configuration de la boutique (nom, téléphones Orange Money / Moov Money pour les reçus/relances), verrouillage par code PIN optionnel.

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire le test unitaire défaillant** pour la saisie du PIN et la modification des coordonnées de la boutique.
- [ ] **Étape 2 : Vérifier l'échec du test**.
- [ ] **Étape 3 : Implémenter le store Zustand, la navigation, les paramètres et le verrouillage PIN**.
- [ ] **Étape 4 : Valider le passage au vert**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(settings): implement shop configuration, pin lock and mobile bottom navigation`).

---

### Tâche 8 : Manifest PWA, Support Hors-ligne & Validation Globale

**Fichiers concernés :**
- Création/Modification : `public/manifest.json`, `public/icon-192.png`, `public/icon-512.png`, `public/sw.js`, `index.html`
- Tests : Suite de tests globale (`npm test`), validation du build (`npm run build`).

**Étapes d'exécution :**
- [ ] **Étape 1 : Configurer le manifest PWA (nom "FasoCarnet", theme_color, icons, standalone display)**.
- [ ] **Étape 2 : Enregistrer le Service Worker pour la mise en cache complète offline**.
- [ ] **Étape 3 : Lancer l'ensemble des tests (`npm test -- --run`) et vérifier 100% de réussite**.
- [ ] **Étape 4 : Lancer le build de production (`npm run build`) et s'assurer de l'absence d'erreurs TypeScript/Vite**.
- [ ] **Étape 5 : Commit atomique Git** (`feat(pwa): add pwa manifest, offline service worker and finalize mvp`).
