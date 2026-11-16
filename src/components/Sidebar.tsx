'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { filtersToQuery } from '@/lib/filters';
import type { Filters, Sort } from '@/lib/types';

const FIELD =
  'h-10 w-full rounded-xl border border-[#E1E4E8] bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand';

export function categoryHref(filters: Filters, slug: string | null): string {
  return `/${filtersToQuery({ ...filters, category: slug })}`;
}

// Category links for the desktop sidebar.
export function CategoryList({ filters }: { filters: Filters }) {
  const item = (slug: string | null, name: string) => {
    const on = filters.category === slug;
    return (
      <li key={slug ?? 'all'}>
        <Link
          href={categoryHref(filters, slug)}
          replace
          scroll={false}
          aria-current={on ? 'page' : undefined}
          className={`block rounded-lg px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
            on ? 'bg-brand-soft font-semibold text-brand-ink' : 'hover:bg-chip'
          }`}
        >
          {name}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Categories">
      <h2 className="mb-2 text-sm font-bold">Categories</h2>
      <ul>
        {item(null, 'All listings')}
        {CATEGORIES.map((category) => item(category.slug, category.name))}
      </ul>
    </nav>
  );
}

// Price range and sort. Prices apply half a second after typing stops.
export function FilterControls({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const [min, setMin] = useState(filters.min === null ? '' : String(filters.min));
  const [max, setMax] = useState(filters.max === null ? '' : String(filters.max));
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const applyPrices = (nextMin: string, nextMax: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const toNumber = (value: string) => (value.trim() === '' || Number.isNaN(Number(value)) || Number(value) < 0 ? null : Number(value));
      onChange({ ...filters, min: toNumber(nextMin), max: toNumber(nextMax) });
    }, 500);
  };

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">Price range</h2>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="price-min">Minimum price</label>
        <input id="price-min" inputMode="decimal" placeholder="Min" value={min} className={FIELD}
          onChange={(event) => { setMin(event.target.value); applyPrices(event.target.value, max); }} />
        <label className="sr-only" htmlFor="price-max">Maximum price</label>
        <input id="price-max" inputMode="decimal" placeholder="Max" value={max} className={FIELD}
          onChange={(event) => { setMax(event.target.value); applyPrices(min, event.target.value); }} />
      </div>
      <label htmlFor="sort" className="mb-2 mt-4 block text-sm font-bold">Sort by</label>
      <select id="sort" value={filters.sort} className={FIELD}
        onChange={(event) => onChange({ ...filters, sort: event.target.value as Sort })}>
        <option value="new">Newest first</option>
        <option value="low">Price: low to high</option>
        <option value="high">Price: high to low</option>
      </select>
    </div>
  );
}

export function Sidebar({ filters, onChange, count }: { filters: Filters; onChange: (next: Filters) => void; count: string }) {
  return (
    <aside className="scroll-thin sticky top-[84px] hidden max-h-[calc(100dvh-100px)] self-start overflow-y-auto rounded-2xl bg-surface p-4 lg:block">
      <Link
        href="/create"
        className="mb-4 flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 font-semibold text-brand-ink hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Plus size={18} aria-hidden="true" />
        Create new listing
      </Link>
      <CategoryList filters={filters} />
      <div className="mt-5">
        <FilterControls filters={filters} onChange={onChange} />
      </div>
      <p className="mt-4 text-sm text-ink-soft">{count}</p>
    </aside>
  );
}

// Phone and tablet: categories as a scrolling row of pills, filters below.
export function CompactFilters({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const pill = (slug: string | null, name: string) => {
    const on = filters.category === slug;
    return (
      <Link
        key={slug ?? 'all'}
        href={categoryHref(filters, slug)}
        replace
        scroll={false}
        aria-current={on ? 'page' : undefined}
        className={`shrink-0 rounded-full border px-4 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
          on ? 'border-brand bg-brand text-white' : 'border-[#E1E4E8] bg-surface'
        }`}
      >
        {name}
      </Link>
    );
  };
  return (
    <div className="lg:hidden">
      <nav aria-label="Categories" className="scroll-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {pill(null, 'All')}
        {CATEGORIES.map((category) => pill(category.slug, category.name))}
      </nav>
      <details className="mt-2 rounded-2xl bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold">Price and sort</summary>
        <div className="mt-3">
          <FilterControls filters={filters} onChange={onChange} />
        </div>
      </details>
    </div>
  );
}
