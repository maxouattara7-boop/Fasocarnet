import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosView } from './PosView';
import { db } from '../../db/db';

vi.mock('../../db/services/salesService', () => ({
  salesService: {
    recordSale: vi.fn().mockResolvedValue({ id: 'sale_1', totalAmount: 1000, isCredit: false })
  }
}));

let mockProducts = [
  {
    id: 'prod_1',
    name: 'Pain Sucré',
    price: 250,
    costPrice: 200,
    stockQuantity: 10,
    shopId: 'shop_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

vi.mock('../../db/services/productsService', () => ({
  productsService: {
    getAll: () => Promise.resolve([...mockProducts]),
    create: () => Promise.resolve()
  }
}));

vi.mock('../../utils/haptics', () => ({
  triggerHaptic: vi.fn(),
  triggerDoubleHaptic: vi.fn()
}));

vi.mock('../../utils/soundEffects', () => ({
  soundEffects: {
    notifySaleSuccess: vi.fn()
  }
}));

describe('PosView component', () => {
  beforeEach(async () => {
    mockProducts = [
      {
        id: 'prod_1',
        name: 'Pain Sucré',
        price: 250,
        costPrice: 200,
        stockQuantity: 10,
        shopId: 'shop_1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    await db.products.clear();
    await db.products.add(mockProducts[0]);
  });

  it('renders without crashing and displays products', async () => {
    render(<PosView />);
    await waitFor(() => {
      expect(screen.getAllByText('Pain Sucré').length).toBeGreaterThan(0);
    });
  });

  it('opens quantity modal when product is clicked', async () => {
    render(<PosView />);
    await waitFor(() => {
      expect(screen.getAllByText('Pain Sucré').length).toBeGreaterThan(0);
    });

    const productBtn = screen.getAllByText('Pain Sucré')[0].closest('button');
    expect(productBtn).not.toBeNull();
    fireEvent.click(productBtn!);

    await waitFor(() => {
      expect(screen.getByText("Quantité d'article")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByText("Valider l'ajout").closest('button');
    expect(confirmBtn).not.toBeNull();
    fireEvent.click(confirmBtn!);

    await waitFor(() => {
      expect(screen.queryByText("Quantité d'article")).not.toBeInTheDocument();
      expect(screen.getByTitle('Retirer cet article')).toBeInTheDocument();
    });
  });

  it('opens discount modal when remise button is clicked and applies discount', async () => {
    render(<PosView />);
    const remiseBtn = screen.getByText('Remise Client').closest('button');
    expect(remiseBtn).not.toBeNull();
    fireEvent.click(remiseBtn!);

    await waitFor(() => {
      expect(screen.getByText('Appliquer une Remise')).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole('button', { name: /Appliquer/i });
    expect(applyBtn).not.toBeNull();
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByText('Appliquer une Remise')).not.toBeInTheDocument();
    });
  });

  it('toggles calculator visibility when calculatrice button is clicked', async () => {
    render(<PosView />);
    // Calculator keypad is hidden by default
    expect(screen.getByText('Panier en attente')).toBeInTheDocument();

    const calcBtn = screen.getByRole('button', { name: /Calculatrice/i });
    expect(calcBtn).toBeInTheDocument();

    // Click to unfold
    fireEvent.click(calcBtn);
    expect(screen.queryByText('Panier en attente')).not.toBeInTheDocument();

    // Click again to fold
    fireEvent.click(calcBtn);
    expect(screen.getByText('Panier en attente')).toBeInTheDocument();
  });

  it('allows holding a sale and resuming it later from held sales modal', async () => {
    localStorage.clear();
    render(<PosView />);
    await waitFor(() => {
      expect(screen.getAllByText('Pain Sucré').length).toBeGreaterThan(0);
    });

    // Add Pain Sucré to cart
    const productBtn = screen.getAllByText('Pain Sucré')[0].closest('button');
    fireEvent.click(productBtn!);

    await waitFor(() => {
      expect(screen.getByText("Quantité d'article")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Valider l'ajout").closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/ENCAISSER/)).toBeInTheDocument();
    });

    // Click "En attente" to hold this current cart
    const holdBtn = screen.getByRole('button', { name: /En attente/i });
    fireEvent.click(holdBtn);

    // Current cart should now be cleared
    await waitFor(() => {
      expect(screen.getByText('Panier en attente')).toBeInTheDocument();
      expect(screen.getByText('1 en attente')).toBeInTheDocument();
    });

    // Click badge to view held sales modal
    fireEvent.click(screen.getByText('1 en attente'));
    await waitFor(() => {
      expect(screen.getByText('Ventes en Attente (1)')).toBeInTheDocument();
      expect(screen.getByText('Reprendre cette vente')).toBeInTheDocument();
    });

    // Click restore
    fireEvent.click(screen.getByText('Reprendre cette vente'));
    await waitFor(() => {
      expect(screen.queryByText('Ventes en Attente (1)')).not.toBeInTheDocument();
      expect(screen.getByTitle('Retirer cet article')).toBeInTheDocument();
    });
  }, 15000);

  it('detects exhausted stock when resuming a held sale and blocks checkout', async () => {
    localStorage.clear();
    render(<PosView />);
    await waitFor(() => {
      expect(screen.getAllByText('Pain Sucré').length).toBeGreaterThan(0);
    });

    // Add Pain Sucré to cart
    const productBtn = screen.getAllByText('Pain Sucré')[0].closest('button');
    fireEvent.click(productBtn!);

    await waitFor(() => {
      expect(screen.getByText("Quantité d'article")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Valider l'ajout").closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/ENCAISSER/)).toBeInTheDocument();
    });

    // Hold the sale
    fireEvent.click(screen.getByRole('button', { name: /En attente/i }));
    await waitFor(() => {
      expect(screen.getByText('1 en attente')).toBeInTheDocument();
    });

    // Simulate another customer buying out the stock (stock drops to 0)
    mockProducts[0].stockQuantity = 0;
    await db.products.update('prod_1', { stockQuantity: 0 });

    // Open held sales modal
    fireEvent.click(screen.getByText('1 en attente'));
    await waitFor(() => {
      expect(screen.getByText('Ventes en Attente (1)')).toBeInTheDocument();
      expect(screen.getByText(/Alerte stock/)).toBeInTheDocument();
      expect(screen.getByText(/Stock épuisé pour/)).toBeInTheDocument();
    });

    // Click resume
    const restoreBtn = screen.getByRole('button', { name: /Reprendre/i });
    fireEvent.click(restoreBtn);

    // Stock alert modal must pop up
    await waitFor(() => {
      expect(screen.getByText('Stock Épuisé Pendant la Mise en Attente')).toBeInTheDocument();
      expect(screen.getByText('Épuisé (0 en stock)')).toBeInTheDocument();
    });

    // Choose to load into cart anyway
    fireEvent.click(screen.getByText('Charger quand même dans le panier (décaissement bloqué)'));

    // Cart shows the blocked ENCAISSER button
    await waitFor(() => {
      expect(screen.getByText(/STOCK ÉPUISÉ — DÉCAISSEMENT BLOQUÉ/)).toBeInTheDocument();
    });

    // Clicking ENCAISSER is blocked
    fireEvent.click(screen.getByText(/STOCK ÉPUISÉ — DÉCAISSEMENT BLOQUÉ/));
    expect(screen.queryByText('Mode de Règlement')).not.toBeInTheDocument();
  }, 15000);
});
