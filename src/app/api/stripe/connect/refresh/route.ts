import { isAdminConfigured } from '@/lib/admin';
import { findSellerByAccount, onboardingLink } from '@/lib/sellers';
import { isStripeConfigured } from '@/lib/stripe';

const ACCOUNT_ID = /^acct_[A-Za-z0-9]+$/;

// Stripe sends the seller here when an onboarding link has expired or was
// already used. Make a fresh link for the same account and go straight back.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get('account') ?? '';
  const back = new URL('/connect', url.origin);

  if (!isStripeConfigured() || !isAdminConfigured() || !ACCOUNT_ID.test(account)) {
    return Response.redirect(back, 303);
  }
  try {
    const seller = await findSellerByAccount(account);
    if (!seller) return Response.redirect(back, 303);
    return Response.redirect(await onboardingLink(account, url.origin), 303);
  } catch (error) {
    console.error('Refreshing the onboarding link failed', error instanceof Error ? error.message : error);
    return Response.redirect(back, 303);
  }
}
