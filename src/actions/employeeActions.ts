"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import type { ActionResult, User } from "@/types/database";

async function verifyAdmin(callerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", callerId)
    .single();
  if (!caller || caller.role !== "admin") return "Нет доступа";
  return null;
}

export async function getEmployees(): Promise<ActionResult<User[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("full_name");

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: (data ?? []) as User[] };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function addEmployee(
  telegramId: number,
  fullName: string,
  role: "employee" | "admin",
  position: string,
  hourlyRate: number,
  callerId: string,
): Promise<ActionResult<User>> {
  const adminError = await verifyAdmin(callerId);
  if (adminError) return { success: false, error: adminError };

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
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function updateEmployee(
  userId: string,
  fullName: string,
  position: string,
  hourlyRate: number,
  role?: "employee" | "admin",
  shiftStartTime?: string,
  callerId?: string,
  locationId?: string,
): Promise<ActionResult<void>> {
  if (callerId) {
    const adminError = await verifyAdmin(callerId);
    if (adminError) return { success: false, error: adminError };
  }

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

    if (role) updateData.role = role;
    if (shiftStartTime !== undefined) updateData.shift_start_time = shiftStartTime;
    if (locationId !== undefined) updateData.location_id = locationId || null;

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) return { success: false, error: "Ошибка сервера" };

    if (callerId) void logAction(callerId, "update_employee", "user", userId);

    return { success: true };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function deleteEmployee(userId: string, callerId: string): Promise<ActionResult<void>> {
  const adminError = await verifyAdmin(callerId);
  if (adminError) return { success: false, error: adminError };

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) return { success: false, error: "Ошибка сервера" };

    void logAction(callerId, "delete_employee", "user", userId);

    return { success: true };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}
