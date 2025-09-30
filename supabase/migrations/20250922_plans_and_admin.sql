-- Extend users with plan_type and is_admin
alter table users add column if not exists plan_type text not null default 'free' check (plan_type in ('free','premium'));
alter table users add column if not exists is_admin boolean not null default false;

-- Track daily usage limits for free plan (minutes per day)
create table if not exists user_daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  usage_date date not null default (current_date),
  minutes_used integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, usage_date)
);

create trigger trg_user_daily_usage_updated before update on user_daily_usage
for each row execute procedure set_timestamp();
