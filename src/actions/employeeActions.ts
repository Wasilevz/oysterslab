"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ActionResult, User } from "@/types/database";

export async function getEmployees(): Promise<ActionResult<User[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("full_name");

    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as User[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить сотрудников",
    };
  }
}

export async function addEmployee(
  telegramId: number,
  fullName: string,
  role: "employee" | "admin",
  position: string,
  hourlyRate: number,
): Promise<ActionResult<User>> {
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

    if (error) return { success: false, error: error.message };

    return { success: true, data: data as User };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось добавить сотрудника",
    };
  }
}

export async function updateEmployee(
  userId: string,
  position: string,
  hourlyRate: number,
): Promise<ActionResult<void>> {
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { success: false, error: "Укажите корректную ставку" };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("users")
      .update({
        position: position.trim() || null,
        hourly_rate: hourlyRate,
      })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось обновить сотрудника",
    };
  }
}

export async function deleteEmployee(userId: string): Promise<ActionResult<void>> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось удалить сотрудника",
    };
  }
}
