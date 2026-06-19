-- Округление clock_in и clock_out до ближайших :00/:30
-- <=15 мин от :00 → :00
-- 16-30 мин от :00 → :30
-- 31-45 мин от :30 → :30
-- 46-59 мин → :00 следующего часа

create or replace function round_shift_times()
returns trigger as $$
declare
  m int;
begin
  -- Округляем clock_in
  m := extract(minute from new.clock_in);
  if m >= 0 and m <= 15 then
    new.clock_in := date_trunc('hour', new.clock_in);
  elsif m >= 16 and m <= 30 then
    new.clock_in := date_trunc('hour', new.clock_in) + interval '30 minutes';
  elsif m >= 31 and m <= 45 then
    new.clock_in := date_trunc('hour', new.clock_in) + interval '30 minutes';
  else
    new.clock_in := date_trunc('hour', new.clock_in) + interval '1 hour';
  end if;

  -- Округляем clock_out (если задан)
  if new.clock_out is not null then
    m := extract(minute from new.clock_out);
    if m >= 0 and m <= 15 then
      new.clock_out := date_trunc('hour', new.clock_out);
    elsif m >= 16 and m <= 30 then
      new.clock_out := date_trunc('hour', new.clock_out) + interval '30 minutes';
    elsif m >= 31 and m <= 45 then
      new.clock_out := date_trunc('hour', new.clock_out) + interval '30 minutes';
    else
      new.clock_out := date_trunc('hour', new.clock_out) + interval '1 hour';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- Триггер на INSERT и UPDATE
drop trigger if exists trigger_round_shift_times on shifts;
create trigger trigger_round_shift_times
  before insert or update on shifts
  for each row
  execute function round_shift_times();
