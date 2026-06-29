import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const chisinauStr = now.toLocaleString("en-US", { timeZone: "Europe/Chisinau" });
    const nowLocal = new Date(chisinauStr);

    const mondayOffset = (nowLocal.getDay() + 6) % 7;
    const lastWeekStart = new Date(nowLocal);
    lastWeekStart.setDate(nowLocal.getDate() - mondayOffset - 7);
    lastWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);

    const periodStart = lastWeekStart.toISOString().split("T")[0];
    const periodEnd = lastWeekEnd.toISOString().split("T")[0];

    const supabase = getSupabaseAdmin();
    const { data: employees, error: empError } = await supabase
      .from("users")
      .select("id, hourly_rate, full_name")
      .in("role", ["employee", "admin"]);

    if (empError || !employees || employees.length === 0) {
      return NextResponse.json({ ok: false, error: "No employees" });
    }

    let created = 0;
    for (const emp of employees) {
      if (emp.hourly_rate <= 0) continue;

      const { data: existing } = await supabase
        .from("salary_payments")
        .select("id")
        .eq("user_id", emp.id)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (existing) continue;

      const { data: shifts } = await supabase
        .from("shifts")
        .select("hours_worked")
        .eq("user_id", emp.id)
        .in("status", ["COMPLETED", "REVIEWED"])
        .gte("clock_in", periodStart)
        .lte("clock_in", periodEnd + "T23:59:59Z");

      const totalHours = Math.round(
        (shifts ?? []).reduce((s, sh) => s + (sh.hours_worked ?? 0), 0) * 100,
      ) / 100;

      if (totalHours <= 0) continue;

      const { data: finesData } = await supabase
        .from("fines")
        .select("amount")
        .eq("user_id", emp.id)
        .lte("period_start", periodEnd)
        .gte("period_end", periodStart);

      const totalFines = (finesData ?? []).reduce((s, f) => s + Number(f.amount), 0);
      const finalAmount = Math.max(0, Math.round((totalHours * emp.hourly_rate - totalFines) * 100) / 100);

      const { error: insertError } = await supabase.from("salary_payments").insert({
        user_id: emp.id,
        hours_worked: totalHours,
        hourly_rate: emp.hourly_rate,
        total_amount: finalAmount,
        status: "pending",
        period_start: periodStart,
        period_end: periodEnd,
      });

      if (!insertError) created++;
    }

    return NextResponse.json({
      ok: true,
      period: { start: periodStart, end: periodEnd },
      created,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
