import type Stripe from 'stripe';
import { isAdminConfigured } from '@/lib/admin';
import { handleAccountUpdated, handleCheckoutCompleted } from '@/lib/fulfil';
import { isStripeConfigured, stripe } from '@/lib/stripe';

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

// Stripe Connect webhook. Every request's signature is checked against
// STRIPE_WEBHOOK_SECRET using the raw body. Events this app doesn't know
// (other apps share the sandbox) are acknowledged with 200 and ignored.
// A processing error returns 500 so Stripe retries the delivery later.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !isStripeConfigured() || !isAdminConfigured()) return json(503, { error: 'not_configured' });

  const signature = request.headers.get('stripe-signature');
  if (!signature) return json(400, { error: 'missing_signature' });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return json(400, { error: 'bad_signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const outcome = await handleCheckoutCompleted(event.data.object, event.account, new URL(request.url).origin);
      return json(200, { received: true, outcome });
    }
    if (event.type === 'account.updated') {
      const known = await handleAccountUpdated(event.data.object);
      return json(200, { received: true, outcome: known ? 'synced' : 'ignore' });
    }
    return json(200, { received: true, outcome: 'ignore' });
  } catch (error) {
    console.error(`Webhook ${event.type} failed`, error instanceof Error ? error.message : error);
    return json(500, { error: 'failed' });
  }
}
