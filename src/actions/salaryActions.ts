"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  ActionResult,
  EmployeeStats,
  SalaryPayment,
  SalaryPaymentWithUser,
  SalaryStats,
} from "@/types/database";

export async function getSalaryStats(): Promise<ActionResult<SalaryStats>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: payments, error } = await supabase
      .from("salary_payments")
      .select("*, users!inner(id, full_name, position)")
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const list = (payments ?? []) as SalaryPaymentWithUser[];
    const totalPending = list
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + Number(p.total_amount), 0);
    const totalApproved = list
      .filter((p) => p.status === "approved")
      .reduce((s, p) => s + Number(p.total_amount), 0);
    const totalPaid = list
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.total_amount), 0);

    return {
      success: true,
      data: { payments: list, totalPending, totalApproved, totalPaid },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить зарплаты",
    };
  }
}

export async function approveSalary(
  paymentId: string,
): Promise<ActionResult<SalaryPayment>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .update({ status: "approved" })
      .eq("id", paymentId)
      .eq("status", "pending")
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Запись не найдена или уже одобрена" };

    return { success: true, data: data as SalaryPayment };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось одобрить выплату",
    };
  }
}

export async function confirmSalaryReceived(
  paymentId: string,
): Promise<ActionResult<SalaryPayment>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("status", "approved")
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Запись не найдена или ещё не одобрена" };

    return { success: true, data: data as SalaryPayment };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось подтвердить получение",
    };
  }
}

export async function getEmployeeSalaries(
  userId: string,
): Promise<ActionResult<SalaryPayment[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as SalaryPayment[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить зарплаты",
    };
  }
}

export async function checkPeriodCalculated(
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<boolean>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("salary_payments")
      .select("id")
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .limit(1);

    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []).length > 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось проверить период",
    };
  }
}

export async function generateSalaryForPeriod(
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<number>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: alreadyCalculated } = await supabase
      .from("salary_payments")
      .select("id")
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .limit(1);

    if (alreadyCalculated && alreadyCalculated.length > 0) {
      return { success: false, error: "Расчёт за этот период уже был произведён" };
    }

    const { data: employees, error: empError } = await supabase
      .from("users")
      .select("id, hourly_rate, full_name")
      .eq("role", "employee");

    if (empError) return { success: false, error: empError.message };
    if (!employees || employees.length === 0) return { success: false, error: "Нет сотрудников" };

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

      const totalHours = (shifts ?? []).reduce(
        (sum, s) => sum + (s.hours_worked ?? 0), 0,
      );

      if (totalHours <= 0) continue;

      const totalAmount = Math.round(totalHours * emp.hourly_rate * 100) / 100;

      const { error: insertError } = await supabase.from("salary_payments").insert({
        user_id: emp.id,
        hours_worked: Math.round(totalHours * 100) / 100,
        hourly_rate: emp.hourly_rate,
        total_amount: totalAmount,
        status: "pending",
        period_start: periodStart,
        period_end: periodEnd,
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

export async function deleteSalaryPayment(
  paymentId: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("salary_payments")
      .delete()
      .eq("id", paymentId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось удалить запись",
    };
  }
}

export async function getEmployeeStats(
  userId: string,
): Promise<ActionResult<EmployeeStats>> {
  try {
    const supabase = getSupabaseAdmin();

    const dayOfWeek = new Date().getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: user } = await supabase
      .from("users")
      .select("hourly_rate")
      .eq("id", userId)
      .single();

    const hourlyRate = user?.hourly_rate ?? 0;

    const { data: monthShifts } = await supabase
      .from("shifts")
      .select("clock_in, hours_worked, status")
      .eq("user_id", userId)
      .in("status", ["COMPLETED", "REVIEWED", "AUTO_CLOSED"])
      .gte("clock_in", monthStart.toISOString());

    let hoursThisWeek = 0;
    let hoursThisMonth = 0;
    let totalShifts = 0;
    const dailyHours = new Map<string, number>();

    for (const shift of monthShifts ?? []) {
      const h = shift.hours_worked ?? 0;
      hoursThisMonth += h;
      totalShifts++;

      const shiftDate = new Date(shift.clock_in);
      if (shiftDate >= weekStart) {
        hoursThisWeek += h;
      }

      const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const dayKey = dayNames[shiftDate.getDay()];
      dailyHours.set(dayKey, (dailyHours.get(dayKey) ?? 0) + h);
    }

    const activeResult = await supabase
      .from("shifts")
      .select("clock_in, hours_worked, status")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (activeResult.data) {
      const elapsed = Math.max(0, (Date.now() - new Date(activeResult.data.clock_in).getTime()) / 3600000);
      hoursThisWeek += elapsed;
      hoursThisMonth += elapsed;
    }

    const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const weeklyHours = weekDays.map((day) => ({
      day,
      hours: Math.round((dailyHours.get(day) ?? 0) * 10) / 10,
    }));

    return {
      success: true,
      data: {
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
        expectedSalary: Math.round(hoursThisMonth * hourlyRate),
        totalShifts,
        hourlyRate,
        weeklyHours,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить статистику",
    };
  }
}
