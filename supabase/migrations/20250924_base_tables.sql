-- Base schema required by the app (run this if your Supabase has no tables yet)
-- Safe to run multiple times with IF NOT EXISTS

-- Enable required extension for UUIDs
create extension if not exists pgcrypto;

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  avatar_url text,
  credits integer not null default 0,
  plan_type text not null default 'free' check (plan_type in ('free','premium')),
  is_teacher boolean not null default false,
  is_admin boolean not null default false,
  total_earnings numeric(12,2) not null default 0,
  skills_learned integer not null default 0,
  skills_taught integer not null default 0,
  total_sessions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teacher verifications
create table if not exists teacher_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  certificate_file_url text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ix_teacher_verifications_user on teacher_verifications(user_id);

-- Teacher badges (subject-scoped)
create table if not exists teacher_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subject text not null,
  valid boolean not null default true,
  issued_at timestamptz not null default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists ux_teacher_badges_user_subject on teacher_badges(user_id, subject);

-- Skills (simple marketplace items)
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  type text not null check (type in ('teaching','learning')),
  price integer not null default 0,
  difficulty_level text not null default 'beginner',
  duration_hours integer not null default 1,
  max_students integer not null default 10,
  current_students integer not null default 0,
  rating numeric(3,2) not null default 0,
  total_reviews integer not null default 0,
  exam_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_skills_user on skills(user_id);

-- Chat messages (per session)
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  sender_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ix_chat_messages_session on chat_messages(session_id, created_at);

-- Usage tracking (free plan daily minutes)
create table if not exists user_daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  minutes_used integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Sessions (for scheduling/chats)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid,
  teacher_id uuid not null references users(id) on delete cascade,
  learner_id uuid not null references users(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists ix_sessions_teacher on sessions(teacher_id);
create index if not exists ix_sessions_learner on sessions(learner_id);

-- Updated-at trigger function
create or replace function set_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated before update on users for each row execute procedure set_timestamp();
create trigger trg_skills_updated before update on skills for each row execute procedure set_timestamp();
create trigger trg_teacher_badges_updated before update on teacher_badges for each row execute procedure set_timestamp();
