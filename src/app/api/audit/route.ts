import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const initData = request.headers.get("x-telegram-initdata") || authHeader?.replace("Bearer ", "") || "";
    const authResult = await requireAdmin(initData);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

    const logs = await getAuditLogs(limit, offset);
    return NextResponse.json({ ok: true, logs });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
