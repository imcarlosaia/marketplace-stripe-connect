'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { categoryBySlug } from '@/lib/categories';
import { filtersToQuery, parseFilters } from '@/lib/filters';
import { LISTING_LIMIT, fetchListings } from '@/lib/listings';
import { isConfigured } from '@/lib/supabase';
import type { Filters, Listing } from '@/lib/types';
import { CardSkeleton, ListingCard } from './ListingCard';
import { NotConfigured } from './NotConfigured';
import { CompactFilters, Sidebar } from './Sidebar';

const LOAD_FAILED = "Couldn't load listings. Try again.";
const NO_MATCH = 'No listings match. Try another category or clear the search.';
const EMPTY = 'Nothing for sale yet. Be the first to list something.';

interface Result {
  key: string;
  listings: Listing[] | null;
  now: Date;
}

function heading(filters: Filters): string {
  if (filters.q) return `Results for "${filters.q}"`;
  return categoryBySlug(filters.category)?.name ?? "Today's picks";
}

export function HomeView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const filters = useMemo(() => parseFilters(new URLSearchParams(query)), [query]);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${filtersToQuery(filters)}#${attempt}`;

  useEffect(() => {
    if (!isConfigured) return;
    let cancelled = false;
    fetchListings(filters).then(
      (listings) => {
        if (!cancelled) setResult({ key, listings, now: new Date() });
      },
      () => {
        if (!cancelled) setResult({ key, listings: null, now: new Date() });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [filters, key]);

  const update = (next: Filters) => router.replace(`${pathname}${filtersToQuery(next)}`, { scroll: false });

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <NotConfigured />
      </div>
    );
  }

  const loading = result === null || result.key !== key;
  const listings = loading ? null : result.listings;
  const failed = !loading && listings === null;
  const filtered = Boolean(filters.category || filters.q || filters.min !== null || filters.max !== null);
  const count = loading || failed ? '' : `${listings!.length}${listings!.length === LISTING_LIMIT ? '+' : ''} ${listings!.length === 1 ? 'listing' : 'listings'}`;

  return (
    <div className="mx-auto grid max-w-[1240px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <Sidebar filters={filters} onChange={update} count={count} />
      <section aria-labelledby="results-heading" className="min-w-0">
        <CompactFilters filters={filters} onChange={update} />
        <div className="mb-4 mt-4 flex items-baseline justify-between gap-3 lg:mt-0">
          <h1 id="results-heading" className="min-w-0 truncate text-2xl font-bold">{heading(filters)}</h1>
          <p className="shrink-0 text-sm text-ink-soft lg:hidden" aria-live="polite">{count}</p>
        </div>

        {failed && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4 text-danger">
            <p>{LOAD_FAILED}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)}
              className="rounded-full border border-line px-4 py-1.5 font-semibold text-ink hover:bg-chip focus-visible:outline-2 focus-visible:outline-brand">
              Retry
            </button>
          </div>
        )}

        {!loading && listings && listings.length === 0 && (
          <p className="rounded-2xl bg-surface px-4 py-12 text-center text-ink-soft">{filtered ? NO_MATCH : EMPTY}</p>
        )}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4" aria-busy={loading}>
          {loading
            ? Array.from({ length: 8 }, (_, i) => <li key={i}><CardSkeleton /></li>)
            : listings?.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} now={result.now} />
                </li>
              ))}
        </ul>
      </section>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1240px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <div className="hidden h-96 rounded-2xl bg-surface lg:block" />
      <ul className="grid grid-cols-2 gap-3 self-start sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
        {Array.from({ length: 8 }, (_, i) => <li key={i}><CardSkeleton /></li>)}
      </ul>
    </div>
  );
}
