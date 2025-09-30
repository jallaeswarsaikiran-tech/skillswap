-- Teacher verifications table
create table if not exists teacher_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  certificate_file_url varchar(500),
  notes text,
  status varchar(20) default 'pending' check (status in ('pending','approved','denied')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_teacher_verifications_updated before update on teacher_verifications
for each row execute procedure set_timestamp();
