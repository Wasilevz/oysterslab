"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ActionResult, Shift } from "@/types/database";

function roundTo30(date: Date): Date {
  const rounded = new Date(date);
  const m = rounded.getMinutes();
  if (m >= 0 && m <= 15) {
    rounded.setMinutes(0, 0, 0);
  } else if (m >= 16 && m <= 30) {
    rounded.setMinutes(30, 0, 0);
  } else if (m >= 31 && m <= 45) {
    rounded.setMinutes(30, 0, 0);
  } else {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  }
  return rounded;
}

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

    const { data: settings } = await supabase
      .from("location_settings")
      .select("allowed_ips, auth_mode")
      .single();

    const authMode = settings?.auth_mode ?? "ip";
    const allowedIPs = settings?.allowed_ips ?? [];

    if (authMode === "ip" && allowedIPs.length > 0) {
      return { success: false, error: "Подключитесь к WiFi заведения" };
    }

    const clockInTime = roundTo30(new Date());
    const { data: shift, error } = await supabase
      .from("shifts")
      .insert({
        user_id: userId,
        clock_in: clockInTime.toISOString(),
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

    const { data: settings } = await supabase
      .from("location_settings")
      .select("allowed_ips, auth_mode")
      .single();

    const authMode = settings?.auth_mode ?? "ip";
    const allowedIPs = settings?.allowed_ips ?? [];

    if (authMode === "ip" && allowedIPs.length > 0) {
      return { success: false, error: "Подключитесь к WiFi заведения" };
    }

    const clockOutTime = roundTo30(new Date());
    const clockIn = new Date(activeShift.clock_in);
    const hoursWorked =
      Math.round(((clockOutTime.getTime() - clockIn.getTime()) / 3600000) * 100) /
      100;

    const { data: shift, error } = await supabase
      .from("shifts")
      .update({
        clock_out: clockOutTime.toISOString(),
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
