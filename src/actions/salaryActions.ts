"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  ActionResult,
  SalaryPayment,
  SalaryPaymentWithUser,
  SalaryStats,
} from "@/types/database";

export async function getSalaryStats(): Promise<ActionResult<SalaryStats>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: payments, error } = await supabase
      .from("salary_payments")
      .select("*, users!inner(id, full_name)")
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

export async function generateSalaryForPeriod(
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<number>> {
  try {
    const supabase = getSupabaseAdmin();

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
