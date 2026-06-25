"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { getAdminLocationId } from "@/lib/admin-location";
import { requireAdmin, verifyRequestAuth } from "@/lib/auth";
import type {
  ActionResult,
  EmployeeStats,
  SalaryPayment,
  SalaryPaymentWithUser,
} from "@/types/database";

export async function getShiftsForPeriod(
  userId: string,
  dateFrom: string,
  dateTo: string,
  initData: string,
): Promise<ActionResult<{ hours: number; amount: number; rate: number; shiftCount: number }>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };
    if (auth.id !== userId) return { success: false, error: "Нет доступа" };

    return await calcShiftsForPeriod(userId, dateFrom, dateTo);
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

async function calcShiftsForPeriod(
  userId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ success: true; data: { hours: number; amount: number; rate: number; shiftCount: number } } | ActionResult<never>> {
  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("hourly_rate")
    .eq("id", userId)
    .single();

  const rate = user?.hourly_rate ?? 0;

  const { data: shifts } = await supabase
    .from("shifts")
    .select("hours_worked")
    .eq("user_id", userId)
    .in("status", ["COMPLETED", "REVIEWED", "AUTO_CLOSED"])
    .gte("clock_in", dateFrom + "T00:00:00Z")
    .lte("clock_in", dateTo + "T23:59:59Z");

  const list = shifts ?? [];
  const totalHours = list.reduce((s, sh) => s + (sh.hours_worked ?? 0), 0);
  const rounded = Math.round(totalHours * 100) / 100;
  const amount = Math.round(rounded * rate * 100) / 100;

  return {
    success: true,
    data: { hours: rounded, amount, rate, shiftCount: list.length },
  };
}

export async function createPayment(
  userId: string,
  dateFrom: string,
  dateTo: string,
  initData?: string,
): Promise<ActionResult<SalaryPayment>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("salary_payments")
      .select("id")
      .eq("user_id", userId)
      .eq("period_start", dateFrom)
      .eq("period_end", dateTo)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Выплата за этот период уже создана" };
    }

    const calc = await calcShiftsForPeriod(userId, dateFrom, dateTo);
    if (!calc.success || !calc.data) {
      return { success: false, error: calc.error ?? "Ошибка расчёта" };
    }

    if (calc.data.hours <= 0) {
      return { success: false, error: "Нет отработанных часов за этот период" };
    }

    const { data: finesData } = await supabase
      .from("fines")
      .select("amount")
      .eq("user_id", userId)
      .gte("period_start", dateFrom)
      .lte("period_end", dateTo);

    const totalFines = (finesData ?? []).reduce((s, f) => s + Number(f.amount), 0);
    const finalAmount = Math.max(0, Math.round((calc.data.amount - totalFines) * 100) / 100);

    const { data, error } = await supabase
      .from("salary_payments")
      .insert({
        user_id: userId,
        hours_worked: calc.data.hours,
        hourly_rate: calc.data.rate,
        total_amount: finalAmount,
        status: "pending",
        period_start: dateFrom,
        period_end: dateTo,
      })
      .select("*, users!inner(id, full_name, position)")
      .single();

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: data as SalaryPayment };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function approvePayment(
  paymentId: string,
  initData: string,
): Promise<ActionResult<void>> {
  try {
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) return { success: false, error: authResult.error };
    const callerId = authResult.user.id;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("salary_payments")
      .update({ status: "approved" })
      .eq("id", paymentId)
      .eq("status", "pending");
    if (error) return { success: false, error: "Ошибка сервера" };

    const { notifyShiftApproved } = await import("@/lib/telegram-notify");
    void notifyShiftApproved(paymentId);
    void logAction(callerId, "approve_payment", "salary_payment", paymentId);

    return { success: true };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function confirmPayment(
  paymentId: string,
  initData?: string,
): Promise<ActionResult<void>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();

    const { data: payment } = await supabase
      .from("salary_payments")
      .select("user_id, status")
      .eq("id", paymentId)
      .single();

    if (!payment || payment.user_id !== auth.id) {
      return { success: false, error: "Не авторизован" };
    }

    const { error } = await supabase
      .from("salary_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("status", "approved");
    if (error) return { success: false, error: "Ошибка сервера" };

    const { notifyPaymentReceived } = await import("@/lib/telegram-notify");
    void notifyPaymentReceived(paymentId);
    void logAction("system", "confirm_payment", "salary_payment", paymentId);

    return { success: true };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function deletePayment(
  paymentId: string,
  initData: string,
): Promise<ActionResult<void>> {
  try {
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("salary_payments")
      .delete()
      .eq("id", paymentId)
      .eq("status", "pending");
    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getAllPayments(initData?: string): Promise<ActionResult<SalaryPaymentWithUser[]>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();
    const locationId = await getAdminLocationId(authResult.user.id);

    let query = supabase
      .from("salary_payments")
      .select("*, users!inner(id, full_name, position, location_id)")
      .order("created_at", { ascending: false });

    if (locationId) {
      query = query.eq("users.location_id", locationId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true, data: (data ?? []) as SalaryPaymentWithUser[] };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getMonthlyReport(
  year: number,
  month: number,
  initData?: string,
): Promise<ActionResult<{
  employees: {
    id: string;
    full_name: string;
    position: string | null;
    totalHours: number;
    totalAmount: number;
    totalShifts: number;
  }[];
  grandTotal: number;
}>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const { data: employees } = await supabase
      .from("users")
      .select("id, full_name, position, hourly_rate")
      .in("role", ["employee", "admin"])
      .order("full_name");

    if (!employees || employees.length === 0) {
      return { success: true, data: { employees: [], grandTotal: 0 } };
    }

    const result = [];
    let grandTotal = 0;

    for (const emp of employees) {
      const { data: shifts } = await supabase
        .from("shifts")
        .select("hours_worked")
        .eq("user_id", emp.id)
        .in("status", ["COMPLETED", "REVIEWED", "AUTO_CLOSED"])
        .gte("clock_in", startDate)
        .lt("clock_in", endDate);

      const totalHours = Math.round(
        (shifts ?? []).reduce((s, sh) => s + (sh.hours_worked ?? 0), 0) * 100,
      ) / 100;
      const totalAmount = Math.round(totalHours * emp.hourly_rate);
      const totalShifts = (shifts ?? []).length;

      if (totalHours > 0 || totalShifts > 0) {
        result.push({
          id: emp.id,
          full_name: emp.full_name,
          position: emp.position,
          totalHours,
          totalAmount,
          totalShifts,
        });
        grandTotal += totalAmount;
      }
    }

    return {
      success: true,
      data: { employees: result, grandTotal: Math.round(grandTotal) },
    };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getEmployeeStats(
  userId: string,
  initData: string,
): Promise<ActionResult<EmployeeStats>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };
    if (auth.id !== userId) return { success: false, error: "Нет доступа" };

    const supabase = getSupabaseAdmin();

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getMyPayments(
  userId: string,
  initData: string,
): Promise<ActionResult<SalaryPaymentWithUser[]>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };
    if (auth.id !== userId) return { success: false, error: "Нет доступа" };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("salary_payments")
      .select("*, users!inner(id, full_name, position)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true, data: (data ?? []) as SalaryPaymentWithUser[] };
  } catch (err) {
    console.error("[SALARY] getEmployees error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}
