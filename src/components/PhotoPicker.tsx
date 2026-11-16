'use client';

import { ImagePlus, X } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { PHOTO_ACCEPT } from '@/lib/validation';

export interface PickedPhoto {
  file: File;
  url: string;
}

interface PhotoPickerProps {
  photo: PickedPhoto | null;
  error?: string;
  disabled: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

export function PhotoPicker({ photo, error, disabled, onPick, onRemove }: PhotoPickerProps) {
  const [dragging, setDragging] = useState(false);

  if (photo) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#E1E4E8]">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview from a blob URL */}
        <img src={photo.url} alt="" className="aspect-[4/3] w-full object-cover" />
        <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove photo"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) onPick(file);
  };

  return (
    <>
      <label
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${
          dragging ? 'border-brand bg-brand-soft' : error ? 'border-danger' : 'border-[#CBD2D9] hover:bg-chip'
        }`}
      >
        <input id="field-photo" type="file" accept={PHOTO_ACCEPT} disabled={disabled} className="sr-only"
          aria-invalid={Boolean(error)} aria-describedby={error ? 'field-photo-error' : undefined}
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onPick(file); }} />
        <ImagePlus size={28} className="text-ink-soft" aria-hidden="true" />
        <span className="mt-2 font-semibold">Add a photo</span>
        <span className="text-sm text-ink-soft">Click to choose, or drag one here</span>
        <span className="text-xs text-ink-soft">JPG, PNG or WebP up to 5MB</span>
      </label>
      {error && <p id="field-photo-error" className="mt-1 text-sm text-danger">{error}</p>}
    </>
  );
}
