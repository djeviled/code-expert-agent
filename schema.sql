-- ============================================================
-- CODE EXPERT AGENT — Complete Supabase Schema
-- Safe to run multiple times (idempotent)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_net";      -- for outbound HTTP (optional trigger)

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('ADMIN', 'SITE', 'CODE', 'BUNDLE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type project_status as enum (
    'pending', 'in_progress', 'awaiting_payment', 'delivered', 'failed'
  );
exception when duplicate_object then null;
end $$;

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text unique not null,
  name                    text,
  role                    user_role not null default 'SITE',
  -- credits / sites rescued counter
  credits                 integer not null default 0,
  sites_rescued           integer not null default 0,
  -- Stripe billing
  stripe_customer_id      text unique,
  stripe_subscription_id  text,
  subscription_status     text default null,   -- null | 'active' | 'canceled' | 'past_due'
  subscription_tier       text default null,   -- null | 'monthly_single' | 'monthly_priority'
  -- account state
  is_banned               boolean not null default false,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Add columns to existing table (safe / idempotent)
do $$ begin
  alter table public.users add column if not exists sites_rescued integer not null default 0;
  alter table public.users add column if not exists stripe_customer_id text;
  alter table public.users add column if not exists stripe_subscription_id text;
  alter table public.users add column if not exists subscription_status text default null;
  alter table public.users add column if not exists subscription_tier text default null;
  alter table public.users add column if not exists is_banned boolean not null default false;
exception when others then null;
end $$;

-- ────────────────────────────────────────────────────────────
-- PROJECTS  (code rescue jobs)
-- ────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references public.users(id) on delete cascade,
  tier                  user_role not null default 'SITE',
  upfront_amount        integer not null default 0,   -- cents
  balance_amount        integer not null default 0,   -- cents
  upfront_payment_id    text,
  balance_payment_id    text,
  site_url              text,
  github_repo           text,
  description           text,
  status                project_status default 'pending',
  balance_status        text default 'pending',       -- pending | charging | paid | failed
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  delivered_at          timestamptz
);

-- ────────────────────────────────────────────────────────────
-- USER CREDENTIALS  (customer tokens stored by the agent)
-- ────────────────────────────────────────────────────────────
create table if not exists public.user_credentials (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.users(id) on delete cascade,
  provider      text not null,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  metadata      jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, provider)
);

-- ────────────────────────────────────────────────────────────
-- AGENT SESSIONS
-- NOTE: API code uses project_name + started_at (not title + created_at)
-- ────────────────────────────────────────────────────────────
create table if not exists public.agent_sessions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references public.users(id) on delete cascade,
  project_id           uuid references public.projects(id) on delete set null,
  anthropic_session_id text,
  project_name         text,       -- session label (was "title" in older schema)
  started_at           timestamptz default now(),
  ended_at             timestamptz
);

-- Add columns to existing table (safe / idempotent)
do $$ begin
  alter table public.agent_sessions add column if not exists project_name text;
  alter table public.agent_sessions add column if not exists started_at timestamptz default now();
exception when others then null;
end $$;

-- ────────────────────────────────────────────────────────────
-- AGENT MESSAGES
-- ────────────────────────────────────────────────────────────
create table if not exists public.agent_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid references public.agent_sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'agent', 'assistant')),
  content     text,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- PAYMENTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  stripe_pi_id    text unique,
  amount          integer not null,   -- cents
  status          text not null default 'pending',
  type            text not null,      -- 'upfront' | 'balance'
  created_at      timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ADMIN NOTES  (also stores refund requests as JSON)
-- ────────────────────────────────────────────────────────────
create table if not exists public.admin_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  note        text not null,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ADMIN CREDENTIALS  (API keys stored AES-256 encrypted)
-- Encrypted with pgp_sym_encrypt using CREDENTIAL_ENCRYPTION_KEY env var
-- Decrypted on read with: pgp_sym_decrypt(decode(encrypted_value,'base64'), key)
-- ────────────────────────────────────────────────────────────
create table if not exists public.admin_credentials (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.users(id) on delete cascade,
  service          text not null,       -- 'stripe' | 'github' | 'vercel' | 'supabase' | 'anthropic' | 'groq'
  key_name         text not null,       -- e.g. 'secret_key', 'webhook_secret', 'pat_primary'
  encrypted_value  text not null,       -- base64(pgp_sym_encrypt(plaintext, ENCRYPTION_KEY))
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, service, key_name)
);

