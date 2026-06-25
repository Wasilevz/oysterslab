"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin, verifyRequestAuth } from "@/lib/auth";
import type { ActionResult, Location } from "@/types/database";

// === Multi-location management ===

export async function getLocations(
  initData?: string,
): Promise<ActionResult<Location[]>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name");

    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true, data: (data ?? []) as Location[] };
  } catch (err) {
    console.error("[LOCATION] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function addLocation(
  name: string,
  address: string,
  initData: string,
): Promise<ActionResult<Location>> {
  if (!name.trim()) return { success: false, error: "Введите название" };

  try {
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("locations")
      .insert({ name: name.trim(), address: address.trim() || null })
      .select("*")
      .single();

    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true, data: data as Location };
  } catch (err) {
    console.error("[LOCATION] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function deleteLocation(
  locationId: string,
  initData: string,
): Promise<ActionResult<void>> {
  try {
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId);

    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true };
  } catch (err) {
    console.error("[LOCATION] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function updateLocation(
  locationId: string,
  name: string,
  address: string,
  initData: string,
): Promise<ActionResult<void>> {
  if (!name.trim()) return { success: false, error: "Введите название" };

  try {
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("locations")
      .update({ name: name.trim(), address: address.trim() || null })
      .eq("id", locationId);

    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true };
  } catch (err) {
    console.error("[LOCATION] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

// === IP location settings ===

export async function getLocationSettings(
  initData?: string,
): Promise<
  ActionResult<{ allowedIPs: string[]; authMode: string }>
> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

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
    console.error("[LOCATION] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function saveLocationSettings(
  allowedIPs: string[],
  authMode: string,
  initData?: string,
): Promise<ActionResult<void>> {
  try {
    const authResult = await requireAdmin(initData ?? "");
    if ("error" in authResult) return { success: false, error: authResult.error };

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("location_settings")
      .upsert(
        { id: 1, allowed_ips: allowedIPs, auth_mode: authMode },
        { onConflict: "id" },
      );

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true };
  } catch (err) {
    console.error("[LOCATION] error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}
