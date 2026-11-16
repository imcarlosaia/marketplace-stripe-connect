'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { loadSellerEmail, saveSellerEmail } from '@/lib/storage';
import { isEmail } from '@/lib/validation';

const BAD_EMAIL = 'Enter a valid email, like you@example.com';
const TOO_MANY = 'Too many tries just now. Try again in an hour.';
const FAILED = "Couldn't reach Stripe. Try again.";
const NOT_READY = 'Payments are not set up on this site yet.';

const subscribeToNothing = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribeToNothing, () => true, () => false);

export function Connect() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-48 rounded-2xl bg-surface" />;
  return <ConnectForm />;
}

function ConnectForm() {
  const [email, setEmail] = useState(loadSellerEmail);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const value = email.trim();
    setFormError('');
    if (!isEmail(value)) {
      setError(BAD_EMAIL);
      document.getElementById('connect-email')?.focus();
      return;
    }
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; ready?: boolean };
      if (response.ok) saveSellerEmail(value);
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return; // keep the button busy while the browser leaves for Stripe
      }
      if (response.ok && body.ready) setReady(true);
      else if (response.status === 400) setError(BAD_EMAIL);
      else if (response.status === 429) setFormError(TOO_MANY);
      else if (response.status === 503) setFormError(NOT_READY);
      else setFormError(FAILED);
    } catch {
      setFormError(FAILED);
    }
    setBusy(false);
  };

  if (ready) {
    return (
      <div role="status" className="rounded-2xl bg-success-soft p-5 text-success-ink">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={20} aria-hidden="true" /> Already connected</p>
        <p className="mt-1 text-sm">{email.trim()} can take payments. Every listing with this email shows a Buy Now button.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">Back to listings</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="rounded-2xl bg-surface p-5">
      <label htmlFor="connect-email" className="mb-1 block text-sm font-semibold">Your email</label>
      <input id="connect-email" type="email" autoComplete="email" value={email} readOnly={busy} placeholder="you@example.com"
        aria-invalid={Boolean(error)} aria-describedby={error ? 'connect-email-error' : 'connect-email-note'}
        onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
        className={`h-11 w-full rounded-xl border bg-surface px-3 placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${error ? 'border-danger' : 'border-[#E1E4E8]'}`} />
      {error
        ? <p id="connect-email-error" className="mt-1 text-sm text-danger">{error}</p>
        : <p id="connect-email-note" className="mt-1 text-xs text-ink-soft">Use the same email as on your listings.</p>}
      {formError && <p role="alert" className="mt-3 text-sm text-danger">{formError}</p>}
      <button type="submit" disabled={busy}
        className="mt-4 h-11 w-full rounded-xl bg-[#635BFF] font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">
        {busy ? 'Opening Stripe…' : 'Connect with Stripe'}
      </button>
    </form>
  );
}
