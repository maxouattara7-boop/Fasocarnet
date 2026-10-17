import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sasPayService, DEFAULT_SASPAY_API_KEY } from './sasPayService';
import { ShopProfile } from '../../types';
import { SubscriptionPlan } from './subscriptionService';

describe('sasPayService', () => {
  const dummyShop: ShopProfile = {
    id: 'shop_test_saspay',
    name: 'Boutique Test Ouaga',
    ownerName: 'Oumar Traore',
    phone: '70223344',
    currency: 'FCFA',
    isConfigured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const dummyPlan: SubscriptionPlan = {
    id: 'monthly',
    name: '1 Mois (Mensuel)',
    durationMonths: 1,
    price: 2000
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('manages API key correctly with defaults and overrides', () => {
    expect(sasPayService.getApiKey()).toBe(DEFAULT_SASPAY_API_KEY);

    sasPayService.setApiKey('sk_test_custom_key_123456');
    expect(sasPayService.getApiKey()).toBe('sk_test_custom_key_123456');

    sasPayService.setApiKey('');
    expect(sasPayService.getApiKey()).toBe(DEFAULT_SASPAY_API_KEY);
  });

  it('creates checkout session with correct parameters and endpoints', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'session_mock_123',
        checkout_url: 'https://checkout.saspay.me/mock_slug',
        slug: 'mock_slug',
        amount: '2000.00',
        currency: 'XOF',
        status: 'PENDING'
      },
      code: 201
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await sasPayService.createCheckoutSession(dummyShop, dummyPlan);

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe('session_mock_123');
    expect(result.checkoutUrl).toBe('https://checkout.saspay.me/mock_slug');
    expect(result.amount).toBe(2000);
    expect(result.currency).toBe('XOF');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/saspay/checkout-sessions/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${DEFAULT_SASPAY_API_KEY}`,
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('checks checkout session status correctly when completed', async () => {
    const mockStatusResponse = {
      success: true,
      data: {
        id: 'session_mock_123',
        status: 'SUCCESS',
        transaction_id: 'tx_998877'
      },
      code: 200
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStatusResponse
    });

    const statusResult = await sasPayService.checkCheckoutStatus('session_mock_123');

    expect(statusResult.isPaid).toBe(true);
    expect(statusResult.status).toBe('SUCCESS');
    expect(statusResult.transactionId).toBe('tx_998877');
  });

  it('handles pending or failed status gracefully without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'session_mock_123',
          status: 'PENDING'
        }
      })
    });

    const statusResult = await sasPayService.checkCheckoutStatus('session_mock_123');
    expect(statusResult.isPaid).toBe(false);
    expect(statusResult.status).toBe('PENDING');
  });
});
