"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, Fine, FineWithUser } from "@/types/database";

export async function getFines(
  periodStart?: string,
  periodEnd?: string,
  initData?: string,
): Promise<ActionResult<FineWithUser[]>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("fines")
      .select("*, users!inner(id, full_name, position)")
      .order("created_at", { ascending: false });

    if (periodStart) query = query.gte("period_start", periodStart);
    if (periodEnd) query = query.lte("period_end", periodEnd);

    const { data, error } = await query;

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: (data ?? []) as FineWithUser[] };
  } catch {
    return {
      success: false,
      error: "Не удалось загрузить штрафы",
    };
  }
}

export async function getFinesForPeriod(
  periodStart: string,
  periodEnd: string,
  initData?: string,
): Promise<ActionResult<FineWithUser[]>> {
  return getFines(periodStart, periodEnd, initData);
}

export async function addFine(
  userId: string,
  amount: number,
  reason: string,
  periodStart: string,
  periodEnd: string,
  initData?: string,
): Promise<ActionResult<Fine>> {
  const authResult = await requireAdmin(initData ?? "");
  if ("error" in authResult) return { success: false, error: authResult.error };

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Укажите корректную сумму штрафа" };
  }
  if (!reason.trim()) {
    return { success: false, error: "Укажите причину штрафа" };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("fines")
      .insert({
        user_id: userId,
        amount: Math.round(amount * 100) / 100,
        reason: reason.trim(),
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select("*")
      .single();

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: data as Fine };
  } catch {
    return {
      success: false,
      error: "Не удалось добавить штраф",
    };
  }
}

export async function deleteFine(fineId: string, initData?: string): Promise<ActionResult<void>> {
  const authResult = await requireAdmin(initData ?? "");
  if ("error" in authResult) return { success: false, error: authResult.error };

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("fines").delete().eq("id", fineId);

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Не удалось удалить штраф",
    };
  }
}

export async function getTotalFinesForPeriod(
  periodStart: string,
  periodEnd: string,
  initData?: string,
): Promise<ActionResult<number>> {
  const authResult = await requireAdmin(initData ?? "");
  if ("error" in authResult) return { success: false, error: authResult.error };

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("fines")
      .select("amount")
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd);

    if (error) return { success: false, error: "Ошибка сервера" };

    const total = (data ?? []).reduce((sum, f) => sum + Number(f.amount), 0);
    return { success: true, data: Math.round(total * 100) / 100 };
  } catch {
    return {
      success: false,
      error: "Не удалось посчитать штрафы",
    };
  }
}
