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
