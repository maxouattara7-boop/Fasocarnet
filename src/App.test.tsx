import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { db } from './db/db';
import { useAppStore } from './store/appStore';
import { syncService } from './db/services/syncService';
import { adminService } from './db/services/adminService';
import { Capacitor } from '@capacitor/core';

describe('FasoCarnet App Component', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.shopProfiles.clear();
    await db.customers.clear();
    await db.sales.clear();
    await db.debts.clear();

    useAppStore.setState({
      activeShopId: null,
      shopProfile: null,
      activeTeamLeader: null,
      isMiniAdminOpen: false,
      isLocked: false,
      isAdminOpen: false,
      isInitialized: false,
      activeTab: 'pos'
    });

    // Par défaut dans les tests de l'application, on simule l'environnement mobile natif
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  });

  it('renders landing page strictly when running on Web browser', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/La caisse & carnet digital/i)).toBeInTheDocument();
      expect(screen.getByText(/Pourquoi la PWA/i)).toBeInTheDocument();
      expect(screen.queryByTestId('btn-continue')).not.toBeInTheDocument();
    });
  });

  it('renders welcome screen on first launch and allows creating space after clicking Continuer', async () => {
    render(<App />);

    // 1. Présentation de la solution et phrase d'accroche Option 1
    await waitFor(() => {
      expect(screen.getByText(/FasoCarnet/i)).toBeInTheDocument();
      expect(screen.getByText(/CAISSE & CARNET DIGITAL/i)).toBeInTheDocument();
      expect(screen.getByTestId('btn-continue')).toBeInTheDocument();
    });

    // Clic sur "Continuer" pour accéder à la création / connexion
    fireEvent.click(screen.getByTestId('btn-continue'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-register')).toBeInTheDocument();
    });

    // Clic sur l'onglet "Créer un Espace"
    const tabRegister = screen.getByTestId('tab-register');
    fireEvent.click(tabRegister);

    // Remplissage du formulaire de création
    const shopInput = screen.getByPlaceholderText(/Alimentation La Grâce/i);
    const phoneInput = screen.getByPlaceholderText(/70 12 34 56/i);
    const pinInput = screen.getByPlaceholderText(/Ex: 1234/i);
    const submitBtn = screen.getByRole('button', { name: /VALIDER ET CRÉER MON ESPACE/i });

    fireEvent.change(shopInput, { target: { value: 'Quincaillerie Faso' } });
    fireEvent.change(phoneInput, { target: { value: '70001122' } });
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.click(submitBtn);

    // 2. Étape de vérification de sécurité anti-robot
    await waitFor(() => {
      expect(screen.getByText(/Vérification de sécurité/i)).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText(/Code ici/i);
    const confirmOtpBtn = screen.getByRole('button', { name: /VALIDER MON INSCRIPTION/i });

    // Saisie du code d'authentification (code master de test 2260)
    fireEvent.change(otpInput, { target: { value: '2260' } });
    fireEvent.click(confirmOtpBtn);

    // 3. Après validation OTP, on bascule vers la caisse principale
    await waitFor(() => {
      expect(screen.getByText(/Quincaillerie Faso/i)).toBeInTheDocument();
      expect(screen.getByText(/Montant à Encaisser/i)).toBeInTheDocument();
    });
  });

  it('allows logging in with phone and PIN on a new device and restores cloud data', async () => {
    // 1. Boutique enregistrée sur le Cloud depuis un autre appareil
    const cloudDb = syncService.getCloudDatabase();
    cloudDb['shop_123'] = {
      profile: {
        id: 'shop_123',
        name: 'Boutique Horizon',
        phone: '70112233',
        pinCode: '5678',
        city: 'Bobo-Dioulasso',
        currency: 'FCFA',
        isConfigured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      products: [
        { id: 'p1', name: 'Sucre 1kg', price: 750, createdAt: new Date().toISOString() }
      ],
      customers: [],
      debts: [],
      debtPayments: [],
      sales: [],
      licenses: [],
      lastUpdatedAt: new Date().toISOString()
    };
    syncService.saveCloudDatabase(cloudDb);

    render(<App />);

    // Clic sur "Continuer" depuis l'accueil
    await waitFor(() => {
      expect(screen.getByTestId('btn-continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-continue'));

    // L'onglet connexion est actif sur ce nouvel appareil
    await waitFor(() => {
      expect(screen.getByTestId('tab-login')).toBeInTheDocument();
    });

    const phoneInput = screen.getByPlaceholderText(/70 12 34 56/i);
    const pinInput = screen.getByPlaceholderText(/• • • •/i);
    const loginBtn = screen.getByRole('button', { name: /SE CONNECTER/i });

    fireEvent.change(phoneInput, { target: { value: '70112233' } });
    fireEvent.change(pinInput, { target: { value: '5678' } });
    fireEvent.click(loginBtn);

    // Accès immédiat à la caisse avec données restaurées
    await waitFor(() => {
      expect(screen.getByText(/Boutique Horizon/i)).toBeInTheDocument();
      expect(screen.getByText(/Montant à Encaisser/i)).toBeInTheDocument();
    });
  });

  it('allows stealth Super-Admin login with default phone 65616134 and PIN 656126', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-continue'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-login')).toBeInTheDocument();
    });

    const phoneInput = screen.getByPlaceholderText(/70 12 34 56/i);
    const pinInput = screen.getByPlaceholderText(/• • • •/i);
    const loginBtn = screen.getByRole('button', { name: /SE CONNECTER/i });

    fireEvent.change(phoneInput, { target: { value: '65616134' } });
    fireEvent.change(pinInput, { target: { value: '656126' } });
    fireEvent.click(loginBtn);

    // Vérifie que le tableau de bord Super-Admin s'ouvre directement
    await waitFor(() => {
      expect(screen.getByText(/FasoCarnet Admin/i)).toBeInTheDocument();
      expect(screen.getByText(/Super-Administrateur/i)).toBeInTheDocument();
      expect(screen.getByText(/Quitter Admin/i)).toBeInTheDocument();
    });
  });

  it('persists active page and remains logged in after page refresh', async () => {
    // 1. Boutique déjà configurée
    const shop = {
      id: 'shop_persist_1',
      name: 'Boutique Persistante',
      phone: '70998877',
      pinCode: '1234',
      city: 'Ouagadougou',
      currency: 'FCFA',
      isConfigured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.shopProfiles.put(shop);
    const cloudDb = syncService.getCloudDatabase();
    cloudDb['shop_persist_1'] = {
      profile: shop,
      products: [],
      customers: [],
      debts: [],
      debtPayments: [],
      sales: [],
      licenses: [],
      lastUpdatedAt: new Date().toISOString()
    };

    // L'utilisateur navigue vers l'onglet "debts" (Créances)
    useAppStore.getState().setActiveTab('debts');

    // 2. Simuler un rafraîchissement complet de la page (nouvelle initialisation)
    useAppStore.setState({
      activeShopId: null,
      shopProfile: null,
      isInitialized: false
    });

    const { unmount } = render(<App />);

    // L'application se charge directement sur la page des Créances sans demander de mot de passe ni revenir à la connexion
    await waitFor(() => {
      expect(screen.getByText(/Boutique Persistante/i)).toBeInTheDocument();
      expect(screen.getByText(/Total des Dettes Clients/i)).toBeInTheDocument();
    });

    unmount();
  });

  it('allows intelligent login for Team Leaders and opens Mini-Admin dashboard directly', async () => {
    await db.shopProfiles.clear();
    useAppStore.setState({
      activeShopId: null,
      shopProfile: null,
      activeTeamLeader: null,
      isMiniAdminOpen: false,
      isLocked: false,
      isAdminOpen: false,
      isInitialized: false,
      activeTab: 'pos'
    });

    // 1. Créer un chef d'équipe dans adminService
    await adminService.saveTeamLeader({
      id: 'leader_bobo_test',
      fullName: 'Oumar Chef Bobo',
      phone: '75001122',
      pinCode: '4321',
      teamId: 'team_bobo',
      teamName: 'Équipe Bobo Ouest',
      zone: 'Bobo-Dioulasso',
      status: 'active'
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-continue'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-login')).toBeInTheDocument();
    });

    const phoneInput = screen.getByPlaceholderText(/70 12 34 56/i);
    const pinInput = screen.getByPlaceholderText(/• • • •/i);
    const loginBtn = screen.getByRole('button', { name: /SE CONNECTER/i });

    // Saisie des identifiants du chef d'équipe
    fireEvent.change(phoneInput, { target: { value: '75001122' } });
    fireEvent.change(pinInput, { target: { value: '4321' } });
    fireEvent.click(loginBtn);

    // Vérifie que le tableau de bord Mini-Admin Chef d'équipe s'ouvre directement
    await waitFor(() => {
      expect(screen.getAllByText(/Oumar Chef Bobo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Équipe Bobo Ouest/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Chef d'Équipe/i)).toBeInTheDocument();
      expect(screen.getByText(/\+ RECRUTER UN COMMERCIAL/i)).toBeInTheDocument();
    });
  });
});

