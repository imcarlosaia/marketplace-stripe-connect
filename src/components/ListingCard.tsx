import Link from 'next/link';
import { formatPrice, isNew, relativeTime } from '@/lib/format';
import { photoUrl } from '@/lib/listings';
import type { Listing } from '@/lib/types';

export function ListingCard({ listing, now }: { listing: Listing; now: Date }) {
  const sold = Boolean(listing.sold_at);
  const meta = [listing.location, relativeTime(listing.created_at, now)].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/item/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-[#ECEEF1] bg-surface transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(0_0_0/0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[4/3] bg-chip">
        {/* eslint-disable-next-line @next/next/no-img-element -- visitor uploads served straight from storage */}
        <img
          src={photoUrl(listing.image_path)}
          alt={`Photo of ${listing.title}`}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover ${sold ? 'opacity-60 grayscale-[40%]' : ''}`}
        />
        {sold ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-white">
            Sold
          </span>
        ) : isNew(listing.created_at, now) && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-badge px-2.5 py-0.5 text-xs font-semibold text-badge-ink">
            New
          </span>
        )}
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <span className={`inline-block rounded-full border px-3 py-px text-sm font-bold ${sold ? 'border-line text-ink-soft line-through' : 'border-brand-line text-brand-ink'}`}>
          {formatPrice(listing.price)}
        </span>
        <h2 className="mt-2 truncate font-semibold">{listing.title}</h2>
        <p className="truncate text-sm text-ink-soft">{meta}</p>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-[#ECEEF1] bg-surface">
      <div className="aspect-[4/3] animate-pulse bg-chip motion-reduce:animate-none" />
      <div className="space-y-2 p-3.5">
        <div className="h-5 w-16 rounded-full bg-chip" />
        <div className="h-4 w-4/5 rounded bg-chip" />
        <div className="h-3 w-1/2 rounded bg-chip" />
      </div>
    </div>
  );
}
