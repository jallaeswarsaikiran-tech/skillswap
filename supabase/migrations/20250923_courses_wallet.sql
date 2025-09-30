-- Courses and wallet schema (no external payment gateway yet)

-- Courses teachers can create
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id) on delete cascade,
  subject text not null,
  title text not null,
  description text,
  price_credits integer not null default 0 check (price_credits >= 0),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Course modules/lessons
create table if not exists course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  content_url text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_course_modules_course_order on course_modules(course_id, order_index);

-- Enrollments
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  learner_id uuid not null references users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists ux_enrollments_course_learner on enrollments(course_id, learner_id);

-- Wallet transactions (credits ledger)
create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('credit_purchase','enroll_spend','teacher_earn','refund','payout')),
  amount integer not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists ix_wallet_transactions_user_created on wallet_transactions(user_id, created_at desc);

-- Updated at triggers
create or replace function set_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_courses_updated before update on courses for each row execute procedure set_timestamp();
create trigger trg_course_modules_updated before update on course_modules for each row execute procedure set_timestamp();
