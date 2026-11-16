import { admin, isAdminConfigured } from '@/lib/admin';
import { createSeller, findSellerByEmail, onboardingLink } from '@/lib/sellers';
import { isStripeConfigured } from '@/lib/stripe';
import { isEmail } from '@/lib/validation';

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

// Starts (or resumes) Stripe onboarding for the seller with this email.
// Responds with { url } to send the seller to Stripe, or { ready: true } when
// the email is already connected and can take payments.
export async function POST(request: Request) {
  if (!isStripeConfigured() || !isAdminConfigured()) return json(503, { error: 'not_configured' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid' });
  }
  const raw = (body as { email?: unknown } | null)?.email;
  if (typeof raw !== 'string' || !isEmail(raw.trim())) return json(400, { error: 'invalid_email' });
  const email = raw.trim().toLowerCase();

  try {
    const existing = await findSellerByEmail(email);
    if (existing?.charges_enabled) return json(200, { ready: true });

    const { error: limited } = await admin().rpc('note_connect_attempt', { p_email: email });
    if (limited) {
      if (limited.message.includes('too_many_attempts')) return json(429, { error: 'too_many' });
      throw new Error(limited.message);
    }

    const origin = new URL(request.url).origin;
    const seller = existing ?? (await createSeller(email, origin));
    const url = await onboardingLink(seller.stripe_account_id, origin);
    return json(200, { url });
  } catch (error) {
    console.error('Connect with Stripe failed', error instanceof Error ? error.message : error);
    return json(502, { error: 'failed' });
  }
}
