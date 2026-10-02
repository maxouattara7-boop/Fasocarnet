import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosView } from './PosView';
import { db } from '../../db/db';

vi.mock('../../db/services/salesService', () => ({
  salesService: {
    recordSale: vi.fn().mockResolvedValue({ id: 'sale_1', totalAmount: 1000, isCredit: false })
  }
}));

vi.mock('../../db/services/productsService', () => ({
  productsService: {
    getAll: () => Promise.resolve([
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
    ]),
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
    await db.products.clear();
    await db.products.add({
      id: 'prod_1',
      name: 'Pain Sucré',
      price: 250,
      costPrice: 200,
      stockQuantity: 10,
      shopId: 'shop_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
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
});
