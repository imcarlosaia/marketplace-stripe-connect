-- Marketplace: Stripe Connect add-on.
-- Run once, after setup.sql: SQL Editor -> New query -> paste -> Run.
-- It only adds things; nothing existing is changed or removed.
--
-- Everything written here is written by the app's server with the Supabase
-- secret key. The public (publishable) key can only read what pages need.

-- 1. Sold listings. Visitors can read sold_at with the rest of a listing but
--    cannot set it: the insert grant from setup.sql lists columns, and
--    sold_at is not one of them.
alter table public.listings add column sold_at timestamptz;

-- 2. Sellers who started Stripe onboarding, identified by the email on their
--    listings. Pages may read only the email and whether the seller can take
--    payments; the Stripe account id stays on the server.
create table public.sellers (
  email             text primary key check (char_length(email) <= 254
                                            and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                                            and email = lower(email)),
  stripe_account_id text not null unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  charges_enabled   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.sellers enable row level security;
create policy "Anyone can see which sellers take payments"
  on public.sellers for select to anon, authenticated using (true);
revoke all on public.sellers from anon, authenticated;
grant select (email, charges_enabled) on public.sellers to anon, authenticated;

-- 3. Orders, one per Checkout Session. Private: they hold buyers' emails.
--    A listing can have only one paid order, so an item can never be sold
--    twice even if two buyers pay at the same moment.
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  stripe_account_id   text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  checkout_session_id text unique,
  amount_cents        integer not null check (amount_cents >= 50),
  fee_cents           integer not null check (fee_cents >= 0 and fee_cents < amount_cents),
  currency            text not null default 'usd',
  buyer_email         text,
  payment_intent_id   text,
  status              text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index orders_listing_idx on public.orders (listing_id);
create unique index orders_one_paid_per_listing on public.orders (listing_id) where status = 'paid';

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;

-- 4. Connect attempts, to limit how often onboarding can be started:
--    5 per email and 50 in total in any hour. Private.
create table public.connect_attempts (
  email      text not null,
  created_at timestamptz not null default now()
);

create index connect_attempts_idx on public.connect_attempts (email, created_at);

alter table public.connect_attempts enable row level security;
revoke all on public.connect_attempts from anon, authenticated;

create function public.note_connect_attempt(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if (select count(*) from public.connect_attempts a
      where a.email = v_email and a.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.connect_attempts a
         where a.created_at > now() - interval '1 hour') >= 50 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  insert into public.connect_attempts (email) values (v_email);
end;
$$;

revoke all on function public.note_connect_attempt(text) from public, anon, authenticated;
grant execute on function public.note_connect_attempt(text) to service_role;
