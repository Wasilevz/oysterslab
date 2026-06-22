import { NextResponse } from "next/server";

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
  const ip = getClientIP(request);
  return NextResponse.json({ ip });
}
