create extension if not exists "pgcrypto";

-- PROFILES
create table if not exists profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique not null,
  display_name        text,
  avatar_url          text,
  bio                 text,
  stripe_account_id   text,
  crypto_wallet       text,
  preferred_chain     text,
  meta_access_token   text,
  meta_token_expires  timestamptz,
  meta_business_id    text,
  meta_ad_account_id  text,
  is_verified         boolean default false,
  rating              numeric(2,1),
  total_sales         int default 0,
  created_at          timestamptz default now()
);

alter table profiles enable row level security;
create policy "Public read profiles" on profiles for select using (true);
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);

-- LISTINGS
create table if not exists listings (
  id                      uuid primary key default gen_random_uuid(),
  seller_id               uuid not null references profiles(id) on delete cascade,
  title                   text not null,
  description             text,
  asset_type              text not null check (asset_type in ('pixel','custom_audience','lookalike_audience','engagement_audience')),
  transaction_type        text not null check (transaction_type in ('sale','trade','both')) default 'sale',
  price_cents             int,
  estimated_value_cents   int,
  accepts_crypto          boolean default false,
  meta_asset_id           text,
  meta_ad_account_id      text,
  audience_source         text,
  source_event            text,
  source_url              text,
  source_name             text,
  source_platform         text,
  source_extra            jsonb,
  audience_size           bigint,
  retention_days          int,
  geo                     text[],
  niche                   text,
  primary_category        text,
  secondary_categories    text[],
  pixel_age_days          int,
  status                  text not null check (status in ('active','paused','sold','expired')) default 'active',
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table listings enable row level security;
create policy "Public read active listings" on listings for select using (status = 'active' or auth.uid() = seller_id);
create policy "Sellers manage own listings" on listings for all using (auth.uid() = seller_id);

-- ORDERS
create table if not exists orders (
  id                          uuid primary key default gen_random_uuid(),
  listing_id                  uuid not null references listings(id),
  buyer_id                    uuid not null references profiles(id),
  seller_id                   uuid not null references profiles(id),
  transaction_type            text not null check (transaction_type in ('sale','trade')),
  payment_method              text not null check (payment_method in ('stripe','coinbase','trade')),
  amount_cents                int,
  platform_fee_cents          int,
  seller_payout_cents         int,
  stripe_payment_intent_id    text unique,
  stripe_transfer_id          text,
  coinbase_charge_id          text unique,
  coinbase_charge_code        text,
  crypto_currency             text,
  crypto_amount               text,
  seller_wallet_address       text,
  buyer_meta_ad_account_id    text,
  meta_transfer_status        text check (meta_transfer_status in ('pending','sent','accepted','failed')),
  meta_transfer_error         text,
  status                      text not null check (status in (
                                'pending_payment','paid','transferring','transferred',
                                'completed','disputed','refunded','cancelled'
                              )) default 'pending_payment',
  buyer_confirmed_at          timestamptz,
  completed_at                timestamptz,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

alter table orders enable row level security;
create policy "Parties see own orders" on orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers create orders" on orders for insert with check (auth.uid() = buyer_id);
create policy "Parties update own orders" on orders for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- TRADE OFFERS
create table if not exists trade_offers (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  offered_listing_id  uuid not null references listings(id),
  status              text not null check (status in ('pending','accepted','rejected')) default 'pending',
  message             text,
  created_at          timestamptz default now()
);

alter table trade_offers enable row level security;
create policy "Trade parties see offers" on trade_offers for select using (
  exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
);

-- MESSAGES
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  sender_id   uuid not null references profiles(id),
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

alter table messages enable row level security;
create policy "Order parties see messages" on messages for select using (
  exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
);
create policy "Order parties send messages" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
);

-- REVIEWS
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references orders(id),
  reviewer_id uuid not null references profiles(id),
  reviewee_id uuid not null references profiles(id),
  rating      int not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz default now()
);

alter table reviews enable row level security;
create policy "Public read reviews" on reviews for select using (true);
create policy "Reviewers write own reviews" on reviews for insert with check (auth.uid() = reviewer_id);

-- DISPUTES
create table if not exists disputes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references orders(id),
  opened_by   uuid not null references profiles(id),
  reason      text not null,
  status      text not null check (status in ('open','resolved_buyer','resolved_seller','escalated')) default 'open',
  created_at  timestamptz default now(),
  resolved_at timestamptz
);

alter table disputes enable row level security;
create policy "Parties see own disputes" on disputes for select using (
  exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
);
create policy "Parties open disputes" on disputes for insert with check (
  auth.uid() = opened_by and
  exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
);

-- TRIGGERS
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger listings_updated_at before update on listings for each row execute function update_updated_at();
create trigger orders_updated_at before update on orders for each row execute function update_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
