-- ============================================================
-- CODE EXPERT AGENT — Supabase Schema (APPEND/ADD Friendly)
-- Run this on an EXISTING database — tables are created only if missing
-- ============================================================

-- Enable UUID extension (ignore error if already exists)
do $$ begin
  create extension if not exists "uuid-ossp";
end $$;

-- ============================================================
-- ENUMS (only create if not exists)
-- ============================================================

do $$ begin
  create type user_role as enum ('ADMIN', 'SITE', 'CODE', 'BUNDLE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing', 'paused');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type project_status as enum ('pending', 'in_progress', 'awaiting_payment', 'delivered', 'failed');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- USERS
-- ============================================================

create table if not exists public.users (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  name        text,
  password    text,
  role        user_role not null default 'SITE',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTIONS (monthly retainer add-on)
-- ============================================================

create table if not exists public.subscriptions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.users(id) on delete cascade,
  stripe_sub_id     text unique,
  stripe_price_id   text,
  status            subscription_status default 'active',
  current_period_start timestamptz,
  current_period_end   timestamptz,
  monthly_amount    integer,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================
-- PROJECTS (the actual code rescue jobs)
-- ============================================================

create table if not exists public.projects (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.users(id) on delete cascade,
  tier              user_role not null default 'SITE',
  upfront_amount    integer not null,
  balance_amount    integer not null default 0,
  upfront_payment_id    text,
  balance_payment_id     text,
  site_url          text,
  github_repo       text,
  description       text,
  status            project_status default 'pending',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  delivered_at      timestamptz
);

-- ============================================================
-- USER CREDENTIALS (for agent access)
-- ============================================================

create table if not exists public.user_credentials (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete cascade,
  provider    text not null,
  access_token text,
  refresh_token text,
  expires_at  timestamptz,
  metadata    jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, provider)
);

-- ============================================================
-- AGENT SESSIONS
-- ============================================================

create table if not exists public.agent_sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  anthropic_session_id text,
  title           text,
  created_at      timestamptz default now(),
  ended_at        timestamptz
);

-- ============================================================
-- AGENT MESSAGES
-- ============================================================

create table if not exists public.agent_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid references public.agent_sessions(id) on delete cascade,
  role        text not null,
  content     text,
  created_at   timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

create table if not exists public.payments (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  stripe_pi_id    text unique,
  amount          integer not null,
  status          text not null default 'pending',
  type            text not null,
  created_at      timestamptz default now()
);

-- ============================================================
-- ADMIN NOTES
-- ============================================================

create table if not exists public.admin_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  note        text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_user_credentials_user_id on public.user_credentials(user_id);
create index if not exists idx_agent_sessions_user_id on public.agent_sessions(user_id);
create index if not exists idx_agent_messages_session_id on public.agent_messages(session_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_project_id on public.payments(project_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.user_credentials enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;
alter table public.payments enable row level security;
alter table public.admin_notes enable row level security;

-- Drop existing policies first to avoid duplicates on re-run
drop policy if exists "Users read own" on public.users;
drop policy if exists "Users update own" on public.users;
drop policy if exists "Users read own subscriptions" on public.subscriptions;
drop policy if exists "Users read own projects" on public.projects;
drop policy if exists "Users insert own projects" on public.projects;
drop policy if exists "Users update own projects" on public.projects;
drop policy if exists "Users read own credentials" on public.user_credentials;
drop policy if exists "Users insert own credentials" on public.user_credentials;
drop policy if exists "Users update own credentials" on public.user_credentials;
drop policy if exists "Users read own sessions" on public.agent_sessions;
drop policy if exists "Users insert own sessions" on public.agent_sessions;
drop policy if exists "Users read own messages" on public.agent_messages;
drop policy if exists "Users read own payments" on public.payments;
drop policy if exists "Users read own notes" on public.admin_notes;
drop policy if exists "Users insert own notes" on public.admin_notes;

-- Create policies
create policy "Users read own" on public.users for select using (auth.uid() = id);
create policy "Users update own" on public.users for update using (auth.uid() = id);
create policy "Users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users read own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users read own credentials" on public.user_credentials for select using (auth.uid() = user_id);
create policy "Users insert own credentials" on public.user_credentials for insert with check (auth.uid() = user_id);
create policy "Users update own credentials" on public.user_credentials for update using (auth.uid() = user_id);
create policy "Users read own sessions" on public.agent_sessions for select using (auth.uid() = user_id);
create policy "Users insert own sessions" on public.agent_sessions for insert with check (auth.uid() = user_id);
create policy "Users read own messages" on public.agent_messages for select using (
  session_id in (select id from public.agent_sessions where user_id = auth.uid())
);
create policy "Users read own payments" on public.payments for select using (auth.uid() = user_id);
create policy "Users read own notes" on public.admin_notes for select using (auth.uid() = user_id);
create policy "Users insert own notes" on public.admin_notes for insert with check (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Drop existing functions to avoid duplicates
drop function if exists get_user_tier(uuid);
drop function if exists has_active_subscription(uuid);
drop function if exists get_user_projects(uuid);
drop function if exists update_updated_at();

-- Get user's current tier
create or replace function get_user_tier(user_uuid uuid)
returns user_role as $$
  select role from public.users where id = user_uuid;
$$ language sql security definer;

-- Check if user has active subscription
create or replace function has_active_subscription(user_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.subscriptions 
    where user_id = user_uuid 
    and status = 'active'
    and current_period_end > now()
  );
$$ language sql security definer;

-- Get user's active projects
create or replace function get_user_projects(user_uuid uuid)
returns setof public.projects as $$
  select * from public.projects where user_id = user_uuid order by created_at desc;
$$ language sql security definer;

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop triggers first
drop trigger if exists users_updated_at on public.users;
drop trigger if exists subscriptions_updated_at on public.subscriptions;
drop trigger if exists projects_updated_at on public.projects;
drop trigger if exists user_credentials_updated_at on public.user_credentials;

-- Create triggers
create trigger users_updated_at before update on public.users
  for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function update_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function update_updated_at();
create trigger user_credentials_updated_at before update on public.user_credentials
  for each row execute function update_updated_at();