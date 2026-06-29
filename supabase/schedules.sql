-- Уникальный индекс для таблицы schedules
-- Выполните в Supabase SQL Editor если ещё не создан

-- Создаём таблицу если её нет
create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date text not null,
  type text not null check (type in ('work', 'off', 'vacation', 'sick')),
  created_at timestamptz not null default now()
);

-- Уникальный.constraint чтобы upsert работал
CREATE UNIQUE INDEX IF NOT EXISTS schedules_user_id_date_idx ON schedules (user_id, date);
