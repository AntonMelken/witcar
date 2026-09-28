-- WitCar initial schema (masterplan §7). Target: Supabase Postgres (EU/Frankfurt).
-- Every table has RLS enabled. The Next.js server talks to Postgres with a
-- privileged role and scopes every query by user_id; RLS is defense in depth
-- for the public PostgREST surface (anon/authenticated keys).

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  locale text not null default 'de' check (locale in ('de', 'en')),
  theme text not null default 'dark' check (theme in ('auto', 'dark', 'light')),
  vehicle_preset text not null default 'generic-landscape',
  safety_ack_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- layouts
-- ---------------------------------------------------------------------------
create table public.layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  preset text not null,
  mode text not null default 'standard' check (mode in ('standard', 'drive')),
  grid jsonb not null default '[]'::jsonb check (jsonb_typeof(grid) = 'array'),
  is_default boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index layouts_user_idx on public.layouts (user_id, mode, created_at);
create unique index layouts_one_default_per_mode on public.layouts (user_id, mode) where is_default;

-- ---------------------------------------------------------------------------
-- widget_configs: per widget instance configuration
-- ---------------------------------------------------------------------------
create table public.widget_configs (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.layouts on delete cascade,
  widget_id text not null check (char_length(widget_id) between 1 and 40),
  type text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (layout_id, widget_id)
);

-- ---------------------------------------------------------------------------
-- devices: paired car/browser devices
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text check (char_length(label) <= 60),
  preset text,
  token_hash text not null unique,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index devices_user_idx on public.devices (user_id);

-- ---------------------------------------------------------------------------
-- device_codes: short-lived pairing codes (RFC 8628 inspired)
-- ---------------------------------------------------------------------------
create table public.device_codes (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null unique,
  user_code text not null unique,
  user_id uuid references auth.users on delete cascade,
  label text check (char_length(label) <= 60),
  preset text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'expired', 'consumed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index device_codes_expires_idx on public.device_codes (expires_at);

-- ---------------------------------------------------------------------------
-- subscriptions: mirror of Stripe state (written only by the webhook)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  past_due_since timestamptz,
  last_event_created bigint,
  updated_at timestamptz not null default now()
);

-- Idempotency log for Stripe webhooks
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- Explicit consents (withdrawal waiver at checkout, driving safety notice)
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('withdrawal_waiver', 'safety_notice')),
  text_version text not null,
  accepted_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id);

-- Fallback cache when no Redis/KV is configured (D-010)
create table public.api_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);
create index api_cache_expires_idx on public.api_cache (expires_at);

-- In-car validation reports (gate G0/G1), anonymous, no personal data
create table public.incar_reports (
  id uuid primary key default gen_random_uuid(),
  model text check (char_length(model) <= 60),
  software_version text check (char_length(software_version) <= 40),
  region text check (char_length(region) <= 40),
  build_year int check (build_year between 2008 and 2100),
  visible_while_driving text check (visible_while_driving in ('yes', 'no', 'partial', 'unknown')),
  counter_kept_running text check (counter_kept_running in ('yes', 'no', 'partial', 'unknown')),
  network_active text check (network_active in ('yes', 'no', 'partial', 'unknown')),
  notes text check (char_length(notes) <= 2000),
  user_agent text check (char_length(user_agent) <= 400),
  viewport_w int,
  viewport_h int,
  device_pixel_ratio numeric(4, 2),
  measurements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger layouts_touch before update on public.layouts
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.layouts enable row level security;
alter table public.widget_configs enable row level security;
alter table public.devices enable row level security;
alter table public.device_codes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.consents enable row level security;
alter table public.api_cache enable row level security;
alter table public.incar_reports enable row level security;

-- profiles: own row only (insert happens via trigger)
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- layouts: own rows only
create policy layouts_all_own on public.layouts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- widget_configs: via owning layout
create policy widget_configs_all_own on public.widget_configs
  for all to authenticated
  using (exists (
    select 1 from public.layouts l
    where l.id = widget_configs.layout_id and l.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.layouts l
    where l.id = widget_configs.layout_id and l.user_id = (select auth.uid())
  ));

-- devices: own rows only
create policy devices_all_own on public.devices
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- subscriptions: read own only; writes only via service role (webhook)
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- consents: read own only; writes via server
create policy consents_select_own on public.consents
  for select to authenticated using ((select auth.uid()) = user_id);

-- device_codes, stripe_events, api_cache, incar_reports: no client policies
-- (RLS enabled without policies => deny all for anon/authenticated).
