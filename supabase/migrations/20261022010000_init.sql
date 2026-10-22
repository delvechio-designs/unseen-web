-- Unseen: leak and piracy takedown service for adult creators
-- Run against BOTH Supabase projects (development first, then production).
--
-- Rule: this database never stores explicit media or screenshots. Leak URLs and text notes only.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type creator_status      as enum ('signup', 'pending_verification', 'active', 'paused', 'cancelled');
create type plan_tier           as enum ('starter', 'pro');
create type creator_platform    as enum ('onlyfans', 'fansly', 'patreon', 'manyvids', 'other');
create type verification_status as enum ('pending', 'verified', 'failed');
create type leak_status         as enum ('found', 'notice_sent', 'removed', 'rejected', 'reappeared', 'ignored');
create type leak_source         as enum ('creator_report', 'manual_search', 'monitor');
create type recipient_type      as enum ('host', 'registrar', 'cdn', 'search_engine', 'platform', 'other');
create type notice_method       as enum ('email', 'web_form', 'other');
create type notice_status       as enum ('draft', 'sent', 'acknowledged', 'removed', 'rejected', 'no_response');
create type subscription_status as enum ('incomplete', 'active', 'past_due', 'canceled');

-- ---------- Helpers ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Tables ----------

create table creators (
  id                     uuid primary key default gen_random_uuid(),
  auth_user_id           uuid unique references auth.users(id) on delete set null, -- Phase 3 portal
  display_name           text not null,           -- primary stage name
  legal_name             text not null,           -- authorization record only; never placed in notices by default
  email                  text not null,
  status                 creator_status not null default 'signup',
  plan                   plan_tier not null default 'starter',
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  subscription_status    subscription_status not null default 'incomplete',
  current_period_end     timestamptz,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index creators_email_idx  on creators (lower(email));
create index creators_status_idx on creators (status);

create table creator_aliases (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  alias      text not null,
  created_at timestamptz not null default now(),
  unique (creator_id, alias)
);

create table platform_accounts (
  id                  uuid primary key default gen_random_uuid(),
  creator_id          uuid not null references creators(id) on delete cascade,
  platform            creator_platform not null,
  handle              text not null,
  profile_url         text not null,
  verification_code   text not null unique,       -- UNSEEN-XXXXXX, posted in the profile bio
  verification_status verification_status not null default 'pending',
  verified_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index platform_accounts_creator_idx on platform_accounts (creator_id);

create table authorizations (
  id                    uuid primary key default gen_random_uuid(),
  creator_id            uuid not null references creators(id) on delete cascade,
  signed_name           text not null,
  signed_at             timestamptz not null default now(),
  ip_address            text,
  user_agent            text,
  terms_version         text not null,
  attest_rights         boolean not null check (attest_rights),
  attest_adults_consent boolean not null check (attest_adults_consent)
);
create index authorizations_creator_idx on authorizations (creator_id);

create table leaks (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references creators(id) on delete cascade,
  url             text not null,
  domain          text not null,
  source          leak_source not null default 'manual_search',
  status          leak_status not null default 'found',
  found_at        timestamptz not null default now(),
  last_checked_at timestamptz,
  removed_at      timestamptz,
  notes           text,
  unique (creator_id, url)
);
create index leaks_creator_status_idx on leaks (creator_id, status);
create index leaks_domain_idx         on leaks (domain);

create table takedown_notices (
  id                uuid primary key default gen_random_uuid(),
  leak_id           uuid not null references leaks(id) on delete cascade,
  creator_id        uuid not null references creators(id) on delete cascade,
  recipient_type    recipient_type not null,
  recipient_name    text not null,
  recipient_contact text,                     -- abuse email or form URL
  method            notice_method not null,
  status            notice_status not null default 'draft',
  external_ref      text,                     -- ticket or case number from the recipient
  body              text not null,
  sent_at           timestamptz,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index takedown_notices_leak_idx   on takedown_notices (leak_id);
create index takedown_notices_open_idx   on takedown_notices (status, sent_at) where status in ('sent', 'acknowledged');

create table events (
  id         bigint generated always as identity primary key,
  creator_id uuid references creators(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_creator_idx on events (creator_id, created_at desc);

-- ---------- Triggers ----------
create trigger creators_updated         before update on creators         for each row execute function set_updated_at();
create trigger takedown_notices_updated before update on takedown_notices for each row execute function set_updated_at();

-- When a notice is marked removed, mark its leak removed too.
create or replace function sync_leak_on_notice() returns trigger
language plpgsql as $$
begin
  if new.status = 'removed' and (old.status is distinct from 'removed') then
    new.resolved_at := coalesce(new.resolved_at, now());
    update leaks set status = 'removed', removed_at = now(), last_checked_at = now()
     where id = new.leak_id;
  elsif new.status = 'sent' and (old.status is distinct from 'sent') then
    new.sent_at := coalesce(new.sent_at, now());
    update leaks set status = 'notice_sent'
     where id = new.leak_id and status in ('found', 'reappeared');
  end if;
  return new;
end;
$$;

create trigger takedown_notices_sync before update on takedown_notices
  for each row execute function sync_leak_on_notice();

-- ---------- Row level security ----------
-- All writes go through the service role (server routes), which bypasses RLS.
-- Policies below only let a logged-in creator READ their own rows (Phase 3 portal).

alter table creators          enable row level security;
alter table creator_aliases   enable row level security;
alter table platform_accounts enable row level security;
alter table authorizations    enable row level security;
alter table leaks             enable row level security;
alter table takedown_notices  enable row level security;
alter table events            enable row level security;

create or replace function current_creator_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from creators where auth_user_id = auth.uid()
$$;

create policy "creator reads self"      on creators          for select using (auth_user_id = auth.uid());
create policy "creator reads aliases"   on creator_aliases   for select using (creator_id = current_creator_id());
create policy "creator reads accounts"  on platform_accounts for select using (creator_id = current_creator_id());
create policy "creator reads leaks"     on leaks             for select using (creator_id = current_creator_id());
create policy "creator reads notices"   on takedown_notices  for select using (creator_id = current_creator_id());
-- authorizations and events: no creator policy (internal records only)
