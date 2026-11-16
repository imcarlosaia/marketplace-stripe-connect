import Link from 'next/link';
import type { ReactNode } from 'react';
import { categoryByName } from '@/lib/categories';
import { formatPrice, relativeTime } from '@/lib/format';

export interface ListingView {
  title: string;
  price: number | null;
  category: string;
  description: string;
  sellerEmail: string;
  location: string | null;
  createdAt: string | null;
  photoSrc: string | null;
  sold?: boolean;
}

// The photo-and-details layout shared by the listing page and the create
// form's live preview. `children` is the Message seller form on the real page.
export function ListingDetails({ view, now, preview = false, children }: { view: ListingView; now: Date; preview?: boolean; children?: ReactNode }) {
  const category = categoryByName(view.category);
  const listed = view.createdAt ? relativeTime(view.createdAt, now) : 'just now';
  return (
    <div className={preview ? 'grid gap-4' : 'grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'}>
      {/* The whole photo is shown, letterboxed on a soft background, so tall
          photos are never cropped on the listing page. */}
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-[#E9EBEF]">
        {view.photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- visitor uploads and local previews
          <img src={view.photoSrc} alt={`Photo of ${view.title || 'the item'}`} className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <p className="text-sm text-ink-soft">Your photo appears here</p>
        )}
      </div>
      <div className="rounded-2xl bg-surface p-5">
        <h1 className={`${preview ? 'text-xl' : 'text-2xl'} break-words font-bold`}>{view.title || 'Title'}</h1>
        <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-brand-ink">
          <span className={view.sold ? 'text-ink-soft line-through' : ''}>{view.price === null ? 'Price' : formatPrice(view.price)}</span>
          {view.sold && <span className="rounded-full bg-ink px-2.5 py-0.5 text-sm font-bold text-white no-underline">Sold</span>}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Listed {listed}{view.location ? ` in ${view.location}` : ''}
          {view.category && ' · '}
          {category && !preview ? (
            <Link href={`/?category=${category.slug}`} className="underline underline-offset-2 hover:text-ink">{category.name}</Link>
          ) : (
            view.category
          )}
        </p>
        <h2 className="mt-5 font-bold">Description</h2>
        <p className="mt-1 whitespace-pre-wrap break-words">{view.description || 'Description'}</p>
        <h2 className="mt-5 font-bold">Seller</h2>
        {view.sellerEmail && !preview ? (
          <a href={`mailto:${view.sellerEmail}`} className="mt-1 inline-block break-all text-brand-ink underline underline-offset-2">{view.sellerEmail}</a>
        ) : (
          <p className="mt-1 break-all">{view.sellerEmail || 'your email'}</p>
        )}
        {children && <div className="mt-6 border-t border-line pt-5">{children}</div>}
      </div>
    </div>
  );
}
