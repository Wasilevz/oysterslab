-- Схема БД для TMA учёта смен
-- Выполните в Supabase SQL Editor

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  full_name text not null,
  role text not null check (role in ('employee', 'admin')),
  hourly_rate numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  clock_in timestamptz not null,
  clock_out timestamptz,
  status text not null check (status in ('ACTIVE', 'COMPLETED', 'AUTO_CLOSED', 'REVIEWED')),
  hours_worked numeric(10, 2),
  created_at timestamptz not null default now()
);

create index if not exists shifts_user_id_idx on shifts(user_id);
create index if not exists shifts_status_idx on shifts(status);

create table if not exists payrolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_hours numeric(10, 2) not null,
  total_amount numeric(10, 2) not null,
  status text not null check (status in ('DRAFT', 'APPROVED')),
  created_at timestamptz not null default now()
);

create index if not exists payrolls_status_idx on payrolls(status);

-- Пример: добавить админа (замените telegram_id и имя)
-- insert into users (telegram_id, full_name, role, hourly_rate)
-- values (123456789, 'Шеф', 'admin', 0);
