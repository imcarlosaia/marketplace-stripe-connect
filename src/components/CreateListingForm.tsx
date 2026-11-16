'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { createListing, uploadListingPhoto } from '@/lib/listings';
import { loadSellerEmail, saveSellerEmail } from '@/lib/storage';
import { isConfigured } from '@/lib/supabase';
import type { ListingDraft, ListingField } from '@/lib/types';
import { DESCRIPTION_MAX, LOCATION_MAX, TITLE_MAX, charCount, parsePrice, validateListing, validatePhoto } from '@/lib/validation';
import { ListingDetails } from './ListingDetails';
import { NotConfigured } from './NotConfigured';
import { PhotoPicker, type PickedPhoto } from './PhotoPicker';

type Field = ListingField | 'photo';
const ORDER: readonly Field[] = ['photo', 'title', 'category', 'price', 'email', 'description', 'location'];
const UPLOAD_FAILED = "Couldn't upload the photo. Try again.";
const SAVE_FAILED = "Couldn't publish your listing. Try again.";
const TOO_MANY = 'Too many listings just now. Try again later.';

const FIELD =
  'w-full rounded-xl border bg-surface px-3 placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand';

const subscribeToNothing = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribeToNothing, () => true, () => false);

function Row({ id, label, error, note, children }: { id: string; label: string; error?: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-4">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
      {note && !error && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function CreateListing() {
  const hydrated = useHydrated();
  if (!isConfigured) return <NotConfigured />;
  if (!hydrated) return <div className="h-[600px] rounded-2xl bg-surface" />;
  return <CreateListingForm />;
}

function CreateListingForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<ListingDraft>(() => ({
    title: '', description: '', price: '', category: '', email: loadSellerEmail(), location: '',
  }));
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [now] = useState(() => new Date());
  const formRef = useRef<HTMLFormElement>(null);

  const check = (next: ListingDraft, nextPhoto: PickedPhoto | null) => {
    const found: Partial<Record<Field, string>> = validateListing(next);
    if (!nextPhoto) found.photo = 'Add a photo';
    return found;
  };

  const set = (field: ListingField, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (tried) setErrors(check(next, photo));
  };

  const pick = (file: File) => {
    const problem = validatePhoto(file);
    if (problem) {
      setErrors({ ...errors, photo: problem });
      return;
    }
    if (photo) URL.revokeObjectURL(photo.url);
    const next = { file, url: URL.createObjectURL(file) };
    setPhoto(next);
    setErrors(tried ? check(draft, next) : { ...errors, photo: undefined });
  };

  const removePhoto = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    if (tried) setErrors(check(draft, null));
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setTried(true);
    setFormError('');
    const found = check(draft, photo);
    setErrors(found);
    const first = ORDER.find((field) => found[field]);
    if (first || !photo) {
      formRef.current?.querySelector<HTMLElement>(`#field-${first ?? 'photo'}`)?.focus();
      return;
    }

    setBusy(true);
    let imagePath: string;
    try {
      imagePath = await uploadListingPhoto(photo.file);
    } catch {
      setFormError(UPLOAD_FAILED);
      setBusy(false);
      return;
    }
    try {
      const listing = await createListing(draft, imagePath);
      saveSellerEmail(draft.email.trim());
      router.push(`/item/${listing.id}`);
    } catch (error) {
      setFormError(error instanceof Error && error.message === 'too_many_listings' ? TOO_MANY : SAVE_FAILED);
      setBusy(false);
    }
  };

  const describe = (field: Field) => (errors[field] ? `field-${field}-error` : undefined);
  const border = (field: Field) => (errors[field] ? 'border-danger' : 'border-[#E1E4E8]');
  const descriptionLeft = DESCRIPTION_MAX - charCount(draft.description);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form ref={formRef} onSubmit={publish} noValidate aria-busy={busy} className="rounded-2xl bg-surface p-5">
        <PhotoPicker photo={photo} error={errors.photo} disabled={busy} onPick={pick} onRemove={removePhoto} />

        <Row id="field-title" label="Title" error={errors.title}>
          <input id="field-title" value={draft.title} maxLength={TITLE_MAX + 20} readOnly={busy} placeholder="What are you selling?"
            aria-invalid={Boolean(errors.title)} aria-describedby={describe('title')}
            onChange={(e) => set('title', e.target.value)} className={`${FIELD} h-11 ${border('title')}`} />
        </Row>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Row id="field-category" label="Category" error={errors.category}>
            <select id="field-category" value={draft.category} disabled={busy}
              aria-invalid={Boolean(errors.category)} aria-describedby={describe('category')}
              onChange={(e) => set('category', e.target.value)} className={`${FIELD} h-11 ${border('category')}`}>
              <option value="" disabled>Choose a category</option>
              {CATEGORIES.map((category) => <option key={category.slug} value={category.name}>{category.name}</option>)}
            </select>
          </Row>
          <Row id="field-price" label="Price ($)" error={errors.price} note="Enter 0 to give it away free.">
            <input id="field-price" inputMode="decimal" value={draft.price} readOnly={busy} placeholder="120"
              aria-invalid={Boolean(errors.price)} aria-describedby={describe('price')}
              onChange={(e) => set('price', e.target.value)} className={`${FIELD} h-11 ${border('price')}`} />
          </Row>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Row id="field-email" label="Your email" error={errors.email} note="Shown on your listing so buyers can reach you.">
            <input id="field-email" type="email" autoComplete="email" value={draft.email} readOnly={busy} placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)} aria-describedby={describe('email')}
              onChange={(e) => set('email', e.target.value)} className={`${FIELD} h-11 ${border('email')}`} />
          </Row>
          <Row id="field-location" label="Location (optional)" error={errors.location}>
            <input id="field-location" value={draft.location} maxLength={LOCATION_MAX + 20} readOnly={busy} placeholder="Lisbon"
              aria-invalid={Boolean(errors.location)} aria-describedby={describe('location')}
              onChange={(e) => set('location', e.target.value)} className={`${FIELD} h-11 ${border('location')}`} />
          </Row>
        </div>

        <Row id="field-description" label="Description" error={errors.description}>
          <textarea id="field-description" rows={5} value={draft.description} readOnly={busy} placeholder="Condition, size, pickup details…"
            aria-invalid={Boolean(errors.description) || descriptionLeft < 0} aria-describedby={`field-description-count ${describe('description') ?? ''}`}
            onChange={(e) => set('description', e.target.value)} className={`${FIELD} resize-y py-2 ${border('description')}`} />
          <p id="field-description-count" className={`mt-1 text-right text-xs ${descriptionLeft < 0 ? 'font-semibold text-danger' : 'text-ink-soft'}`}>
            {descriptionLeft} characters left
          </p>
        </Row>

        {formError && <p role="alert" className="mt-3 text-sm text-danger">{formError}</p>}
        <button type="submit" disabled={busy}
          className="mt-4 h-12 w-full rounded-xl bg-brand font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">
          {busy ? 'Publishing…' : 'Publish listing'}
        </button>
      </form>

      <section aria-label="Preview" className="lg:sticky lg:top-[84px]">
        <p className="mb-2 text-sm font-semibold text-ink-soft">Preview</p>
        <ListingDetails
          preview
          now={now}
          view={{
            title: draft.title.trim(),
            price: draft.price.trim() === '' ? null : parsePrice(draft.price),
            category: draft.category,
            description: draft.description.trim(),
            sellerEmail: draft.email.trim(),
            location: draft.location.trim() || null,
            createdAt: null,
            photoSrc: photo?.url ?? null,
          }}
        />
      </section>
    </div>
  );
}
