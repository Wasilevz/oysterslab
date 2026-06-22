import { NextResponse } from "next/server";
import { generateSalaryForPeriod } from "@/actions/salaryActions";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek !== 1) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Not Monday",
      });
    }

    const mondayOffset = (now.getDay() + 6) % 7;
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - mondayOffset - 7);
    lastWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);

    const periodStart = lastWeekStart.toISOString().split("T")[0];
    const periodEnd = lastWeekEnd.toISOString().split("T")[0];

    const result = await generateSalaryForPeriod(periodStart, periodEnd);

    return NextResponse.json({
      ok: result.success,
      period: { start: periodStart, end: periodEnd },
      created: result.data ?? 0,
      error: result.error,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
