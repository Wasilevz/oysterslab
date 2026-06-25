import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/auth";

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

export async function GET(request: Request) {
  const initData = request.headers.get("x-telegram-initdata") || "";
  const authResult = await requireAdmin(initData);
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const ip = getClientIP(request);
  const { allowed } = checkRateLimit(`myip:${ip}`, 5, 60000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }
  return NextResponse.json({ ip });
}
