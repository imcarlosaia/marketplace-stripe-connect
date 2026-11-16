import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handleCheckoutCompleted = vi.fn(async () => 'ignore');
const handleAccountUpdated = vi.fn(async () => false);
vi.mock('@/lib/fulfil', () => ({ handleCheckoutCompleted, handleAccountUpdated }));

const SECRET = 'whsec_test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_dummy';

const { POST } = await import('./route');
const signer = new Stripe('sk_test_dummy');

function event(type: string, object: Record<string, unknown>, account?: string) {
  return JSON.stringify({ id: 'evt_test', object: 'event', type, account, data: { object } });
}

function deliver(payload: string, signature?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  headers['stripe-signature'] = signature ?? signer.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return POST(new Request('https://shop.example.com/api/stripe/webhook', { method: 'POST', headers, body: payload }));
}

describe('Stripe webhook', () => {
  beforeEach(() => {
    handleCheckoutCompleted.mockClear();
    handleAccountUpdated.mockClear();
  });

  it('rejects a request with a bad signature', async () => {
    const response = await deliver(event('checkout.session.completed', { id: 'cs_test_1' }), 't=1,v1=bad');
    expect(response.status).toBe(400);
    expect(handleCheckoutCompleted).not.toHaveBeenCalled();
  });

  it('rejects a body that was changed after signing', async () => {
    const payload = event('checkout.session.completed', { id: 'cs_test_1' });
    const signature = signer.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const response = await deliver(payload.replace('cs_test_1', 'cs_test_2'), signature);
    expect(response.status).toBe(400);
  });

  it('hands a completed checkout to fulfilment with the connected account and site origin', async () => {
    const response = await deliver(event('checkout.session.completed', { id: 'cs_test_1', payment_status: 'paid' }, 'acct_123'));
    expect(response.status).toBe(200);
    expect(handleCheckoutCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cs_test_1' }),
      'acct_123',
      'https://shop.example.com',
    );
  });

  it('syncs account updates', async () => {
    const response = await deliver(event('account.updated', { id: 'acct_123', charges_enabled: true }, 'acct_123'));
    expect(response.status).toBe(200);
    expect(handleAccountUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'acct_123' }));
  });

  it('acknowledges events it does not handle', async () => {
    const response = await deliver(event('payment_intent.created', { id: 'pi_1' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: 'ignore' });
  });

  it('asks Stripe to retry when processing fails', async () => {
    handleCheckoutCompleted.mockRejectedValueOnce(new Error('database down'));
    const response = await deliver(event('checkout.session.completed', { id: 'cs_test_1' }, 'acct_123'));
    expect(response.status).toBe(500);
  });
});
