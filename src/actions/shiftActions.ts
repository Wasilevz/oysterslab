"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { verifyRequestAuth, requireAdmin } from "@/lib/auth";
import { roundTo30 } from "@/lib/utils";
import type { ActionResult, Shift } from "@/types/database";

export async function clockIn(
  initData: string,
): Promise<ActionResult<Shift>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };
    const userId = auth.id;

    const supabase = getSupabaseAdmin();

    const { data: activeShifts, error: activeError } = await supabase
      .from("shifts")
      .select("id, clock_in")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("clock_in", { ascending: false });

    if (activeError) {
      console.error("[SHIFT] check active error:", activeError.message);
      return { success: false, error: `Проверка смены: ${activeError.message}` };
    }

    if (activeShifts && activeShifts.length > 0) {
      const latest = activeShifts[0]!;
      const clockInTime = roundTo30(new Date());
      const hoursWorked = Math.round(((clockInTime.getTime() - new Date(latest.clock_in).getTime()) / 3600000) * 100) / 100;

      for (const s of activeShifts) {
        await supabase
          .from("shifts")
          .update({
            clock_out: clockInTime.toISOString(),
            status: "AUTO_CLOSED",
            hours_worked: hoursWorked,
          })
          .eq("id", s.id);
      }

      return { success: false, error: "Смена уже активна (дубли закрыты)" };
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
      console.error("[SHIFT] insert error:", error.message, error.code);
      return { success: false, error: `Создание смены: ${error.message}` };
    }

    return { success: true, data: shift as Shift };
  } catch (err) {
    console.error("[SHIFT] clockIn exception:", err);
    return { success: false, error: `Исключение: ${String(err)}` };
  }
}

export async function clockOut(
  initData: string,
): Promise<ActionResult<Shift>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };
    const userId = auth.id;

    const supabase = getSupabaseAdmin();

    const { data: activeShifts, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("clock_in", { ascending: false });

    if (findError) {
      return { success: false, error: `Поиск смены: ${findError.message}` };
    }

    if (!activeShifts || activeShifts.length === 0) {
      return { success: false, error: "Нет активной смены" };
    }

    const activeShift = activeShifts[0]!;
    const clockOutTime = roundTo30(new Date());
    const clockIn = new Date(activeShift.clock_in);
    const hoursWorked =
      Math.round(((clockOutTime.getTime() - clockIn.getTime()) / 3600000) * 100) / 100;

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
      return { success: false, error: `Закрытие смены: ${error.message}` };
    }

    return { success: true, data: shift as Shift };
  } catch (err) {
    console.error("[SHIFT] clockOut exception:", err);
    return { success: false, error: `Исключение: ${String(err)}` };
  }
}

export async function deleteShift(
  shiftId: string,
  initData?: string,
): Promise<ActionResult<void>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", shiftId);

    if (error) return { success: false, error: `Удаление: ${error.message}` };
    return { success: true };
  } catch (err) {
    console.error("[SHIFT] deleteShift error:", err);
    return { success: false, error: String(err) };
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
    if (auth.id !== userId) return { success: false, error: "Нет доступа" };

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
  } catch (err) {
    console.error("[SHIFT] getMyShifts error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getActiveShift(
  userId: string,
  initData?: string,
): Promise<ActionResult<Shift | null>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };
    if (auth.id !== userId) return { success: false, error: "Нет доступа" };

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: "Ошибка сервера" };
    }

    return { success: true, data: (data as Shift | null) ?? null };
  } catch (err) {
    console.error("[SHIFT] getActiveShift error:", err);
    return { success: false, error: "Ошибка сервера" };
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
  } catch (err) {
    console.error("[SHIFT] reviewAutoClosedShift error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function editShift(
  shiftId: string,
  clockIn: string,
  clockOut: string | null,
  initData: string,
): Promise<ActionResult<Shift>> {
  try {
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) return { success: false, error: authResult.error };
    const callerId = authResult.user.id;

    const supabase = getSupabaseAdmin();

    const { data: shift, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", shiftId)
      .maybeSingle();

    if (findError) return { success: false, error: "Ошибка сервера" };
    if (!shift) return { success: false, error: "Смена не найдена" };

    const clockInDate = new Date(clockIn);
    if (!Number.isFinite(clockInDate.getTime())) {
      return { success: false, error: "Некорректная дата начала" };
    }
    const clockOutDate = clockOut ? new Date(clockOut) : null;
    if (clockOut && clockOutDate && !Number.isFinite(clockOutDate.getTime())) {
      return { success: false, error: "Некорректная дата окончания" };
    }
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
  } catch (err) {
    console.error("[SHIFT] editShift error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
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
  } catch (err) {
    console.error("[SHIFT] getAllShifts error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}
