import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { validateQR, isIPAllowed } from "@/lib/location-auth";

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

function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

async function verifyLocation(
  request: Request,
  qrData: string | null,
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ allowed: boolean; error?: string }> {
  const { data: settings } = await supabase
    .from("location_settings")
    .select("allowed_ips, auth_mode")
    .single();

  const authMode = settings?.auth_mode ?? "qr";
  const allowedIPs = settings?.allowed_ips ?? [];
  const clientIP = getClientIP(request);

  if (qrData) {
    try {
      const parsed = JSON.parse(qrData) as { ts: number; nonce: string; sig: string };
      if (validateQR(parsed.ts, parsed.nonce, parsed.sig)) {
        return { allowed: true };
      }
    } catch { /* invalid QR */ }
  }

  if (authMode === "ip" && allowedIPs.length > 0) {
    if (isIPAllowed(clientIP, allowedIPs)) {
      return { allowed: true };
    }
    return { allowed: false, error: "Подключитесь к WiFi заведения" };
  }

  if (authMode === "qr" && !qrData) {
    return { allowed: false, error: "Отсканируйте QR-код" };
  }

  return { allowed: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, qrData } = body as {
      userId: string;
      action: "clockIn" | "clockOut";
      qrData?: string;
    };

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const location = await verifyLocation(request, qrData ?? null, supabase);
    if (!location.allowed) {
      return NextResponse.json({ error: location.error }, { status: 403 });
    }

    if (action === "clockIn") {
      const { data: active } = await supabase
        .from("shifts")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (active) {
        return NextResponse.json({ error: "Смена уже активна" }, { status: 409 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, shift });
    }

    if (action === "clockOut") {
      const { data: active, error: findError } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (findError) {
        return NextResponse.json({ error: findError.message }, { status: 500 });
      }

      if (!active) {
        return NextResponse.json({ error: "Нет активной смены" }, { status: 404 });
      }

      const clockOutTime = roundTo30(new Date());
      const clockIn = new Date(active.clock_in);
      const hoursWorked =
        Math.round(((clockOutTime.getTime() - clockIn.getTime()) / 3600000) * 100) / 100;

      const { data: shift, error } = await supabase
        .from("shifts")
        .update({
          clock_out: clockOutTime.toISOString(),
          status: "COMPLETED",
          hours_worked: hoursWorked,
        })
        .eq("id", active.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, shift });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
