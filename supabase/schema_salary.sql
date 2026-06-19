-- Таблица выплат зарплаты
create table if not exists salary_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  hours_worked numeric(10, 2) not null,
  hourly_rate numeric(10, 2) not null,
  total_amount numeric(10, 2) not null,
  status text not null check (status in ('pending', 'paid')) default 'pending',
  period_start date not null,
  period_end date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists salary_payments_user_id_idx on salary_payments(user_id);
create index if not exists salary_payments_status_idx on salary_payments(status);
