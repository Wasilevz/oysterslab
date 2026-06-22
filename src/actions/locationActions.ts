"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ActionResult } from "@/types/database";

export async function getLocationSettings(): Promise<
  ActionResult<{ allowedIPs: string[]; authMode: string }>
> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("location_settings")
      .select("allowed_ips, auth_mode")
      .single();

    if (error || !data) {
      return {
        success: true,
        data: { allowedIPs: [], authMode: "ip" },
      };
    }

    return {
      success: true,
      data: {
        allowedIPs: data.allowed_ips ?? [],
        authMode: data.auth_mode ?? "ip",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить настройки",
    };
  }
}

export async function saveLocationSettings(
  allowedIPs: string[],
  authMode: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("location_settings")
      .upsert(
        { id: 1, allowed_ips: allowedIPs, auth_mode: authMode },
        { onConflict: "id" },
      );

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сохранить настройки",
    };
  }
}
