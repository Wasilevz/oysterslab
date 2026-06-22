"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { generateQRData, validateQR, getClientIP, isIPAllowed } from "@/lib/location-auth";
import type { ActionResult } from "@/types/database";

export async function getQRCode(): Promise<ActionResult<{ qrString: string; expiresAt: number }>> {
  try {
    const { payload, signature } = generateQRData();
    const qrString = JSON.stringify({ ...payload, sig: signature });
    const expiresAt = (payload.ts + 60) * 1000;

    return { success: true, data: { qrString, expiresAt } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сгенерировать QR",
    };
  }
}

export async function verifyQRAuth(
  qrData: string,
): Promise<ActionResult<boolean>> {
  try {
    const parsed = JSON.parse(qrData) as {
      ts: number;
      nonce: string;
      sig: string;
    };

    const isValid = validateQR(parsed.ts, parsed.nonce, parsed.sig);
    return { success: true, data: isValid };
  } catch {
    return { success: true, data: false };
  }
}

export async function checkIPAuth(
  request: Request,
): Promise<ActionResult<{ allowed: boolean; ip: string }>> {
  try {
    const supabase = getSupabaseAdmin();
    const clientIP = getClientIP(request);

    const { data: settings } = await supabase
      .from("location_settings")
      .select("allowed_ips")
      .single();

    if (!settings || !settings.allowed_ips || settings.allowed_ips.length === 0) {
      return { success: true, data: { allowed: true, ip: clientIP } };
    }

    const allowed = isIPAllowed(clientIP, settings.allowed_ips);
    return { success: true, data: { allowed, ip: clientIP } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка проверки IP",
    };
  }
}

export async function verifyLocation(
  qrData: string | null,
  request: Request,
): Promise<ActionResult<{ allowed: boolean; method: string }>> {
  if (qrData) {
    const qrResult = await verifyQRAuth(qrData);
    if (qrResult.success && qrResult.data) {
      return { success: true, data: { allowed: true, method: "qr" } };
    }
  }

  const ipResult = await checkIPAuth(request);
  if (ipResult.success && ipResult.data) {
    if (ipResult.data.allowed) {
      return { success: true, data: { allowed: true, method: "ip" } };
    }
    return {
      success: true,
      data: { allowed: false, method: "none" },
    };
  }

  return { success: true, data: { allowed: true, method: "fallback" } };
}

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
        data: { allowedIPs: [], authMode: "qr" },
      };
    }

    return {
      success: true,
      data: {
        allowedIPs: data.allowed_ips ?? [],
        authMode: data.auth_mode ?? "qr",
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
