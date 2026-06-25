"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { getAdminLocationId } from "@/lib/admin-location";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, User } from "@/types/database";

export async function getEmployees(initData?: string): Promise<ActionResult<User[]>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();
    const locationId = await getAdminLocationId(authResult.user.id);

    let query = supabase
      .from("users")
      .select("*")
      .in("role", ["employee", "admin"])
      .order("full_name");

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: (data ?? []) as User[] };
  } catch (err) {
    console.error("[EMPLOYEE] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function addEmployee(
  telegramId: number,
  fullName: string,
  role: "employee" | "admin",
  position: string,
  hourlyRate: number,
  initData: string,
): Promise<ActionResult<User>> {
  const authResult = await requireAdmin(initData);
  if ("error" in authResult) return { success: false, error: authResult.error };
  const callerId = authResult.user.id;

  if (!fullName.trim()) {
    return { success: false, error: "Введите имя сотрудника" };
  }
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { success: false, error: "Укажите корректную ставку" };
  }
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    return { success: false, error: "Укажите корректный Telegram ID" };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", String(telegramId))
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Сотрудник с таким Telegram ID уже существует" };
    }

    const { data, error } = await supabase
      .from("users")
      .insert({
        telegram_id: telegramId,
        full_name: fullName.trim(),
        role,
        position: position.trim() || null,
        hourly_rate: hourlyRate,
      })
      .select("*")
      .single();

    if (error) return { success: false, error: "Ошибка сервера" };

    void logAction(callerId, "add_employee", "user", data?.id, `${fullName} (${role})`);

    return { success: true, data: data as User };
  } catch (err) {
    console.error("[EMPLOYEE] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function updateEmployee(
  userId: string,
  fullName: string,
  position: string,
  hourlyRate: number,
  initData: string,
  role?: "employee" | "admin",
  shiftStartTime?: string,
  locationId?: string,
): Promise<ActionResult<void>> {
  const authResult = await requireAdmin(initData);
  if ("error" in authResult) return { success: false, error: authResult.error };
  const callerId = authResult.user.id;

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { success: false, error: "Укажите корректную ставку" };
  }
  if (!fullName.trim()) {
    return { success: false, error: "Введите имя сотрудника" };
  }

  try {
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {
      full_name: fullName.trim(),
      position: position.trim() || null,
      hourly_rate: hourlyRate,
    };

    if (role) {
      const { data: caller } = await supabase
        .from("users")
        .select("role")
        .eq("id", callerId)
        .single();
      if (caller?.role !== "superadmin") {
        return { success: false, error: "Только суперадмин может менять роли" };
      }
      updateData.role = role;
    }
    if (shiftStartTime !== undefined) updateData.shift_start_time = shiftStartTime;
    if (locationId !== undefined) updateData.location_id = locationId || null;

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) return { success: false, error: "Ошибка сервера" };

    void logAction(callerId, "update_employee", "user", userId);

    return { success: true };
  } catch (err) {
    console.error("[EMPLOYEE] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function deleteEmployee(userId: string, initData: string): Promise<ActionResult<void>> {
  const authResult = await requireAdmin(initData);
  if ("error" in authResult) return { success: false, error: authResult.error };
  const callerId = authResult.user.id;

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) return { success: false, error: "Ошибка сервера" };

    void logAction(callerId, "delete_employee", "user", userId);

    return { success: true };
  } catch (err) {
    console.error("[EMPLOYEE] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}
