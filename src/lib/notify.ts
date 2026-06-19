import { getSupabaseAdmin } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

function roundTo30(date: Date): Date {
  const rounded = new Date(date);
  const m = rounded.getMinutes();
  if (m >= 0 && m <= 15) {
    rounded.setMinutes(0, 0, 0);
  } else if (m >= 16 && m <= 30) {
    rounded.setMinutes(30, 0, 0);
  } else if (m >= 31 && m <= 45) {
    rounded.setMinutes(30, 0, 0);
  } else {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  }
  return rounded;
}

async function sendMessage(chatId: number, text: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getLocalTime(): { hour: number; minute: number } {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Chisinau" }));
  return { hour: local.getHours(), minute: local.getMinutes() };
}

async function getActiveEmployeeIds(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: employees } = await supabase
    .from("users")
    .select("id, telegram_id, full_name")
    .eq("role", "employee");

  if (!employees || employees.length === 0) return { employees: [], activeIds: new Set<string>() };

  const ids = employees.map((e) => e.id);
  const { data: active } = await supabase
    .from("shifts")
    .select("user_id")
    .eq("status", "ACTIVE")
    .in("user_id", ids);

  return {
    employees,
    activeIds: new Set((active ?? []).map((s) => s.user_id)),
  };
}

export async function sendShiftReminders(): Promise<{ sent: number; errors: number }> {
  const supabase = getSupabaseAdmin();
  const { hour, minute } = getLocalTime();
  const { employees, activeIds } = await getActiveEmployeeIds(supabase);

  if (employees.length === 0) return { sent: 0, errors: 0 };

  let sent = 0;
  let errors = 0;

  for (const emp of employees) {
    if (!emp.telegram_id) continue;

    const isOnShift = activeIds.has(emp.id);
    let message: string | null = null;

    // === УТРЕННИЕ НАПОМИНАНИЯ (смена начинается в 12:00) ===

    if (hour === 11 && minute === 45 && !isOnShift) {
      message = `⏰ ${emp.full_name}, смена через 15 минут.\nОткрой приложение и нажми «Начать смену».`;
    }

    if (hour === 12 && minute === 0 && !isOnShift) {
      message = `🔔 ${emp.full_name}, пора на смену!\nНе забудь нажать «Начать смену».`;
    }

    // === ВЕЧЕРНИЕ НАПОМИНАНИЯ (с учётом задержек) ===

    // 22:15 — мягкое напоминание за 15 мин до официального окончания
    if (hour === 22 && minute === 15 && isOnShift) {
      message = `📋 ${emp.full_name}, через 15 минут официальное окончание смены.\nЕсли задерживаешься — ничего страшного, просто закрой смену когда уйдёшь.`;
    }

    // 22:30 — официальное окончание, без давления
    if (hour === 22 && minute === 30 && isOnShift) {
      message = `📋 ${emp.full_name}, 22:30 — официальное окончание смены.\nЗакрой смену в приложении, когда будешь уходить.`;
    }

    // 23:00 — дружеское напоминание
    if (hour === 23 && minute === 0 && isOnShift) {
      message = `👋 ${emp.full_name}, уже полночь.\nНе забудь закрыть смену, когда уйдёшь.`;
    }

    // 23:30 — ещё одно напоминание
    if (hour === 23 && minute === 30 && isOnShift) {
      message = `📝 ${emp.full_name}, напоминание: смена всё ещё открыта.\nЗакрой когда уйдёшь.`;
    }

    // 00:00 — после полуночи
    if (hour === 0 && minute === 0 && isOnShift) {
      message = `🌙 ${emp.full_name}, уже بعد полуночи.\nЗакрой смену, чтобы часы сохранились.`;
    }

    // 00:30 — мягкий таймаут
    if (hour === 0 && minute === 30 && isOnShift) {
      message = `⚠️ ${emp.full_name}, смена открыта больше 12 часов.\nПожалуйста, закрой её как можно скорее.`;
    }

    // 01:00 — предупреждение об автозакрытии
    if (hour === 1 && minute === 0 && isOnShift) {
      message = `🚨 ${emp.full_name}, смена будет автоматически закрыта через 30 минут.\nЗакрой её сейчас, чтобы не потерять часы.`;
    }

    if (message) {
      const ok = await sendMessage(emp.telegram_id, message);
      if (ok) sent++;
      else errors++;
    }
  }

  return { sent, errors };
}

export async function autoCloseOverdueShifts(): Promise<{ closed: number }> {
  const supabase = getSupabaseAdmin();
  const { hour, minute } = getLocalTime();

  // Автозакрытие в 1:30 ночи
  if (!(hour === 1 && minute === 30)) return { closed: 0 };

  const { data: activeShifts, error } = await supabase
    .from("shifts")
    .select("id, user_id, clock_in, users!inner(full_name, telegram_id)")
    .eq("status", "ACTIVE");

  if (error || !activeShifts || activeShifts.length === 0) return { closed: 0 };

  let closed = 0;

  for (const shift of activeShifts) {
    const clockIn = new Date(shift.clock_in);
    const roundedNow = roundTo30(new Date());
    const hoursWorked = Math.round(((roundedNow.getTime() - clockIn.getTime()) / 3600000) * 100) / 100;

    await supabase
      .from("shifts")
      .update({
        clock_out: roundedNow.toISOString(),
        status: "AUTO_CLOSED",
        hours_worked: hoursWorked,
      })
      .eq("id", shift.id);

    const user = (Array.isArray(shift.users) ? shift.users[0] : shift.users) as { full_name: string; telegram_id: number } | undefined;
    if (user?.telegram_id) {
      await sendMessage(
        user.telegram_id,
        `🔒 ${user.full_name}, смена автоматически закрыта.\nОтработано: ${hoursWorked.toFixed(1)} ч.\nЕсли часы неточные — обратись к администратору.`,
      );
    }

    closed++;
  }

  return { closed };
}
