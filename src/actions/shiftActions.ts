"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { isIPAllowed } from "@/lib/location-auth";
import { verifyRequestAuth, requireAdmin } from "@/lib/auth";
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
  initData?: string,
  clientIP?: string,
): Promise<ActionResult<Shift>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();

    const { data: activeShift, error: activeError } = await supabase
      .from("shifts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (activeError) {
      return { success: false, error: "Ошибка сервера" };
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

    if (authMode === "ip" && allowedIPs.length > 0 && clientIP) {
      if (!isIPAllowed(clientIP, allowedIPs)) {
        return { success: false, error: "Подключитесь к WiFi заведения" };
      }
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
      return { success: false, error: "Ошибка сервера" };
    }

    return { success: true, data: shift as Shift };
  } catch {
    return {
      success: false,
      error: "Не удалось начать смену",
    };
  }
}

export async function clockOut(
  userId: string,
  initData?: string,
  clientIP?: string,
): Promise<ActionResult<Shift>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();

    const { data: activeShift, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (findError) {
      return { success: false, error: "Ошибка сервера" };
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

    if (authMode === "ip" && allowedIPs.length > 0 && clientIP) {
      if (!isIPAllowed(clientIP, allowedIPs)) {
        return { success: false, error: "Подключитесь к WiFi заведения" };
      }
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
      return { success: false, error: "Ошибка сервера" };
    }

    return { success: true, data: shift as Shift };
  } catch {
    return {
      success: false,
      error: "Не удалось завершить смену",
    };
  }
}

export async function getMyShifts(
  userId: string,
  limit = 5,
  initData?: string,
): Promise<ActionResult<Shift[]>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "ACTIVE")
      .order("clock_in", { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: "Ошибка сервера" };
    }

    return { success: true, data: (data ?? []) as Shift[] };
  } catch {
    return {
      success: false,
      error: "Не удалось загрузить смены",
    };
  }
}

export async function getActiveShift(
  userId: string,
  initData?: string,
): Promise<ActionResult<Shift | null>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      return { success: false, error: "Ошибка сервера" };
    }

    return { success: true, data: (data as Shift | null) ?? null };
  } catch {
    return {
      success: false,
      error: "Не удалось загрузить активную смену",
    };
  }
}

export async function reviewAutoClosedShift(
  shiftId: string,
  hoursWorked: number,
  initData?: string,
): Promise<ActionResult<Shift>> {
  const authResult = await requireAdmin(initData ?? "");
  if ("error" in authResult) return { success: false, error: authResult.error };

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
      return { success: false, error: "Ошибка сервера" };
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
      return { success: false, error: "Ошибка сервера" };
    }

    return { success: true, data: updated as Shift };
  } catch {
    return {
      success: false,
      error: "Не удалось сохранить смену",
    };
  }
}

export async function editShift(
  shiftId: string,
  clockIn: string,
  clockOut: string | null,
  callerId: string,
): Promise<ActionResult<Shift>> {
  try {
    const adminError = await verifyAdmin(callerId);
    if (adminError) return { success: false, error: adminError };

    const supabase = getSupabaseAdmin();

    const { data: shift, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", shiftId)
      .maybeSingle();

    if (findError) return { success: false, error: "Ошибка сервера" };
    if (!shift) return { success: false, error: "Смена не найдена" };

    const clockInDate = new Date(clockIn);
    const clockOutDate = clockOut ? new Date(clockOut) : null;
    const hoursWorked = clockOutDate
      ? Math.round(((clockOutDate.getTime() - clockInDate.getTime()) / 3600000) * 100) / 100
      : null;

    const updateData: Record<string, unknown> = {
      clock_in: clockInDate.toISOString(),
    };

    if (clockOutDate) {
      updateData.clock_out = clockOutDate.toISOString();
      updateData.hours_worked = hoursWorked;
      if (shift.status === "ACTIVE") {
        updateData.status = "COMPLETED";
      }
    }

    const { data: updated, error } = await supabase
      .from("shifts")
      .update(updateData)
      .eq("id", shiftId)
      .select("*, users!inner(id, full_name, position)")
      .single();

    if (error) return { success: false, error: "Ошибка сервера" };

    void logAction(callerId, "edit_shift", "shift", shiftId, `clock_in: ${clockIn}, clock_out: ${clockOut}`);

    return { success: true, data: updated as Shift };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

async function verifyAdmin(callerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", callerId)
    .single();
  if (!caller || (caller.role !== "admin" && caller.role !== "superadmin")) return "Нет доступа";
  return null;
}

export async function getAllShifts(
  dateFrom?: string,
  dateTo?: string,
  initData?: string,
): Promise<ActionResult<(Shift & { users: { full_name: string; position: string | null } })[]>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("shifts")
      .select("*, users!inner(full_name, position)")
      .order("clock_in", { ascending: false });

    if (dateFrom) query = query.gte("clock_in", dateFrom + "T00:00:00Z");
    if (dateTo) query = query.lte("clock_in", dateTo + "T23:59:59Z");

    const { data, error } = await query.limit(100);

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: (data ?? []) as (Shift & { users: { full_name: string; position: string | null } })[] };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}
