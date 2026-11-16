import { CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { admin, isAdminConfigured } from '@/lib/admin';
import { photoUrl } from '@/lib/listings';
import { PLATFORM_FEE_PERCENT, formatCents, sellerShareCents } from '@/lib/money';
import { isStripeConfigured, stripe } from '@/lib/stripe';

export const metadata: Metadata = { title: 'Order confirmed · Marketplace' };

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
const ACCOUNT_ID = /^acct_[A-Za-z0-9]+$/;
const BUTTON = 'inline-flex h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

type Params = Promise<Record<string, string | string[] | undefined>>;

interface Confirmed {
  orderId: string;
  listingId: string;
  title: string;
  imagePath: string;
  amountCents: number;
  feeCents: number;
  buyerEmail: string | null;
}

// Reads the result straight from Stripe, so the page is right even if the
// webhook that records the order arrives a moment later.
async function confirmedOrder(sessionId: string, accountId: string): Promise<Confirmed | null> {
  if (!SESSION_ID.test(sessionId) || !ACCOUNT_ID.test(accountId) || !isStripeConfigured() || !isAdminConfigured()) return null;
  const { data: order } = await admin()
    .from('orders')
    .select('id, listing_id, amount_cents, fee_cents, listings(title, image_path)')
    .eq('checkout_session_id', sessionId)
    .eq('stripe_account_id', accountId)
    .maybeSingle();
  if (!order) return null;
  const session = await stripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: accountId });
  if (session.payment_status !== 'paid') return null;
  const listing = (Array.isArray(order.listings) ? order.listings[0] : order.listings) as { title: string; image_path: string } | null;
  return {
    orderId: order.id,
    listingId: order.listing_id,
    title: listing?.title ?? 'Your item',
    imagePath: listing?.image_path ?? '',
    amountCents: order.amount_cents,
    feeCents: order.fee_cents,
    buyerEmail: session.customer_details?.email ?? null,
  };
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={strong ? 'font-bold' : ''}>{value}</dd>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: Params }) {
  await connection(); // always runs per request, never during prerendering
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : '';
  const accountId = typeof params.account === 'string' ? params.account : '';
  let order: Confirmed | null = null;
  try {
    order = await confirmedOrder(sessionId, accountId);
  } catch (error) {
    console.error('Loading the order failed', error instanceof Error ? error.message : error);
  }

  if (!order) {
    return (
      <div role="status" className="rounded-2xl bg-surface p-6">
        <h1 className="text-2xl font-bold">We couldn&apos;t confirm this payment</h1>
        <p className="mt-2 text-ink-soft">If you paid, the seller will still receive your order. Otherwise, go back to the listing and try again.</p>
        <Link href="/" className={`${BUTTON} mt-4`}>Back to listings</Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface p-6">
      <CheckCircle2 size={44} className="text-success-ink" aria-hidden="true" />
      <h1 className="mt-3 text-2xl font-bold">Payment successful</h1>
      <p className="mt-1 text-ink-soft">
        Thanks for your order. Your payment went to the seller through Stripe, and the item is now marked as sold.
      </p>

      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-line p-3">
        {order.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element -- photo served straight from storage
          <img src={photoUrl(order.imagePath)} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{order.title}</p>
          <p className="text-sm text-ink-soft">Order {order.orderId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line">
        <Row label="You paid" value={formatCents(order.amountCents)} strong />
        <Row label="Seller receives" value={formatCents(sellerShareCents(order.amountCents))} />
        <Row label={`Marketplace fee (${PLATFORM_FEE_PERCENT}%)`} value={formatCents(order.feeCents)} />
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/item/${order.listingId}`} className="inline-flex h-11 items-center rounded-xl border border-line px-5 font-semibold hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          View the listing
        </Link>
        <Link href="/" className={BUTTON}>Keep shopping</Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-8 sm:px-6">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