create index if not exists idx_admin_creds_user    on public.admin_credentials(user_id);
create index if not exists idx_admin_creds_service on public.admin_credentials(service);

alter table public.admin_credentials enable row level security;
-- Service role key bypasses RLS; no user-facing access needed

-- ────────────────────────────────────────────────────────────
-- ────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id                  uuid primary key default uuid_generate_v4(),
  code                text unique not null,
  label               text,                         -- internal name/note
  stripe_coupon_id    text,                         -- Stripe coupon ID
  stripe_promo_id     text,                         -- Stripe promotion code ID
  discount_type       text not null check (discount_type in ('percent', 'amount')),
  discount_value      integer not null,             -- percent 0-100 OR cents
  applies_to          text not null default 'all',  -- 'all' | 'tier1' | 'tier2' | 'bundle'
  max_redemptions     integer,                      -- null = unlimited
  times_redeemed      integer not null default 0,
  expires_at          timestamptz,                  -- null = never expires
  active              boolean not null default true,
  created_at          timestamptz default now()
);

create index if not exists idx_promo_codes_code   on public.promo_codes(code);
create index if not exists idx_promo_codes_active on public.promo_codes(active);

alter table public.promo_codes enable row level security;
-- Promos are admin-only; no user-facing RLS needed (service key bypasses RLS)

-- ────────────────────────────────────────────────────────────
create index if not exists idx_users_email              on public.users(email);
create index if not exists idx_users_stripe_customer    on public.users(stripe_customer_id);
create index if not exists idx_projects_user_id         on public.projects(user_id);
create index if not exists idx_projects_status          on public.projects(status);
create index if not exists idx_agent_sessions_user      on public.agent_sessions(user_id);
create index if not exists idx_agent_sessions_started   on public.agent_sessions(started_at);
create index if not exists idx_agent_messages_sess      on public.agent_messages(session_id);
create index if not exists idx_payments_user            on public.payments(user_id);
create index if not exists idx_payments_project         on public.payments(project_id);
create index if not exists idx_admin_notes_user         on public.admin_notes(user_id);
create index if not exists idx_admin_notes_project      on public.admin_notes(project_id);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
alter table public.users               enable row level security;
alter table public.projects            enable row level security;
alter table public.user_credentials    enable row level security;
alter table public.agent_sessions      enable row level security;
alter table public.agent_messages      enable row level security;
alter table public.payments            enable row level security;
alter table public.admin_notes         enable row level security;

-- Drop & recreate policies (safe re-run)
do $$ declare
  tbl text;
  pol text;
begin
  foreach tbl in array array[
    'users','projects','user_credentials','agent_sessions',
    'agent_messages','payments','admin_notes'
  ] loop
    for pol in
      select policyname from pg_policies
      where schemaname='public' and tablename=tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol, tbl);
    end loop;
  end loop;
end $$;

-- Users: own row access
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Projects: own row access
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);

-- Credentials: own row access
create policy "creds_select_own" on public.user_credentials
  for select using (auth.uid() = user_id);
create policy "creds_insert_own" on public.user_credentials
  for insert with check (auth.uid() = user_id);
create policy "creds_update_own" on public.user_credentials
  for update using (auth.uid() = user_id);

-- Agent sessions: own row access
create policy "sessions_select_own" on public.agent_sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.agent_sessions
  for insert with check (auth.uid() = user_id);

-- Agent messages (via session ownership)
create policy "messages_select_own" on public.agent_messages
  for select using (
    session_id in (
      select id from public.agent_sessions where user_id = auth.uid()
    )
  );

-- Payments: own row access
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- Admin notes: own row access
create policy "notes_select_own" on public.admin_notes
  for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at        on public.users;
drop trigger if exists projects_updated_at     on public.projects;
drop trigger if exists credentials_updated_at  on public.user_credentials;

create trigger users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

create trigger projects_updated_at
  before update on public.projects
  for each row execute function update_updated_at();

create trigger credentials_updated_at
  before update on public.user_credentials
  for each row execute function update_updated_at();

-- Convenience functions (security definer = run as owner, safe for RLS bypass)
create or replace function get_user_role(user_uuid uuid)
returns user_role language sql security definer as $$
  select role from public.users where id = user_uuid;
$$;

create or replace function get_user_projects(user_uuid uuid)
returns setof public.projects language sql security definer as $$
  select * from public.projects
  where user_id = user_uuid
  order by created_at desc;
$$;
