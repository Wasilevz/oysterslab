"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  ActionResult,
  DashboardStats,
  EmployeeHours,
  MonthRevenue,
  Payroll,
} from "@/types/database";

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const supabase = getSupabaseAdmin();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [activeResult, autoClosedResult, payrollsResult, employeesResult, shiftsMonthResult, payrollsAllResult] =
      await Promise.all([
        supabase
          .from("shifts")
          .select("*, users!inner(id, full_name, telegram_id)")
          .eq("status", "ACTIVE")
          .order("clock_in", { ascending: true }),
        supabase
          .from("shifts")
          .select("*, users!inner(id, full_name, telegram_id)")
          .eq("status", "AUTO_CLOSED")
          .order("clock_in", { ascending: false }),
        supabase
          .from("payrolls")
          .select("*, users!inner(id, full_name)")
          .eq("status", "DRAFT")
          .order("period_end", { ascending: false }),
        supabase
          .from("users")
          .select("id, hourly_rate")
          .eq("role", "employee"),
        supabase
          .from("shifts")
          .select("user_id, hours_worked, users!inner(full_name)")
          .in("status", ["COMPLETED", "REVIEWED"])
          .gte("clock_in", monthStart)
          .lte("clock_in", monthEnd),
        supabase
          .from("payrolls")
          .select("period_start, total_amount, total_hours")
          .order("period_start", { ascending: false })
          .limit(6),
      ]);

    if (activeResult.error) return { success: false, error: activeResult.error.message };
    if (autoClosedResult.error) return { success: false, error: autoClosedResult.error.message };
    if (payrollsResult.error) return { success: false, error: payrollsResult.error.message };

    const activeShifts = (activeResult.data ?? []).map((row) => {
      const { users, ...shift } = row;
      return { shift, user: users as { id: string; full_name: string } };
    });

    const hoursMap = new Map<string, { name: string; hours: number }>();
    for (const row of shiftsMonthResult.data ?? []) {
      const existing = hoursMap.get(row.user_id);
      const h = row.hours_worked ?? 0;
      if (existing) {
        existing.hours += h;
      } else {
        const userName = Array.isArray(row.users) ? row.users[0]?.full_name : (row.users as { full_name: string })?.full_name ?? "—";
        hoursMap.set(row.user_id, { name: userName, hours: h });
      }
    }
    const employeeHours: EmployeeHours[] = Array.from(hoursMap.values())
      .map((e) => ({ name: e.name, hours: Math.round(e.hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);

    const employeesWithRate = employeesResult.data ?? [];
    let thisMonthPayroll = 0;
    for (const emp of employeesWithRate) {
      const hours = hoursMap.get(emp.id)?.hours ?? 0;
      thisMonthPayroll += hours * (emp.hourly_rate ?? 0);
    }
    thisMonthPayroll = Math.round(thisMonthPayroll);

    const revenueMap = new Map<string, number>();
    for (const row of payrollsAllResult.data ?? []) {
      const key = row.period_start;
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + row.total_amount);
    }
    const monthRevenue: MonthRevenue[] = Array.from(revenueMap.entries())
      .map(([key, amount]) => ({
        month: getMonthLabel(new Date(key)),
        amount: Math.round(amount),
      }))
      .reverse();

    return {
      success: true,
      data: {
        activeShifts,
        autoClosedShifts: autoClosedResult.data ?? [],
        draftPayrolls: payrollsResult.data ?? [],
        totalEmployees: employeesResult.data?.length ?? 0,
        employeeHours,
        monthRevenue,
        thisMonthPayroll,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить данные дашборда",
    };
  }
}

export async function approvePayroll(
  payrollId: string,
): Promise<ActionResult<Payroll>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: payroll, error: findError } = await supabase
      .from("payrolls")
      .select("*")
      .eq("id", payrollId)
      .eq("status", "DRAFT")
      .maybeSingle();

    if (findError) return { success: false, error: findError.message };
    if (!payroll) return { success: false, error: "Ведомость не найдена или уже утверждена" };

    const { data: updated, error } = await supabase
      .from("payrolls")
      .update({ status: "APPROVED" })
      .eq("id", payrollId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: updated as Payroll };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось утвердить ведомость",
    };
  }
}

export async function generatePayroll(
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<number>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: employees, error: empError } = await supabase
      .from("users")
      .select("id, hourly_rate")
      .eq("role", "employee");

    if (empError) return { success: false, error: empError.message };
    if (!employees || employees.length === 0) return { success: false, error: "Нет сотрудников" };

    let created = 0;

    for (const emp of employees) {
      if (emp.hourly_rate <= 0) continue;

      const { data: existing } = await supabase
        .from("payrolls")
        .select("id")
        .eq("user_id", emp.id)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (existing) continue;

      const { data: shifts, error: shiftError } = await supabase
        .from("shifts")
        .select("hours_worked")
        .eq("user_id", emp.id)
        .in("status", ["COMPLETED", "REVIEWED"])
        .gte("clock_in", periodStart)
        .lte("clock_in", periodEnd + "T23:59:59Z");

      if (shiftError) continue;

      const totalHours = (shifts ?? []).reduce(
        (sum, s) => sum + (s.hours_worked ?? 0), 0,
      );

      if (totalHours <= 0) continue;

      const totalAmount = Math.round(totalHours * emp.hourly_rate * 100) / 100;

      const { error: insertError } = await supabase.from("payrolls").insert({
        user_id: emp.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_hours: Math.round(totalHours * 100) / 100,
        total_amount: totalAmount,
        status: "DRAFT",
      });

      if (!insertError) created++;
    }

    return { success: true, data: created };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось рассчитать зарплату",
    };
  }
}
