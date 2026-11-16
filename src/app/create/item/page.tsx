import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateListing } from '@/components/CreateListingForm';

export const metadata: Metadata = { title: 'Item for sale · Marketplace' };

export default function CreateItemPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6">
      <Link href="/create" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand">
        <ArrowLeft size={18} aria-hidden="true" />
        Back
      </Link>
      <h1 className="mb-5 text-2xl font-bold">Item for sale</h1>
      <CreateListing />
    </main>
  );
}
