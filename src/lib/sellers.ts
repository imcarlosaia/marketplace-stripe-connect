import 'server-only';
import type Stripe from 'stripe';
import { admin } from './admin';
import { stripe } from './stripe';

export interface SellerRow {
  email: string;
  stripe_account_id: string;
  charges_enabled: boolean;
}

export async function findSellerByEmail(email: string): Promise<SellerRow | null> {
  const { data, error } = await admin()
    .from('sellers')
    .select('email, stripe_account_id, charges_enabled')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function findSellerByAccount(accountId: string): Promise<SellerRow | null> {
  const { data, error } = await admin()
    .from('sellers')
    .select('email, stripe_account_id, charges_enabled')
    .eq('stripe_account_id', accountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

let platformCountry: string | null = null;

// Sellers are created in the platform's own country (the sandbox is in
// Estonia); the account owner confirms the rest during onboarding.
async function sellerCountry(): Promise<string> {
  if (!platformCountry) platformCountry = (await stripe().accounts.retrieveCurrent()).country ?? 'US';
  return platformCountry;
}

// Creates the seller's connected account and saves it. Stripe-hosted
// onboarding collects the details; Stripe carries the risk of losses (the
// sandbox requires this) and the platform pays Stripe's processing fee, so
// the seller receives exactly the price minus the platform fee.
// If two requests race for the same email, the first saved account wins and
// is returned; the other account is simply never used.
export async function createSeller(email: string, siteUrl: string): Promise<SellerRow> {
  const account = await stripe().accounts.create({
    country: await sellerCountry(),
    email,
    controller: {
      fees: { payer: 'application' },
      losses: { payments: 'stripe' },
      requirement_collection: 'stripe',
      stripe_dashboard: { type: 'none' },
    },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: {
      name: 'Marketplace', // shown at the top of Stripe Checkout
      product_description: 'Sells second-hand items on the Marketplace',
      ...(siteUrl.startsWith('https://') ? { url: siteUrl } : {}),
    },
    metadata: { marketplace_email: email },
  });

  const { error } = await admin()
    .from('sellers')
    .insert({ email, stripe_account_id: account.id, charges_enabled: account.charges_enabled ?? false });
  if (error && error.code !== '23505') throw new Error(error.message);
  const saved = await findSellerByEmail(email);
  if (!saved) throw new Error('seller_not_saved');
  return saved;
}

export async function onboardingLink(accountId: string, origin: string): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    collection_options: { fields: 'currently_due' },
    refresh_url: `${origin}/api/stripe/connect/refresh?account=${accountId}`,
    return_url: `${origin}/connect/return?account=${accountId}`,
  });
  return link.url;
}

// Copies the account's "can take payments" state into Supabase.
export async function syncSeller(account: Stripe.Account): Promise<boolean> {
  const ready = Boolean(account.charges_enabled);
  const { error } = await admin()
    .from('sellers')
    .update({ charges_enabled: ready, updated_at: new Date().toISOString() })
    .eq('stripe_account_id', account.id);
  if (error) throw new Error(error.message);
  return ready;
}
