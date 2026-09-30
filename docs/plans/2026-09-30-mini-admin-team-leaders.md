# Plan d'Implémentation : Espace Mini-Administrateur (Chefs d'Équipe) & Gestion des Recrues

> **Directives pour l'exécutant :** Chaque étape utilise la syntaxe de case à cocher (`- [ ]`) pour assurer un suivi rigoureux. Suivre strictement le cycle TDD (test rouge -> code minimal -> test vert -> commit).

- **Objectif :** Créer un espace Mini-Administrateur pour les chefs d'équipe, leur permettant de visualiser les performances de leur équipe, d'ajouter de nouvelles recrues avec génération automatique de code d'affiliation, avec authentification unifiée intelligente et synchronisation Cloud avec le Super-Admin.
- **Architecture :** Modèle `TeamLeaderAccount` sécurisé, méthodes CRUD & dashboard dans `adminService`, gestion de session dans `appStore`, composant `MiniAdminDashboard.tsx` réactif et gestion des comptes chefs dans `AdminDashboard.tsx`.
- **Stack Technique :** React 18, TypeScript, Tailwind CSS, Zustand, Dexie (IndexedDB), Vitest, Vite.
- **Spécification de référence :** [`docs/specs/2026-09-30-mini-admin-team-leaders-spec.md`](../specs/2026-09-30-mini-admin-team-leaders-spec.md)

---

## Contraintes Globales & Invariants

- **Sécurité :** Codes PIN des chefs d'équipe hachés avec SHA-256 + sel cryptographique (`hashPassword` / `verifyHash`).
- **Cloisonnement :** Le chef d'équipe ne peut voir et agir que sur son équipe et ses commerciaux rattachés.
- **Règle de synchronisation :** Toute création de chef d'équipe ou de recrue persiste localement (`localStorage` / IndexedDB) et se pousse dans `_admin_vault` sur le Cloud.
- **Rétrocompatibilité :** Aucun impact négatif sur les commerçants existants ou l'accès Super-Admin (`65616134`).

---

## Tâches d'Implémentation

### Tâche 1 : Types & Modèle de Données

**Fichiers concernés :**
- Modification : `src/types/index.ts`

**Contrat d'Interfaces :**
- *Produit :* `TeamLeaderAccount`, `TeamLeaderDashboardData`, et extension de `CommercialTeam` (`leaderId?: string`).

**Étapes d'exécution :**
- [ ] **Étape 1 : Ajouter les types dans `src/types/index.ts`**
  ```typescript
  export interface TeamLeaderAccount {
    id: string;
    fullName: string;
    phone: string;
    pinCodeHash: string;
    teamId: string;
    teamName: string;
    zone?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt?: string;
  }

  export interface TeamLeaderDashboardData {
    leader: TeamLeaderAccount;
    team: CommercialTeam;
    membersCount: number;
    totalShopsReferred: number;
    activeSubscribedShops: number;
    currentWeekCommissionTotal: number;
    commercials: CommercialAffiliateReport[];
  }
  ```
- [ ] **Étape 2 : Vérifier la compilation TypeScript**
  Commande : `npx tsc --noEmit`

---

### Tâche 2 : Service d'Administration des Chefs d'Équipe (`adminService.ts`)

**Fichiers concernés :**
- Modification : `src/db/services/adminService.ts`
- Création / Tests : `src/db/services/teamLeaderService.test.ts`

**Contrat d'Interfaces :**
- *Produit :*
  - `getAllTeamLeaders(): Promise<TeamLeaderAccount[]>`
  - `saveTeamLeader(data: Partial<TeamLeaderAccount> & { pinCode?: string }): Promise<TeamLeaderAccount>`
  - `deleteTeamLeader(leaderId: string): Promise<void>`
  - `verifyTeamLeaderCredentials(phone: string, pin: string): Promise<TeamLeaderAccount | null>`
  - `getTeamLeaderDashboardData(leaderId: string): Promise<TeamLeaderDashboardData | null>`

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire les tests unitaires pour la gestion des chefs d'équipe** (`teamLeaderService.test.ts`)
- [ ] **Étape 2 : Exécuter le test et constater l'échec**
  Commande : `npx vitest run src/db/services/teamLeaderService.test.ts`
