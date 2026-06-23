import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram-notify";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: employees, error } = await supabase
      .from("users")
      .select("id, full_name, telegram_id, shift_start_time")
      .in("role", ["employee", "admin"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No employees" });
    }

    let sent = 0;
    let errors = 0;

    for (const emp of employees) {
      if (!emp.telegram_id) {
        errors++;
        continue;
      }

      const startTime = emp.shift_start_time || "12:00";
      const ok = await sendTelegramMessage(
        emp.telegram_id,
        `🔔 Тестовое уведомление!\n\n` +
        `Привет, ${emp.full_name}! ✅\n\n` +
        `Твоё время начала смены: ${startTime}\n` +
        `Напоминания будут приходить за 15 минут до начала.`,
      );

      if (ok) sent++;
      else errors++;
    }

    return NextResponse.json({
      ok: true,
      totalEmployees: employees.length,
      sent,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
