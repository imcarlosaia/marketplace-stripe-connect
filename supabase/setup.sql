-- Marketplace: database setup.
-- Run once, on a fresh Supabase project: SQL Editor -> New query -> paste -> Run.

-- 1. Tables.
--    Limits are enforced here as well as in the app, so they hold even if
--    someone talks to the database directly.
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 80),
  description  text not null check (char_length(btrim(description)) between 1 and 2000),
  price        numeric(10,2) not null check (price >= 0 and price <= 1000000),
  category     text not null check (category in (
                 'Vehicles', 'Property Rentals', 'Apparel', 'Classifieds', 'Electronics',
                 'Entertainment', 'Family', 'Free Stuff', 'Garden & Outdoor', 'Hobbies',
                 'Home Goods', 'Home Improvement', 'Home Sales', 'Musical Instruments',
                 'Office Supplies', 'Pet Supplies', 'Sporting Goods', 'Toys & Games',
                 'Buy and sell groups')),
  seller_email text not null check (char_length(seller_email) <= 254
                                    and seller_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  image_path   text not null check (image_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'),
  location     text check (location is null or char_length(btrim(location)) between 1 and 80),
  created_at   timestamptz not null default now()
);

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  buyer_email  text not null check (char_length(buyer_email) <= 254
                                    and buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  seller_email text not null,
  message      text not null check (char_length(btrim(message)) between 1 and 1000),
  created_at   timestamptz not null default now()
);

create index listings_created_at_idx on public.listings (created_at desc);
create index listings_category_idx on public.listings (category);
create index messages_listing_idx on public.messages (listing_id, created_at);
create index messages_buyer_idx on public.messages (buyer_email, created_at);

-- 2. Listings: anyone can read and create them; nobody can edit or delete
--    them, or choose a listing's id or timestamp.
alter table public.listings enable row level security;

create policy "Anyone can read listings"
  on public.listings for select to anon, authenticated using (true);

create policy "Anyone can create listings"
  on public.listings for insert to anon, authenticated with check (true);

revoke all on public.listings from anon, authenticated;
grant select on public.listings to anon, authenticated;
grant insert (title, description, price, category, seller_email, image_path, location)
  on public.listings to anon, authenticated;

-- Tidies new listings and limits how many can be created: 5 per email and
-- 50 in total in any hour.
create function public.prepare_new_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.title := btrim(new.title);
  new.description := btrim(new.description);
  new.seller_email := lower(btrim(new.seller_email));
  new.location := nullif(btrim(coalesce(new.location, '')), '');

  if (select count(*) from public.listings l
      where l.seller_email = new.seller_email
        and l.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.listings l
         where l.created_at > now() - interval '1 hour') >= 50 then
    raise exception 'too_many_listings' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger prepare_new_listing
  before insert on public.listings
  for each row execute function public.prepare_new_listing();

-- 3. Messages: the public key can neither read nor write this table, so
--    buyers' email addresses stay private. The only way in is send_message,
--    which checks the listing exists, applies the limits (5 per listing per
--    10 minutes, 10 per buyer per hour, 60 in total per hour) and returns
--    what the server needs to email the seller.
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;

create function public.send_message(p_listing_id uuid, p_buyer_email text, p_message text)
returns table (message_id uuid, to_email text, listing_title text, listing_price numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_buyer text := lower(btrim(p_buyer_email));
  v_id uuid;
begin
  select * into v_listing from public.listings l where l.id = p_listing_id;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;

  if (select count(*) from public.messages m
      where m.listing_id = p_listing_id and m.created_at > now() - interval '10 minutes') >= 5
     or (select count(*) from public.messages m
         where m.buyer_email = v_buyer and m.created_at > now() - interval '1 hour') >= 10
     or (select count(*) from public.messages m
         where m.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too_many_messages' using errcode = 'P0001';
  end if;

  insert into public.messages (listing_id, buyer_email, seller_email, message)
  values (p_listing_id, v_buyer, v_listing.seller_email, btrim(p_message))
  returning id into v_id;

  return query select v_id, v_listing.seller_email, v_listing.title, v_listing.price;
end;
$$;

revoke all on function public.send_message(uuid, text, text) from public;
grant execute on function public.send_message(uuid, text, text) to anon, authenticated;

-- 4. Photo storage: a public bucket for images of at most 5 MB. Visitors may
--    add files; they may not overwrite, list or delete them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy "Anyone can upload listing images"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'listing-images');

-- 5. Starter listings. Their photos are uploaded separately under these exact
--    file names; until then the listings show without a picture.
insert into public.listings (title, description, price, category, seller_email, image_path, location, created_at) values
  ('City bike, 24 inch', 'Light aluminium frame, seven gears, new tyres last spring. Rides smoothly. Pick up only.', 120, 'Sporting Goods', 'seller@example.com', '699878fb-fcd4-47ca-88f1-6b709a027f99.jpg', 'Lisbon', now() - interval '2 hours'),
  ('Two-seat linen sofa', 'Comfortable two-seater with removable, washable covers. From a smoke-free home. You collect.', 340, 'Home Goods', 'seller@example.com', 'e53534c1-31f2-463e-8a12-ee65c30e7da3.jpg', 'Porto', now() - interval '5 hours'),
  ('Acoustic guitar with case', 'Warm tone, new strings, slight wear on the body. Hard case included.', 180, 'Musical Instruments', 'seller@example.com', 'f50c01b2-f5cf-4994-a59e-dc8b05ad3512.jpg', 'Lisbon', now() - interval '9 hours'),
  ('Laptop, 14 inch, 16 GB RAM', 'Fast and quiet. Battery lasts about eight hours. Charger and sleeve included. Freshly reset.', 520, 'Electronics', 'seller@example.com', '0b89dc8d-4e52-4e4e-ae0d-79dc402afc2f.jpg', 'Braga', now() - interval '20 hours'),
  ('Denim jacket, size M', 'Classic fit, worn a handful of times. No marks or tears.', 35, 'Apparel', 'seller@example.com', '72544135-ea4b-4ac1-912f-1a6925fb1505.jpg', 'Lisbon', now() - interval '30 hours'),
  ('Vintage twin-lens film camera', 'Classic medium-format camera in working order. Clean glass, smooth focus. Comes with strap.', 210, 'Electronics', 'seller@example.com', 'aa482d77-225b-408e-b3a6-63850eda3208.jpg', 'Faro', now() - interval '2 days'),
  ('Monstera plant, large', 'About a metre tall and very healthy. Pot included.', 25, 'Garden & Outdoor', 'seller@example.com', '954c7463-40d4-4676-939d-fd77bdf49e3c.jpg', 'Porto', now() - interval '3 days'),
  ('Vintage scooter', 'Runs well, serviced in the spring. Papers in order. Two helmets included.', 1900, 'Vehicles', 'seller@example.com', '8cef2a92-06df-47a0-b8b3-36f20dc1a7ea.jpg', 'Coimbra', now() - interval '4 days'),
  ('Leather desk chair on wheels', 'Tan leather swivel chair with a padded back. Adjustable height, rolls smoothly.', 90, 'Office Supplies', 'seller@example.com', '5b26f514-ae31-49b6-980f-8191c618c10c.jpg', 'Braga', now() - interval '5 days'),
  ('Moving boxes, about 20', 'Sturdy boxes in mixed sizes, used once. Free to anyone who collects them.', 0, 'Free Stuff', 'seller@example.com', '762142f7-bf62-4b2e-8b4d-571111c3815e.jpg', 'Lisbon', now() - interval '6 days');
