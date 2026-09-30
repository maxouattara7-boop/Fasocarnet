# Plan d'Implémentation : FasoCarnet Plateforme Web SaaS Cloud-First

> **Directives pour l'exécutant :** Suivre les tâches séquentiellement. Chaque étape cochée (- [ ]) atteste du passage réussi des tests associés.

- **Objectif :** Transformer FasoCarnet en une plateforme web pure (Cloud-First SaaS) où Supabase PostgreSQL est l'unique autorité pour l'authentification et les données, éliminant les comptes fantômes, les résurrections locales et la tuyauterie de mise à jour ZIP.
- **Architecture :** Supabase (PostgreSQL Cloud) comme source unique de vérité. Authentification directe sans repli local trompeur. Suppression de la couche Capacitor Updater / dist.zip. Configuration SPA web prête pour déploiement instantané (Vercel/Netlify).
- **Stack Technique :** React 18, TypeScript, Vite, Tailwind CSS, Supabase JS Client v2, Vitest.

---

## Contraintes Globales & Invariants
1. **Zéro compte fantôme** : Aucune authentification ne peut réussir si la boutique n'existe pas dans Supabase.
2. **Suppression irréversible et immédiate** : Un compte supprimé dans Supabase est instantanément déconnecté de tout appareil et ne peut jamais être restauré par un cache.
3. **Zéro dist.zip** : Déploiement web standard instantané via `vite build`.
4. **Ergonomie Mobile préservée** : Support PWA (manifest + viewport) pour fonctionnement plein écran fluide sur smartphone.

---

### Tâche 1 : Supabase comme unique autorité d'authentification et de session

**Fichiers :**
- Modifier : `src/db/services/syncService.ts`
- Modifier : `src/store/appStore.ts`
- Tester : `src/db/services/syncService.test.ts`

**Contrat d'Interfaces :**
- `loginAndRestore(phone, pin)` : Interroge exclusivement Supabase. Rejette immédiatement si non trouvé.
- `loadCurrentShop()` : Valide l'existence dans Supabase au lancement. Déconnecte et purge si le compte a été supprimé.

**Étapes détaillées :**
- [ ] Étape 1 : Nettoyer `syncService.loginAndRestore` pour supprimer définitivement tout accès au cache local comme solution de repli d'authentification.
- [ ] Étape 2 : Sécuriser `appStore.loadCurrentShop` pour que Supabase valide l'existence de la boutique avant tout affichage.
- [ ] Étape 3 : Valider avec les tests unitaires `npx vitest run src/db/services/syncService.test.ts`.
- [ ] Étape 4 : Commit atomique Git.

---

### Tâche 2 : Élimination de la tuyauterie obsolète (Live Update / dist.zip)

**Fichiers :**
- Modifier : `package.json` (script build simplifié)
- Modifier : `src/App.tsx` (suppression de l'orchestration du téléchargement de zip)
- Supprimer : `scripts/build-bundle.cjs`
- Tester : `npm run build`

**Contrat d'Interfaces :**
- Le build produit un dossier `dist/` web standard optimisé, sans dépendance à des archives zip ou des numéros de versions binaires.

**Étapes détaillées :**
- [ ] Étape 1 : Retirer l'appel à `updateService.checkForUpdate()` et la modale `UpdateModal` dans `src/App.tsx`.
- [ ] Étape 2 : Mettre à jour `package.json` pour que `"build": "tsc && vite build"`.
- [ ] Étape 3 : Supprimer le script `scripts/build-bundle.cjs`.
- [ ] Étape 4 : Tester la compilation `npm run build`.
- [ ] Étape 5 : Commit atomique Git.

---

### Tâche 3 : Configuration du déploiement Web SaaS Universel (Vercel / SPA)

**Fichiers :**
- Créer : `vercel.json` (gestion du routage SPA sans erreur 404)
- Modifier : `index.html` (métadonnées PWA et viewport mobile)
- Tester : Vérification de la configuration de build

**Contrat d'Interfaces :**
- Toutes les routes web mènent à `index.html` (Single Page Application).
- Sur mobile, l'application s'ouvre en plein écran via "Ajouter à l'écran d'accueil".

**Étapes détaillées :**
- [ ] Étape 1 : Créer `vercel.json` avec les règles de réécriture pour SPA.
- [ ] Étape 2 : Vérifier les balises meta de `index.html` (viewport, apple-mobile-web-app-capable, theme-color).
- [ ] Étape 3 : Commit atomique Git.

---

### Tâche 4 : Validation globale et tests de non-régression

**Fichiers :**
- Tester : Ensemble de la suite de tests

**Étapes détaillées :**
- [ ] Étape 1 : Exécuter la suite complète `npx vitest run`.
- [ ] Étape 2 : Exécuter `npm run build`.
- [ ] Étape 3 : Commit et push sur `main`.
