'use client';

import { Lock } from 'lucide-react';
import { useState } from 'react';

const SOLD = 'Someone just bought this item.';
const NOT_READY = "The seller can't take payments right now. Message them instead.";
const FAILED = "Couldn't open checkout. Try again.";

export function BuyNow({ listingId, priceLabel, onSold }: { listingId: string; priceLabel: string; onSold: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return; // stay busy while the browser leaves for Stripe
      }
      if (body.error === 'sold') {
        setError(SOLD);
        onSold();
      } else if (body.error === 'seller_not_ready') setError(NOT_READY);
      else setError(FAILED);
    } catch {
      setError(FAILED);
    }
    setBusy(false);
  };

  return (
    <div>
      <button type="button" onClick={buy} disabled={busy} aria-busy={busy}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-lg font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">
        {busy ? 'Opening checkout…' : `Buy Now · ${priceLabel}`}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
        <Lock size={13} aria-hidden="true" />
        Secure payment with Stripe · test mode, no real money
      </p>
    </div>
  );
}
