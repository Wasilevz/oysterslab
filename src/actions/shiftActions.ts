"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ActionResult, Shift } from "@/types/database";

export async function clockIn(
  userId: string,
): Promise<ActionResult<Shift>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: activeShift, error: activeError } = await supabase
      .from("shifts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (activeError) {
      return { success: false, error: activeError.message };
    }

    if (activeShift) {
      return { success: false, error: "Смена уже активна" };
    }

    const { data: shift, error } = await supabase
      .from("shifts")
      .insert({
        user_id: userId,
        clock_in: new Date().toISOString(),
        status: "ACTIVE",
      })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: shift as Shift };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось начать смену",
    };
  }
}

export async function clockOut(
  userId: string,
): Promise<ActionResult<Shift>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: activeShift, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (findError) {
      return { success: false, error: findError.message };
    }

    if (!activeShift) {
      return { success: false, error: "Нет активной смены" };
    }

    const clockOut = new Date();
    const clockIn = new Date(activeShift.clock_in);
    const hoursWorked =
      Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) /
      100;

    const { data: shift, error } = await supabase
      .from("shifts")
      .update({
        clock_out: clockOut.toISOString(),
        status: "COMPLETED",
        hours_worked: hoursWorked,
      })
      .eq("id", activeShift.id)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: shift as Shift };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось завершить смену",
    };
  }
}

export async function getMyShifts(
  userId: string,
  limit = 5,
): Promise<ActionResult<Shift[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "ACTIVE")
      .order("clock_in", { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data ?? []) as Shift[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить смены",
    };
  }
}

export async function getActiveShift(
  userId: string,
): Promise<ActionResult<Shift | null>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as Shift | null) ?? null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Не удалось загрузить активную смену",
    };
  }
}

export async function reviewAutoClosedShift(
  shiftId: string,
  hoursWorked: number,
): Promise<ActionResult<Shift>> {
  if (!Number.isFinite(hoursWorked) || hoursWorked <= 0 || hoursWorked > 24) {
    return {
      success: false,
      error: "Укажите корректное количество часов (0–24)",
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: shift, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", shiftId)
      .eq("status", "AUTO_CLOSED")
      .maybeSingle();

    if (findError) {
      return { success: false, error: findError.message };
    }

    if (!shift) {
      return { success: false, error: "Смена не найдена или уже обработана" };
    }

    const { data: updated, error } = await supabase
      .from("shifts")
      .update({
        hours_worked: Math.round(hoursWorked * 100) / 100,
        status: "REVIEWED",
      })
      .eq("id", shiftId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updated as Shift };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Не удалось сохранить смену",
    };
  }
}
