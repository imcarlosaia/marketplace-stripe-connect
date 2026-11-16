import { ArrowLeft, Car, CreditCard, Home, Layers, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Choose listing type · Marketplace' };

function Card({ icon, title, text, href }: { icon: ReactNode; title: string; text: string; href?: string }) {
  const body = (
    <>
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>
      <span className="mt-3 block font-bold">{title}</span>
      <span className="mt-1 block text-sm text-ink-soft">{text}</span>
      {!href && <span className="mt-3 inline-block rounded-full bg-chip px-3 py-0.5 text-xs font-semibold text-ink-soft">Coming soon</span>}
    </>
  );
  const shape = 'block rounded-2xl border border-[#ECEEF1] bg-surface px-5 py-7 text-center';
  return href ? (
    <Link href={href} className={`${shape} transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(0_0_0/0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none`}>
      {body}
    </Link>
  ) : (
    <div aria-disabled="true" className={`${shape} opacity-60`}>{body}</div>
  );
}

export default function ChooseListingType() {
  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to listings
      </Link>
      <h1 className="mb-5 text-2xl font-bold">Choose listing type</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card href="/create/item" icon={<Tag size={26} aria-hidden="true" />} title="Item for sale" text="One item with a photo" />
        <Card icon={<Layers size={26} aria-hidden="true" />} title="Multiple listings" text="Several items at once" />
        <Card icon={<Car size={26} aria-hidden="true" />} title="Vehicle for sale" text="Cars, bikes and scooters" />
        <Card icon={<Home size={26} aria-hidden="true" />} title="Home for sale or rent" text="Houses and flats" />
      </div>
      <Link href="/connect" className="mt-5 flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-soft px-5 py-4 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <CreditCard size={22} className="shrink-0 text-brand" aria-hidden="true" />
        <span>
          <span className="block font-bold">Want buyers to pay online?</span>
          <span className="block text-sm text-ink-soft">Connect with Stripe and your listings get a Buy Now button.</span>
        </span>
      </Link>
    </main>
  );
}
