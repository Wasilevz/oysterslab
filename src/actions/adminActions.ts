"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  ActionResult,
  DashboardStats,
  Payroll,
} from "@/types/database";

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const supabase = getSupabaseAdmin();

    const [activeResult, autoClosedResult, payrollsResult] =
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
      ]);

    if (activeResult.error) {
      return { success: false, error: activeResult.error.message };
    }

    if (autoClosedResult.error) {
      return { success: false, error: autoClosedResult.error.message };
    }

    if (payrollsResult.error) {
      return { success: false, error: payrollsResult.error.message };
    }

    const activeShifts = (activeResult.data ?? []).map((row) => {
      const { users, ...shift } = row;
      return {
        shift,
        user: users as { id: string; full_name: string },
      };
    });

    return {
      success: true,
      data: {
        activeShifts,
        autoClosedShifts: autoClosedResult.data ?? [],
        draftPayrolls: payrollsResult.data ?? [],
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Не удалось загрузить данные дашборда",
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

    if (findError) {
      return { success: false, error: findError.message };
    }

    if (!payroll) {
      return {
        success: false,
        error: "Ведомость не найдена или уже утверждена",
      };
    }

    const { data: updated, error } = await supabase
      .from("payrolls")
      .update({ status: "APPROVED" })
      .eq("id", payrollId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updated as Payroll };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Не удалось утвердить ведомость",
    };
  }
}