- [ ] **Étape 3 : Implémenter les méthodes dans `src/db/services/adminService.ts`**
- [ ] **Étape 4 : Confirmer le passage au vert des tests**
  Commande : `npx vitest run src/db/services/teamLeaderService.test.ts`
- [ ] **Étape 5 : Commit atomique Git**

---

### Tâche 3 : Session Chef d'Équipe & Authentification Unifiée dans le Store (`appStore.ts`)

**Fichiers concernés :**
- Modification : `src/store/appStore.ts`
- Modification : `src/components/onboarding/OnboardingView.tsx`

**Contrat d'Interfaces :**
- *Consomme :* `adminService.verifyTeamLeaderCredentials`, `adminService.isAdminCredentials`
- *Produit :* `activeTeamLeader: TeamLeaderAccount | null`, `isMiniAdminOpen: boolean`, `logoutMiniAdmin()`, `openMiniAdmin(leader)`.

**Étapes d'exécution :**
- [ ] **Étape 1 : Étendre `AppState` dans `src/store/appStore.ts`**
- [ ] **Étape 2 : Mettre à jour `loginWithPhoneAndPin` dans `appStore.ts` pour détecter les chefs d'équipe**
- [ ] **Étape 3 : Adapter `OnboardingView.tsx` pour gérer la redirection vers l'espace Mini-Admin**
- [ ] **Étape 4 : Valider avec les tests existants**
  Commande : `npx vitest run`

---

### Tâche 4 : Module de Gestion des Chefs d'Équipe dans l'Espace Super-Admin (`AdminDashboard.tsx`)

**Fichiers concernés :**
- Modification : `src/components/admin/AdminDashboard.tsx`

**Étapes d'exécution :**
- [ ] **Étape 1 : Ajouter la section « Chefs d'équipe (Mini-Admins) » dans l'onglet Équipes**
- [ ] **Étape 2 : Ajouter le modal de création / modification d'un compte chef d'équipe (Nom, Téléphone, PIN, Équipe, Zone)**
- [ ] **Étape 3 : Ajouter les actions d'activation/désactivation, changement de code PIN et suppression**
- [ ] **Étape 4 : Vérifier l'intégration et la réactivité de l'interface**

---

### Tâche 5 : Composant Tableau de Bord Mini-Admin (`MiniAdminDashboard.tsx`)

**Fichiers concernés :**
- Création : `src/components/admin/MiniAdminDashboard.tsx`
- Tests : `src/components/admin/MiniAdminDashboard.test.tsx`

**Contrat d'Interfaces :**
- *Consomme :* `useAppStore`, `adminService.getTeamLeaderDashboardData`, `adminService.saveCommercialAgent`, `adminService.generateUniqueCommercialCode`

**Étapes d'exécution :**
- [ ] **Étape 1 : Écrire le test unitaire pour `MiniAdminDashboard.tsx`**
- [ ] **Étape 2 : Implémenter le composant `MiniAdminDashboard.tsx`** :
  - En-tête avec badge équipe, nom du chef et bouton de déconnexion
  - Grille des KPI de l'équipe (commerciaux, boutiques recrutées, abonnements, commissions)
  - Tableau / cartes des commerciaux de l'équipe avec commissions individuelles
  - Modal « Recruter un commercial » avec génération automatique du code unique et partage WhatsApp
- [ ] **Étape 3 : Valider le passage au vert des tests**
  Commande : `npx vitest run src/components/admin/MiniAdminDashboard.test.tsx`

---

### Tâche 6 : Intégration globale, Tests E2E et Build

**Fichiers concernés :**
- Modification : `src/App.tsx`
- Modification : `src/App.test.tsx`

**Étapes d'exécution :**
- [ ] **Étape 1 : Intégrer l'affichage conditionnel de `MiniAdminDashboard` dans `src/App.tsx`**
- [ ] **Étape 2 : Ajouter les tests d'intégration pour le flux chef d'équipe dans `src/App.test.tsx`**
- [ ] **Étape 3 : Exécuter la suite complète de tests**
  Commande : `npx vitest run`
- [ ] **Étape 4 : Exécuter le build de production**
  Commande : `npm run build`
- [ ] **Étape 5 : Commit final et push sur GitHub**
  Commande : `git add . && git commit -m "feat(admin): espace mini-administrateur pour les chefs d'equipe" && git push origin main`
