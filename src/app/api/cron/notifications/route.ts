import { NextResponse } from "next/server";
import { sendShiftReminders, autoCloseOverdueShifts } from "@/lib/notify";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [reminders, autoClose] = await Promise.all([
      sendShiftReminders(),
      autoCloseOverdueShifts(),
    ]);

    return NextResponse.json({
      ok: true,
      reminders,
      autoClose,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action === "force-autoclose") {
      const { getSupabaseAdmin } = await import("@/lib/supabase");
      const { sendTelegramMessage } = await import("@/lib/telegram-notify");

      const supabase = getSupabaseAdmin();
      const { data: activeShifts } = await supabase
        .from("shifts")
        .select("id, user_id, clock_in, users!inner(full_name, telegram_id)")
        .eq("status", "ACTIVE");

      if (!activeShifts || activeShifts.length === 0) {
        return NextResponse.json({ ok: true, closed: 0, message: "No active shifts" });
      }

      let closed = 0;
      const now = new Date();

      for (const shift of activeShifts) {
        const clockIn = new Date(shift.clock_in);
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
          await sendTelegramMessage(
            user.telegram_id,
            `🔒 ${user.full_name}, смена автоматически закрыта.\nОтработано: ${hoursWorked.toFixed(1)} ч.`,
          );
        }
        closed++;
      }

      return NextResponse.json({ ok: true, closed });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
