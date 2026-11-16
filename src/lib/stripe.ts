import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// The platform's Stripe client (sandbox keys only). Server code only: the
// secret key never reaches the browser.
export function stripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('stripe_not_configured');
    cached = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: 'Marketplace' } });
  }
  return cached;
}
