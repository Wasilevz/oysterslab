import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isIPAllowed } from "@/lib/location-auth";
import { verifyRequestAuth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

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
    let ip = forwarded.split(",")[0].trim();
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);
    return ip;
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    let ip = realIP;
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);
    return ip;
  }
  return "unknown";
}

export async function POST(request: Request) {
  try {
    const reqIP = getClientIP(request);
    const { allowed } = checkRateLimit(`clock:${reqIP}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: "Слишком много запросов. Подождите минуту." }, { status: 429 });
    }

    const body = await request.json();
    const { userId, action, initData } = body as {
      userId: string;
      action: "clockIn" | "clockOut";
      initData?: string;
    };

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Некорректный userId" }, { status: 400 });
    }

    if (!initData) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const authUser = await verifyRequestAuth(initData);
    if (!authUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (authUser.id !== userId && authUser.role !== "admin") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    const { data: settings } = await supabase
      .from("location_settings")
      .select("allowed_ips, auth_mode")
      .single();

    const authMode = settings?.auth_mode ?? "ip";
    const allowedIPs = settings?.allowed_ips ?? [];
    const clientIP = getClientIP(request);

    if (authMode === "ip" && allowedIPs.length > 0) {
      if (!isIPAllowed(clientIP, allowedIPs)) {
        return NextResponse.json(
          { error: "Подключитесь к WiFi заведения" },
          { status: 403 },
        );
      }
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
        return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
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
        return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
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
        return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
      }

      return NextResponse.json({ success: true, shift });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
