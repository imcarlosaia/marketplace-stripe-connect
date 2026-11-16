'use client';

import { useState, type FormEvent } from 'react';
import { loadBuyerEmail, saveBuyerEmail } from '@/lib/storage';
import { MESSAGE_MAX, charCount, validateMessage } from '@/lib/validation';

type Field = 'email' | 'message';
type Outcome = { emailed: boolean } | null;

const SENT_EMAILED = 'The seller has been emailed and can reply to you directly.';
const SENT_SAVED = "We couldn't email the seller just now, but your message is saved.";
const TOO_MANY = 'Too many messages just now. Try again in a few minutes.';
const GONE = "This listing doesn't exist or was removed.";
const FAILED = "Couldn't send your message. Try again.";

const FIELD =
  'w-full rounded-xl border bg-surface px-3 py-2 placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand';

export function MessageSeller({ listingId }: { listingId: string }) {
  const [email, setEmail] = useState(loadBuyerEmail);
  const [message, setMessage] = useState('Hi, is this still available?');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const problems = validateMessage({ email, message });
    setErrors(problems);
    setFormError('');
    const first = (['email', 'message'] as const).find((field) => problems[field]);
    if (first) {
      document.getElementById(`msg-${first}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId, email: email.trim(), message: message.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as { emailed?: boolean; error?: string };
      if (response.ok) {
        saveBuyerEmail(email.trim());
        setOutcome({ emailed: Boolean(body.emailed) });
      } else if (response.status === 429) setFormError(TOO_MANY);
      else if (response.status === 404) setFormError(GONE);
      else setFormError(FAILED);
    } catch {
      setFormError(FAILED);
    } finally {
      setBusy(false);
    }
  };

  if (outcome) {
    return (
      <div role="status" className="rounded-2xl bg-success-soft p-4 text-success-ink">
        <p className="font-semibold">{outcome.emailed ? 'Message sent' : 'Message saved'}</p>
        <p className="mt-1 text-sm">{outcome.emailed ? SENT_EMAILED : SENT_SAVED}</p>
        <button type="button" onClick={() => { setOutcome(null); setMessage(''); }}
          className="mt-3 text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand">
          Send another message
        </button>
      </div>
    );
  }

  const left = MESSAGE_MAX - charCount(message);
  return (
    <form onSubmit={send} noValidate aria-busy={busy}>
      <h2 className="text-lg font-bold">Message seller</h2>
      <label htmlFor="msg-email" className="mb-1 mt-3 block text-sm font-semibold">Your email</label>
      <input id="msg-email" type="email" autoComplete="email" value={email} readOnly={busy} placeholder="you@example.com"
        aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'msg-email-error' : undefined}
        onChange={(event) => { setEmail(event.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
        className={`${FIELD} h-11 ${errors.email ? 'border-danger' : 'border-[#E1E4E8]'}`} />
      {errors.email && <p id="msg-email-error" className="mt-1 text-sm text-danger">{errors.email}</p>}

      <label htmlFor="msg-message" className="mb-1 mt-3 block text-sm font-semibold">Message</label>
      <textarea id="msg-message" rows={4} value={message} readOnly={busy}
        aria-invalid={Boolean(errors.message) || left < 0} aria-describedby="msg-count msg-message-error"
        onChange={(event) => { setMessage(event.target.value); if (errors.message) setErrors({ ...errors, message: undefined }); }}
        className={`${FIELD} resize-y ${errors.message || left < 0 ? 'border-danger' : 'border-[#E1E4E8]'}`} />
      <div className="mt-1 flex justify-between gap-3 text-sm">
        <p id="msg-message-error" className="text-danger">{errors.message ?? ''}</p>
        <p id="msg-count" className={left < 0 ? 'font-semibold text-danger' : 'text-ink-soft'}>{left}</p>
      </div>

      {formError && <p role="alert" className="mt-2 text-sm text-danger">{formError}</p>}
      <button type="submit" disabled={busy}
        className="mt-3 h-11 w-full rounded-xl bg-brand font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">
        {busy ? 'Sending…' : 'Send message'}
      </button>
      <p className="mt-2 text-xs text-ink-soft">The seller gets your message by email and can reply to you directly.</p>
    </form>
  );
}
