import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Connect } from '@/components/ConnectForm';
import { PLATFORM_FEE_PERCENT } from '@/lib/money';

export const metadata: Metadata = { title: 'Get paid with Stripe · Marketplace' };

const STEPS = [
  'Enter the email you use on your listings.',
  "Finish Stripe's secure onboarding. It takes a few minutes.",
  'Your listings get a Buy Now button and buyers pay by card.',
];

export default function ConnectPage() {
  return (
    <main className="mx-auto max-w-[620px] px-4 py-6 sm:px-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to listings
      </Link>
      <h1 className="text-2xl font-bold">Get paid with Stripe</h1>
      <p className="mt-2 text-ink-soft">
        Connect a Stripe account so buyers can pay for your items online. Payments go straight to your Stripe account,
        minus a {PLATFORM_FEE_PERCENT}% marketplace fee.
      </p>
      <ol className="my-5 space-y-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-ink">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Connect />
      <p className="mt-4 rounded-xl bg-badge px-4 py-3 text-sm text-badge-ink">
        Test mode: no real money moves. During onboarding, use Stripe&apos;s test data; at checkout, use card 4242 4242 4242 4242.
      </p>
    </main>
  );
}
