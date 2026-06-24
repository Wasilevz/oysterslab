import { getSupabaseAdmin } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendMessage(chatId: number, text: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
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

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hour: h, minute: m };
}

export async function sendShiftReminders(): Promise<{ sent: number; errors: number }> {
  const supabase = getSupabaseAdmin();
  const { hour: nowHour, minute: nowMin } = getLocalTime();

  const { data: employees } = await supabase
    .from("users")
    .select("id, telegram_id, full_name, shift_start_time")
    .in("role", ["employee", "admin"]);

  if (!employees || employees.length === 0) return { sent: 0, errors: 0 };

  const ids = employees.map((e) => e.id);
  const { data: active } = await supabase
    .from("shifts")
    .select("user_id")
    .eq("status", "ACTIVE")
    .in("user_id", ids);

  const activeIds = new Set((active ?? []).map((s) => s.user_id));

  let sent = 0;
  let errors = 0;

  for (const emp of employees) {
    if (!emp.telegram_id) continue;

    const isOnShift = activeIds.has(emp.id);
    const startTime = emp.shift_start_time || "12:00";
    const { hour: startH, minute: startM } = parseTime(startTime);

    const name = escapeHtml(emp.full_name);
    let message: string | null = null;

    // За 15 минут до начала смены
    const reminder15H = startH;
    const reminder15M = startM - 15;
    const adjustedReminder = reminder15M < 0
      ? { hour: reminder15H - 1, minute: reminder15M + 60 }
      : { hour: reminder15H, minute: reminder15M };

    if (nowHour === adjustedReminder.hour && nowMin === adjustedReminder.minute && !isOnShift) {
      message = `\u23F0 ${name}, смена через 15 минут.\nОткрой приложение и нажми \u00ABНачать смену\u00BB.`;
    }

    // Время начала смены
    if (nowHour === startH && nowMin === startM && !isOnShift) {
      message = `\u{1F514} ${name}, пора на смену!\nНе забудь нажать \u00ABНачать смену\u00BB.`;
    }

    // Вечерние напоминания (только для тех кто на смене)
    if (isOnShift) {
      if (nowHour === 22 && nowMin === 15) {
        message = `\u{1F4CB} ${name}, через 15 минут официальное окончание смены.\nЗакрой смену когда уйдёшь.`;
      }
      if (nowHour === 22 && nowMin === 30) {
        message = `\u{1F4CB} ${name}, 22:30 — официальное окончание смены.\nЗакрой смену в приложении.`;
      }
      if (nowHour === 23 && nowMin === 0) {
        message = `\u{1F44B} ${name}, уже полночь.\nНе забудь закрыть смену.`;
      }
      if (nowHour === 0 && nowMin === 0) {
        message = `\u{1F319} ${name}, уже после полуночи.\nЗакрой смену.`;
      }
      if (nowHour === 0 && nowMin === 30) {
        message = `\u26A0\uFE0F ${name}, смена открыта больше 12 часов.\nПожалуйста, закрой её.`;
      }
      if (nowHour === 1 && nowMin === 0) {
        message = `\u{1F6A8} ${name}, смена будет закрыта через 30 минут.\nЗакрой сейчас.`;
      }
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

  const afterCutoff = hour > 1 || (hour === 1 && minute >= 30);
  const beforeNextDay = hour < 2;
  if (!afterCutoff || !beforeNextDay) return { closed: 0 };

  const { data: activeShifts, error } = await supabase
    .from("shifts")
    .select("id, user_id, clock_in, users!inner(full_name, telegram_id)")
    .eq("status", "ACTIVE");

  if (error || !activeShifts || activeShifts.length === 0) return { closed: 0 };

  let closed = 0;

  for (const shift of activeShifts) {
    const clockIn = new Date(shift.clock_in);
    const now = new Date();
    const hoursWorked = Math.round(((now.getTime() - clockIn.getTime()) / 3600000) * 100) / 100;

    await supabase
      .from("shifts")
      .update({
        clock_out: now.toISOString(),
        status: "AUTO_CLOSED",
        hours_worked: hoursWorked,
      })
      .eq("id", shift.id);

    const user = Array.isArray(shift.users) ? shift.users[0] : shift.users;
    if (user?.telegram_id) {
      await sendMessage(
        user.telegram_id,
        `\u{1F512} ${user.full_name}, смена автоматически закрыта.\nОтработано: ${hoursWorked.toFixed(1)} \u0447.`,
      );
    }
    closed++;
  }

  return { closed };
}
