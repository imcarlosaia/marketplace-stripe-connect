import 'server-only';
import type Stripe from 'stripe';
import { admin } from './admin';
import { sendEmail } from './brevo';
import { buildSoldEmail } from './email';
import { sellerShareCents } from './money';
import { decideCheckout, type CheckoutDecision, type OrderStatus } from './orders';
import { findSellerByAccount, syncSeller } from './sellers';
import { stripe } from './stripe';

interface OrderRow {
  id: string;
  listing_id: string;
  stripe_account_id: string;
  amount_cents: number;
  fee_cents: number;
  status: OrderStatus;
}

const UNIQUE_VIOLATION = '23505';

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === 'string' ? intent : intent.id;
}

async function refund(order: OrderRow, session: Stripe.Checkout.Session): Promise<void> {
  const intent = paymentIntentId(session);
  if (intent) {
    await stripe().refunds.create(
      { payment_intent: intent, refund_application_fee: true, reason: 'duplicate' },
      { stripeAccount: order.stripe_account_id, idempotencyKey: `refund-${order.id}` },
    );
  }
  const { error } = await admin()
    .from('orders')
    .update({ status: 'refunded', buyer_email: session.customer_details?.email ?? null, payment_intent_id: intent })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
}

// Marks the order paid and the listing sold. Returns false when another
// delivery of the same event got there first, or when the listing turned out
// to be sold already (the unique index allows one paid order per listing).
async function markPaid(order: OrderRow, session: Stripe.Checkout.Session): Promise<'paid' | 'raced' | 'duplicate'> {
  const { data, error } = await admin()
    .from('orders')
    .update({
      status: 'paid',
      buyer_email: session.customer_details?.email ?? null,
      payment_intent_id: paymentIntentId(session),
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('id');
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return 'duplicate';
    throw new Error(error.message);
  }
  if (!data || data.length === 0) return 'raced';

  const { error: soldError } = await admin()
    .from('listings')
    .update({ sold_at: new Date().toISOString() })
    .eq('id', order.listing_id)
    .is('sold_at', null);
  if (soldError) throw new Error(soldError.message);
  return 'paid';
}

async function emailSeller(order: OrderRow, session: Stripe.Checkout.Session, origin: string): Promise<void> {
  const { data: listing } = await admin().from('listings').select('title, seller_email').eq('id', order.listing_id).maybeSingle();
  if (!listing) return;
  const buyerEmail = session.customer_details?.email ?? null;
  await sendEmail(
    listing.seller_email,
    buyerEmail,
    buildSoldEmail({
      title: listing.title,
      amountCents: order.amount_cents,
      sellerShareCents: sellerShareCents(order.amount_cents),
      feeCents: order.fee_cents,
      url: `${origin}/item/${order.listing_id}`,
      buyerEmail,
    }),
  );
}

// checkout.session.completed from a connected account. Sessions this app did
// not create (the sandbox is shared with other apps) are ignored.
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  account: string | undefined,
  origin: string,
): Promise<CheckoutDecision> {
  if (!account) return 'ignore';
  const { data: order, error } = await admin()
    .from('orders')
    .select('id, listing_id, stripe_account_id, amount_cents, fee_cents, status')
    .eq('checkout_session_id', session.id)
    .eq('stripe_account_id', account)
    .maybeSingle<OrderRow>();
  if (error) throw new Error(error.message);

  let soldByOtherOrder = false;
  if (order) {
    const { data: others, error: othersError } = await admin()
      .from('orders')
      .select('id')
      .eq('listing_id', order.listing_id)
      .eq('status', 'paid')
      .neq('id', order.id)
      .limit(1);
    if (othersError) throw new Error(othersError.message);
    soldByOtherOrder = (others ?? []).length > 0;
  }

  const decision = decideCheckout({ order, paymentStatus: session.payment_status, soldByOtherOrder });
  if (!order) return decision;

  if (decision === 'refund') {
    await refund(order, session);
  } else if (decision === 'mark_paid') {
    const result = await markPaid(order, session);
    if (result === 'duplicate') {
      await refund(order, session);
      return 'refund';
    }
    if (result === 'paid') await emailSeller(order, session, origin);
  }
  return decision;
}

// account.updated: keep "can take payments" in step for sellers we know.
export async function handleAccountUpdated(account: Stripe.Account): Promise<boolean> {
  const seller = await findSellerByAccount(account.id);
  if (!seller) return false;
  await syncSeller(account);
  return true;
}
