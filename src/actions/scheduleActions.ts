"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyRequestAuth } from "@/lib/auth";
import type { ActionResult, Schedule, ScheduleType, User } from "@/types/database";

export async function getSchedule(
  year: number,
  month: number,
  initData?: string,
): Promise<ActionResult<Schedule[]>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();
    const pad = (n: number) => String(n).padStart(2, "0");
    const start = `${year}-${pad(month)}-01`;
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    const end = `${nextY}-${pad(nextM)}-01`;

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("date", start)
      .lt("date", end)
      .order("date");

    if (error) {
      console.error("[SCHEDULE] getSchedule error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data ?? []) as Schedule[] };
  } catch (err) {
    console.error("[SCHEDULE] getSchedule exception:", err);
    return { success: false, error: String(err) };
  }
}

export async function saveSchedule(
  entries: { userId: string; date: string; type: ScheduleType }[],
  initData?: string,
): Promise<ActionResult<number>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    if (entries.length === 0) return { success: true, data: 0 };

    const supabase = getSupabaseAdmin();

    for (const e of entries) {
      const { error: delErr } = await supabase
        .from("schedules")
        .delete()
        .eq("user_id", e.userId)
        .eq("date", e.date);
      if (delErr) {
        console.error("[SCHEDULE] delete error:", e.userId, e.date, delErr.message);
        return { success: false, error: `Ошибка удаления: ${delErr.message}` };
      }
    }

    const rows = entries.map((e) => ({
      user_id: e.userId,
      date: e.date,
      type: e.type,
    }));

    const { error, data } = await supabase
      .from("schedules")
      .insert(rows)
      .select();

    if (error) {
      console.error("[SCHEDULE] insert error:", error.message, error.code);
      return { success: false, error: `Ошибка записи: ${error.message}` };
    }

    if (!data || data.length !== rows.length) {
      console.error("[SCHEDULE] partial insert:", data?.length, "of", rows.length);
      return { success: false, error: `Записано ${data?.length ?? 0} из ${rows.length}` };
    }

    return { success: true, data: data.length };
  } catch (err) {
    console.error("[SCHEDULE] saveSchedule exception:", err);
    return { success: false, error: String(err) };
  }
}

export async function getWorkingToday(
  initData?: string,
): Promise<
  ActionResult<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>
> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Chisinau" });

    const { data: scheduleToday } = await supabase
      .from("schedules")
      .select("user_id")
      .eq("date", today)
      .eq("type", "work");

    const workUserIds = (scheduleToday ?? []).map((s) => s.user_id);
    if (workUserIds.length === 0) return { success: true, data: [] };

    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, position")
      .in("id", workUserIds);

    const { data: activeShifts } = await supabase
      .from("shifts")
      .select("user_id, clock_in")
      .eq("status", "ACTIVE")
      .in("user_id", workUserIds);

    const activeMap = new Map(
      (activeShifts ?? []).map((s) => [s.user_id, s.clock_in]),
    );

    const result = (users ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      position: u.position,
      clock_in: activeMap.get(u.id) ?? null,
    }));

    return { success: true, data: result };
  } catch (err) {
    console.error("[SCHEDULE] getWorkingToday error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getColleagues(
  initData?: string,
): Promise<ActionResult<Pick<User, "id" | "full_name" | "position">[]>> {
  try {
    const auth = await verifyRequestAuth(initData ?? "");
    if (!auth) return { success: false, error: "Не авторизован" };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, position")
      .in("role", ["employee", "admin"])
      .order("full_name");

    if (error) return { success: false, error: "Ошибка сервера" };
    return { success: true, data: (data ?? []) };
  } catch (err) {
    console.error("[SCHEDULE] getColleagues error:", err);
    return { success: false, error: "Ошибка сервера" };
  }
}
