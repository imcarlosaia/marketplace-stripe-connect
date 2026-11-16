import { admin, isAdminConfigured } from '@/lib/admin';
import { photoUrl } from '@/lib/listings';
import { canCharge, platformFeeCents, toCents } from '@/lib/money';
import { findSellerByEmail } from '@/lib/sellers';
import { isStripeConfigured, stripe } from '@/lib/stripe';
import { isUuid } from '@/lib/validation';

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });
const CHECKOUT_MINUTES = 31; // Stripe needs at least 30

// Opens Stripe Checkout for one listing as a direct charge on the seller's
// connected account, keeping the platform fee. Everything is re-checked here;
// the button on the page is only a convenience.
export async function POST(request: Request) {
  if (!isStripeConfigured() || !isAdminConfigured()) return json(503, { error: 'not_configured' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid' });
  }
  const listingId = (body as { listingId?: unknown } | null)?.listingId;
  if (typeof listingId !== 'string' || !isUuid(listingId)) return json(400, { error: 'invalid' });

  try {
    const { data: listing, error } = await admin()
      .from('listings')
      .select('id, title, price, seller_email, image_path, sold_at')
      .eq('id', listingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) return json(404, { error: 'not_found' });
    if (listing.sold_at) return json(409, { error: 'sold' });
    const price = Number(listing.price);
    if (!canCharge(price)) return json(400, { error: 'not_for_sale' });

    const seller = await findSellerByEmail(listing.seller_email);
    if (!seller?.charges_enabled) return json(409, { error: 'seller_not_ready' });

    const amount = toCents(price);
    const fee = platformFeeCents(amount);
    const { data: order, error: orderError } = await admin()
      .from('orders')
      .insert({ listing_id: listing.id, stripe_account_id: seller.stripe_account_id, amount_cents: amount, fee_cents: fee, currency: 'usd' })
      .select('id')
      .single();
    if (orderError) throw new Error(orderError.message);

    const origin = new URL(request.url).origin;
    const metadata = { listing_id: listing.id, order_id: order.id };
    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: { name: listing.title, images: [photoUrl(listing.image_path)] },
          },
        }],
        payment_intent_data: { application_fee_amount: fee, metadata },
        metadata,
        client_reference_id: order.id,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
        success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}&account=${seller.stripe_account_id}`,
        cancel_url: `${origin}/item/${listing.id}`,
      },
      { stripeAccount: seller.stripe_account_id, idempotencyKey: `checkout-${order.id}` },
    );

    const { error: saveError } = await admin().from('orders').update({ checkout_session_id: session.id }).eq('id', order.id);
    if (saveError) throw new Error(saveError.message);
    if (!session.url) throw new Error('checkout_without_url');
    return json(200, { url: session.url });
  } catch (error) {
    console.error('Opening checkout failed', error instanceof Error ? error.message : error);
    return json(502, { error: 'failed' });
  }
}
