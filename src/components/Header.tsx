'use client';

import { CreditCard, Plus, Search, Tag } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cleanSearch, filtersToQuery, parseFilters } from '@/lib/filters';

const SHELL = 'sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:gap-4 sm:px-6';

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
        <Tag size={18} aria-hidden="true" />
      </span>
      <span className="hidden sm:inline">Marketplace</span>
    </Link>
  );
}

function GetPaidLink() {
  return (
    <Link
      href="/connect"
      className="ml-auto hidden h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 font-semibold hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:flex"
    >
      <CreditCard size={18} aria-hidden="true" />
      Get paid
    </Link>
  );
}

function SellButton() {
  return (
    <Link
      href="/create"
      className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 sm:ml-0 font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Plus size={18} aria-hidden="true" />
      Sell
    </Link>
  );
}

export function HeaderFallback() {
  return (
    <header className={SHELL}>
      <Logo />
      <div className="h-10 max-w-xl flex-1 rounded-full bg-chip" />
      <GetPaidLink />
      <SellButton />
    </header>
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onHome = pathname === '/';
  const [term, setTerm] = useState(() => (onHome ? (params.get('q') ?? '') : ''));
  const timer = useRef<number | undefined>(undefined);

  const go = (raw: string, immediate: boolean) => {
    window.clearTimeout(timer.current);
    const run = () => {
      const filters = onHome ? parseFilters(new URLSearchParams(window.location.search)) : parseFilters(new URLSearchParams());
      const next = filtersToQuery({ ...filters, q: cleanSearch(raw) });
      if (onHome) router.replace(`/${next}`, { scroll: false });
      else router.push(`/${next}`);
    };
    if (immediate) run();
    else timer.current = window.setTimeout(run, 300);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    go(term, true);
  };

  return (
    <header className={SHELL}>
      <Logo />
      <form role="search" onSubmit={submit} className="flex h-10 min-w-0 max-w-xl flex-1 items-center gap-2 rounded-full bg-chip px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
        <Search size={18} className="shrink-0 text-ink-soft" aria-hidden="true" />
        <label htmlFor="site-search" className="sr-only">
          Search listings
        </label>
        <input
          id="site-search"
          type="search"
          value={term}
          maxLength={100}
          placeholder="Search listings"
          onChange={(event) => {
            setTerm(event.target.value);
            if (onHome) go(event.target.value, false);
          }}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-soft"
        />
      </form>
      <GetPaidLink />
      <SellButton />
    </header>
  );
}
