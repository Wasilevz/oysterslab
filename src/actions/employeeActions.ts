"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ActionResult, User } from "@/types/database";

export async function getEmployees(): Promise<ActionResult<User[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "employee")
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
