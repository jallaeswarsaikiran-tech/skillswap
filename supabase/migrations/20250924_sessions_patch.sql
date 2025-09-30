-- Patch sessions table to include fields used by API
alter table if exists sessions
  add column if not exists skill_id uuid,
  add column if not exists skill_title text,
  add column if not exists learner_message text,
  add column if not exists status text not null default 'pending' check (status in ('pending','accepted','declined','scheduled','completed','cancelled')),
  add column if not exists scheduled_for timestamptz,
  add column if not exists duration integer,
  add column if not exists price integer not null default 0,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz default now();

create index if not exists ix_sessions_user_status on sessions(status, created_at);
