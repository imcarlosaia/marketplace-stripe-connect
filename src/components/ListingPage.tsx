'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { fetchListing, fetchSellerReady, photoUrl } from '@/lib/listings';
import { canCharge } from '@/lib/money';
import { isConfigured } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { BuyNow } from './BuyNow';
import { ListingDetails } from './ListingDetails';
import { MessageSeller } from './MessageSeller';
import { NotConfigured } from './NotConfigured';

const NOT_FOUND = "This listing doesn't exist or was removed.";
const LOAD_FAILED = "Couldn't load this listing. Try again.";

type State = { id: string; attempt: number; listing: Listing | null; ready: boolean; failed: boolean; now: Date };

// Seller readiness is a nice-to-have for the page: if it cannot be read, the
// listing still shows, just without Buy Now.
const readyOrNot = (email: string) => fetchSellerReady(email).catch(() => false);

function Purchase({ listing, ready, onSold }: { listing: Listing; ready: boolean; onSold: () => void }) {
  if (listing.sold_at) {
    return (
      <div role="status" className="rounded-xl bg-chip px-4 py-3">
        <p className="font-bold">Sold</p>
        <p className="text-sm text-ink-soft">Someone has bought this item.</p>
      </div>
    );
  }
  if (!canCharge(listing.price)) return null;
  if (!ready) {
    return (
      <p className="rounded-xl bg-chip px-4 py-3 text-sm text-ink-soft">
        The seller hasn&apos;t set up online payments yet. Message them below to arrange payment.
      </p>
    );
  }
  return <BuyNow listingId={listing.id} priceLabel={formatPrice(listing.price)} onSold={onSold} />;
}

function BackLink() {
  return (
    <Link href="/" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand">
      <ArrowLeft size={18} aria-hidden="true" />
      Back to listings
    </Link>
  );
}

export function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6">
      <div className="mb-4 h-6 w-36 rounded bg-surface" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-surface motion-reduce:animate-none" />
        <div className="h-96 rounded-2xl bg-surface" />
      </div>
    </div>
  );
}

export function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    let cancelled = false;
    fetchListing(id)
      .then(async (listing) => ({ listing, ready: listing ? await readyOrNot(listing.seller_email) : false }))
      .then(
        ({ listing, ready }) => {
          if (!cancelled) setState({ id, attempt, listing, ready, failed: false, now: new Date() });
        },
        () => {
          if (!cancelled) setState({ id, attempt, listing: null, ready: false, failed: true, now: new Date() });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6">
        <NotConfigured />
      </div>
    );
  }

  if (!state || state.id !== id || state.attempt !== attempt) return <ListingSkeleton />;

  if (state.failed || !state.listing) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6">
        <BackLink />
        <div role="alert" className="rounded-2xl bg-surface p-6">
          <p className={state.failed ? 'text-danger' : ''}>{state.failed ? LOAD_FAILED : NOT_FOUND}</p>
          {state.failed && (
            <button type="button" onClick={() => setAttempt((n) => n + 1)}
              className="mt-3 rounded-full border border-line px-4 py-1.5 font-semibold hover:bg-chip focus-visible:outline-2 focus-visible:outline-brand">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const listing = state.listing;
  const markSold = () => setState({ ...state, listing: { ...listing, sold_at: new Date().toISOString() } });
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6">
      <BackLink />
      <ListingDetails
        now={state.now}
        view={{
          title: listing.title,
          price: listing.price,
          category: listing.category,
          description: listing.description,
          sellerEmail: listing.seller_email,
          location: listing.location,
          createdAt: listing.created_at,
          photoSrc: photoUrl(listing.image_path),
          sold: Boolean(listing.sold_at),
        }}
      >
        <Purchase listing={listing} ready={state.ready} onSold={markSold} />
        <div className={listing.sold_at || canCharge(listing.price) ? 'mt-6' : ''}>
          <MessageSeller listingId={listing.id} />
        </div>
      </ListingDetails>
    </div>
  );
}
