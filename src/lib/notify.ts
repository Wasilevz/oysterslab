import { getSupabaseAdmin } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

function getMoscowHour(): number {
  const now = new Date();
  const msk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Chisinau" }));
  return msk.getHours();
}

function getMoscowMinutes(): number {
  const now = new Date();
  const msk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Chisinau" }));
  return msk.getMinutes();
}

export async function sendShiftReminders(): Promise<{ sent: number; errors: number }> {
  const supabase = getSupabaseAdmin();
  const hour = getMoscowHour();
  const minutes = getMoscowMinutes();

  const { data: employees } = await supabase
    .from("users")
    .select("id, telegram_id, full_name")
    .eq("role", "employee");

  if (!employees || employees.length === 0) return { sent: 0, errors: 0 };

  const employeeIds = employees.map((e) => e.id);

  const { data: activeShifts } = await supabase
    .from("shifts")
    .select("user_id")
    .eq("status", "ACTIVE")
    .in("user_id", employeeIds);

  const activeUserIds = new Set((activeShifts ?? []).map((s) => s.user_id));

  let sent = 0;
  let errors = 0;

  for (const emp of employees) {
    if (!emp.telegram_id) continue;

    let message: string | null = null;

    if (hour === 11 && minutes === 45 && !activeUserIds.has(emp.id)) {
      message = `⏰ <b>${emp.full_name}</b>, смена через 15 минут!\nНе забудь открыть приложение и нажать «Начать смену» в 12:00.`;
    }

    if (hour === 12 && minutes === 0 && !activeUserIds.has(emp.id)) {
      message = `🔔 <b>${emp.full_name}</b>, пора на смену!\nНажми «Начать смену» в приложении.`;
    }

    if (hour === 22 && minutes === 15 && activeUserIds.has(emp.id)) {
      message = `⚠️ <b>${emp.full_name}</b>, смена заканчивается через 15 минут!\nНе забудь нажать «Завершить смену».`;
    }

    if (hour === 22 && minutes === 30 && activeUserIds.has(emp.id)) {
      message = `🔴 <b>${emp.full_name}</b>, время смены вышло.\nЗакрой смену в приложении.`;
    }

    if (hour === 22 && minutes === 45 && activeUserIds.has(emp.id)) {
      message = `🚨 <b>${emp.full_name}</b>, смена не закрыта!\nПожалуйста, закрой смену как можно скорее.`;
    }

    if (hour === 23 && minutes === 0 && activeUserIds.has(emp.id)) {
      message = `❗ <b>${emp.full_name}</b>, смена автоматически закроется через 30 минут.\nЗакрой её сейчас, чтобы не потерять часы.`;
    }

    if (message) {
      const ok = await sendMessage(emp.telegram_id, message);
      if (ok) sent++;
      else errors++;
    }
  }

  return { sent, errors };
}
