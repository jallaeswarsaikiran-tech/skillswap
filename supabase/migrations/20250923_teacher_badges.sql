-- Teacher badges for subject-specific teaching rights
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

create trigger trg_teacher_badges_updated before update on teacher_badges
for each row execute procedure set_timestamp();
