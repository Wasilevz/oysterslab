import { getSupabaseAdmin } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
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
  } catch (err) {
    console.error("[TELEGRAM] sendTelegramMessage error:", err);
    return false;
  }
}

async function getUserTelegramId(userId: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("telegram_id")
    .eq("id", userId)
    .single();
  return data?.telegram_id ?? null;
}

export async function notifyShiftApproved(paymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("salary_payments")
      .select("user_id, period_start, period_end, total_amount, users!inner(full_name)")
      .eq("id", paymentId)
      .single();

  if (!data) return;

  const chatId = await getUserTelegramId(data.user_id);
  if (!chatId) return;

  const userName = Array.isArray(data.users) ? data.users[0]?.full_name : (data.users as { full_name: string }).full_name;
  const from = new Date(data.period_start).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const to = new Date(data.period_end).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  await sendTelegramMessage(
    chatId,
    `✅ <b>${userName}</b>, ваша выплата одобрена!\n\n` +
    `📅 Период: ${from} — ${to}\n` +
    `💰 Сумма: ${data.total_amount} MDL\n\n` +
    `Откройте приложение и подтвердите получение.`,
  );
}

export async function notifyPaymentReceived(paymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("salary_payments")
    .select("user_id, total_amount, users!inner(full_name)")
    .eq("id", paymentId)
    .single();

  if (!data) return;

  const chatId = await getUserTelegramId(data.user_id);
  if (!chatId) return;

  const userName = Array.isArray(data.users) ? data.users[0]?.full_name : (data.users as { full_name: string }).full_name;

  await sendTelegramMessage(
    chatId,
    `💰 <b>${userName}</b>, выплата ${data.total_amount} MDL подтверждена.\n\nСпасибо за работу! 🙌`,
  );
}

export async function notifyNewSchedule(userId: string, startDate: string, endDate: string): Promise<void> {
  const chatId = await getUserTelegramId(userId);
  if (!chatId) return;

  const from = new Date(startDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const to = new Date(endDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  await sendTelegramMessage(
    chatId,
    `📅 Обновлён график на ${from} — ${to}.\n\nОткройте приложение чтобы посмотреть расписание.`,
  );
}

export async function notifyFineAdded(userId: string, amount: number, reason: string): Promise<void> {
  const chatId = await getUserTelegramId(userId);
  if (!chatId) return;

  await sendTelegramMessage(
    chatId,
    `⚠️ Вам начислен штраф: <b>${amount} MDL</b>\n\nПричина: ${reason}`,
  );
}

export async function notifyAutoClosedShift(userId: string, hoursWorked: number): Promise<void> {
  const chatId = await getUserTelegramId(userId);
  if (!chatId) return;

  await sendTelegramMessage(
    chatId,
    `🔒 Ваша смена автоматически закрыта.\n\nОтработано: ${hoursWorked.toFixed(1)} ч.\nЕсли часы неточные — обратитесь к администратору.`,
  );
}
