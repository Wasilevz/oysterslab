"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ActionResult, Schedule, ScheduleType } from "@/types/database";

export async function getSchedule(
  year: number,
  month: number,
): Promise<ActionResult<Schedule[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date");

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: (data ?? []) as Schedule[] };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getMySchedule(
  userId: string,
  year: number,
  month: number,
): Promise<ActionResult<Schedule[]>> {
  try {
    const supabase = getSupabaseAdmin();

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date");

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: (data ?? []) as Schedule[] };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function setScheduleDay(
  userId: string,
  date: string,
  type: ScheduleType,
): Promise<ActionResult<void>> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("schedules")
      .upsert(
        { user_id: userId, date, type },
        { onConflict: "user_id,date" },
      );

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function setBulkWeekends(
  year: number,
  month: number,
  type: ScheduleType,
): Promise<ActionResult<number>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: employees } = await supabase
      .from("users")
      .select("id")
      .in("role", ["employee", "admin"]);

    if (!employees || employees.length === 0) {
      return { success: true, data: 0 };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const updates: { user_id: string; date: string; type: ScheduleType }[] = [];

    for (const emp of employees) {
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          updates.push({
            user_id: emp.id,
            date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            type,
          });
        }
      }
    }

    if (updates.length === 0) {
      return { success: true, data: 0 };
    }

    const { error } = await supabase
      .from("schedules")
      .upsert(updates, { onConflict: "user_id,date" });

    if (error) return { success: false, error: "Ошибка сервера" };

    return { success: true, data: updates.length };
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}

export async function getWorkingToday(): Promise<
  ActionResult<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>
> {
  try {
    const supabase = getSupabaseAdmin();

    const today = new Date().toISOString().split("T")[0];

    const { data: scheduleToday } = await supabase
      .from("schedules")
      .select("user_id")
      .eq("date", today)
      .eq("type", "work");

    const workUserIds = (scheduleToday ?? []).map((s) => s.user_id);

    if (workUserIds.length === 0) {
      return { success: true, data: [] };
    }

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
  } catch {
    return { success: false, error: "Ошибка сервера" };
  }
}
