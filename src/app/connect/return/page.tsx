import { CheckCircle2, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { isAdminConfigured } from '@/lib/admin';
import { findSellerByAccount, syncSeller } from '@/lib/sellers';
import { isStripeConfigured, stripe } from '@/lib/stripe';

export const metadata: Metadata = { title: 'Stripe onboarding · Marketplace' };

const ACCOUNT_ID = /^acct_[A-Za-z0-9]+$/;
type Outcome = 'ready' | 'checking' | 'unfinished' | 'unknown';

const BUTTON = 'mt-4 inline-flex h-11 items-center rounded-xl px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

async function outcomeFor(accountId: string): Promise<{ outcome: Outcome; email?: string }> {
  if (!ACCOUNT_ID.test(accountId) || !isStripeConfigured() || !isAdminConfigured()) return { outcome: 'unknown' };
  const seller = await findSellerByAccount(accountId);
  if (!seller) return { outcome: 'unknown' };
  const account = await stripe().accounts.retrieve(accountId);
  const ready = await syncSeller(account);
  if (ready) return { outcome: 'ready', email: seller.email };
  return { outcome: account.details_submitted ? 'checking' : 'unfinished', email: seller.email };
}

async function Result({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection(); // always runs per request, never during prerendering
  const raw = (await searchParams).account;
  const accountId = typeof raw === 'string' ? raw : '';
  let result: { outcome: Outcome; email?: string };
  try {
    result = await outcomeFor(accountId);
  } catch (error) {
    console.error('Checking the Stripe account failed', error instanceof Error ? error.message : error);
    result = { outcome: 'unknown' };
  }

  if (result.outcome === 'ready') {
    return (
      <div role="status" className="rounded-2xl bg-surface p-6">
        <CheckCircle2 size={40} className="text-success-ink" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold">You&apos;re connected</h1>
        <p className="mt-2 text-ink-soft">
          {result.email} can now take payments. Every listing with this email shows a Buy Now button, and buyers&apos;
          payments go to your Stripe account.
        </p>
        <Link href="/" className={`${BUTTON} bg-brand text-white hover:brightness-110`}>See the listings</Link>
      </div>
    );
  }

  if (result.outcome === 'checking' || result.outcome === 'unfinished') {
    const checking = result.outcome === 'checking';
    return (
      <div role="status" className="rounded-2xl bg-surface p-6">
        <Clock size={40} className="text-brand" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold">{checking ? 'Stripe is checking your details' : "Onboarding isn't finished"}</h1>
        <p className="mt-2 text-ink-soft">
          {checking
            ? 'Your details are in. Buy Now appears on your listings as soon as Stripe enables payments, usually within a minute. Reload this page to check.'
            : 'Stripe still needs a few details before buyers can pay you. You can pick up where you left off.'}
        </p>
        <a href={`/api/stripe/connect/refresh?account=${accountId}`} className={`${BUTTON} bg-[#635BFF] text-white hover:brightness-110`}>
          {checking ? 'Review in Stripe' : 'Continue onboarding'}
        </a>
      </div>
    );
  }

  return (
    <div role="status" className="rounded-2xl bg-surface p-6">
      <h1 className="text-2xl font-bold">We couldn&apos;t find that Stripe account</h1>
      <p className="mt-2 text-ink-soft">Start again from the Get paid page.</p>
      <Link href="/connect" className={`${BUTTON} bg-brand text-white hover:brightness-110`}>Get paid with Stripe</Link>
    </div>
  );
}

export default function ConnectReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main className="mx-auto max-w-[620px] px-4 py-8 sm:px-6">
      <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
