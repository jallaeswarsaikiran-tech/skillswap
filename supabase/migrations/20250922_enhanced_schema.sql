-- SkillSwap Enhanced Database Schema
-- Generated on 2025-09-22

-- Enable required extensions
create extension if not exists pgcrypto;

-- USERS table (app users, not to be confused with auth.users)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique not null,
  display_name varchar(255) not null,
  avatar_url varchar(500),
  credits integer default 50,
  total_earnings numeric(10,2) default 0,
  skills_learned integer default 0,
  skills_taught integer default 0,
  total_sessions integer default 0,
  is_teacher boolean default false,
  teacher_score numeric(3,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SKILLS table
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title varchar(255) not null,
  description text,
  category varchar(100) not null,
  type varchar(20) not null check (type in ('teaching','learning')),
  price integer not null,
  difficulty_level varchar(20) default 'beginner',
  duration_hours integer default 1,
  max_students integer default 10,
  current_students integer default 0,
  rating numeric(3,2) default 0,
  total_reviews integer default 0,
  exam_required boolean default false,
  exam_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SESSIONS table
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  teacher_id uuid references users(id) on delete cascade,
  learner_id uuid references users(id) on delete cascade,
  status varchar(20) default 'pending' check (status in ('pending','accepted','ongoing','completed','cancelled')),
  scheduled_for timestamptz,
  duration_minutes integer default 60,
  video_room_id varchar(255),
  chat_enabled boolean default true,
  payment_amount integer not null default 0,
  payment_status varchar(20) default 'pending' check (payment_status in ('pending','paid','refunded')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CHAT MESSAGES table
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  message_text text not null,
  message_type varchar(20) default 'text', -- text, file, image
  file_url varchar(500),
  is_read boolean default false,
  created_at timestamptz default now()
);

-- EXAMS table
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  creator_id uuid references users(id) on delete cascade,
  title varchar(255) not null,
  description text,
  duration_minutes integer default 60,
  passing_score integer default 70,
  max_attempts integer default 3,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- EXAM QUESTIONS table
create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  question_text text not null,
  question_type varchar(20) default 'mcq', -- mcq, text, boolean
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text not null,
  explanation text,
  created_at timestamptz default now()
);

-- EXAM ATTEMPTS table
create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  score integer default 0,
  passed boolean default false,
  attempt_number integer default 1,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Basic triggers to auto-update updated_at
create or replace function set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated before update on users
for each row execute procedure set_timestamp();

create trigger trg_skills_updated before update on skills
for each row execute procedure set_timestamp();

create trigger trg_sessions_updated before update on sessions
for each row execute procedure set_timestamp();
