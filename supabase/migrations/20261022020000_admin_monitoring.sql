-- Unseen: Phase 2 to 4 additions (admin dashboard, creator portal, monitoring)
-- Run after 20261022010000_init.sql, on both projects.

-- When the monitor last swept this creator (drives Starter weekly / Pro daily cadence)
alter table creators add column if not exists last_sweep_at timestamptz;

-- Per-domain knowledge: where to send notices, and which domains the monitor should skip
create type domain_rule as enum ('leak_site', 'ignore');

create table domain_rules (
  domain         text primary key,               -- lowercase, no www
  rule           domain_rule not null default 'leak_site',
  recipient_type recipient_type,
  recipient_name text,
  abuse_contact  text,                           -- abuse email or DMCA form URL
  contact_method notice_method,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger domain_rules_updated before update on domain_rules
  for each row execute function set_updated_at();

alter table domain_rules enable row level security;
-- No policies: service role only.

-- Official creator platforms are never leaks
insert into domain_rules (domain, rule, notes) values
  ('onlyfans.com', 'ignore', 'Official platform'),
  ('fansly.com',   'ignore', 'Official platform'),
  ('patreon.com',  'ignore', 'Official platform'),
  ('manyvids.com', 'ignore', 'Official platform'),
  ('linktr.ee',    'ignore', 'Creator link page'),
  ('beacons.ai',   'ignore', 'Creator link page')
on conflict (domain) do nothing;

-- Speeds up the follow-up queue and recheck job
create index if not exists leaks_removed_check_idx on leaks (last_checked_at) where status = 'removed';
create index if not exists creators_sweep_idx on creators (status, last_sweep_at);
