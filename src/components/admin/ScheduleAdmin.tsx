"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ro, ru } from "date-fns/locale";
import { getSchedule, saveSchedule, getWorkingToday } from "@/actions/scheduleActions";
import { getEmployees } from "@/actions/employeeActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import { hapticImpact } from "@/lib/haptic";
import { TYPE_COLORS } from "@/lib/schedule-constants";
import { getWeekStart, getWeekDays, toDateStr, getScheduleTypeForDay } from "@/lib/schedule-helpers";
import type { ScheduleType, User } from "@/types/database";
import type { Schedule } from "@/types/database";

const TYPE_ORDER: ScheduleType[] = ["work", "off", "vacation", "sick"];

export function ScheduleAdmin({ onBack }: { onBack?: () => void }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "ro" ? ro : ru;
  const initData = useUserStore((s) => s.initData);
  const [employees, setEmployees] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workingToday, setWorkingToday] = useState<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Map<string, ScheduleType>>(new Map());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
  const cachedMonth = useRef<string>("");
  const touchStartX = useRef(0);
  const schedulesRef = useRef<Schedule[]>([]);
  schedulesRef.current = schedules;

  const weekDays = getWeekDays(weekStart);

  const fetchMonth = useCallback(async (force = false) => {
    const first = getWeekDays(weekStart)[0]!;
    const last = getWeekDays(weekStart)[6]!;
    const monthsToFetch = new Set<string>();
    monthsToFetch.add(`${first.getFullYear()}-${first.getMonth() + 1}`);
    if (last.getMonth() !== first.getMonth()) {
      monthsToFetch.add(`${last.getFullYear()}-${last.getMonth() + 1}`);
    }
    const monthKey = Array.from(monthsToFetch).sort().join(",");
    if (!force && cachedMonth.current === monthKey) return;

    console.log("[FETCH] loading months:", monthKey, "force:", force);
    const allData: Schedule[] = [];
    for (const mk of monthsToFetch) {
      const parts = mk.split("-").map(Number);
      const res = await getSchedule(parts[0]!, parts[1]!, initData ?? "");
      console.log("[FETCH] month", mk, "->", res.success ? `${res.data?.length ?? 0} rows` : `FAIL: ${res.error}`);
      if (res.success && res.data) allData.push(...res.data);
    }
    console.log("[FETCH] total rows:", allData.length);
    setSchedules(allData);
    cachedMonth.current = monthKey;
  }, [weekStart, initData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [empRes, todayRes] = await Promise.all([
        getEmployees(initData ?? ""),
        getWorkingToday(initData ?? ""),
      ]);
      if (cancelled) return;
      if (empRes.success && empRes.data) setEmployees(empRes.data);
      if (todayRes.success && todayRes.data) setWorkingToday(todayRes.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [initData]);

  useEffect(() => {
    void fetchMonth();
  }, [fetchMonth]);

  const dirtyKey = (uid: string, d: string) => `${uid}|${d}`;

  const cycleType = (userId: string, date: Date) => {
    hapticImpact("light");
    const dateStr = toDateStr(date);
    const key = dirtyKey(userId, dateStr);
    const currentFromDirty = dirty.get(key);
    const currentType = currentFromDirty ?? getScheduleTypeForDay(schedules, userId, dateStr);
    const idx = TYPE_ORDER.indexOf(currentType);
    const next = TYPE_ORDER[(idx + 1) % TYPE_ORDER.length]!;

    setSchedules((prev) => {
      const filtered = prev.filter((s) => !(s.user_id === userId && s.date === dateStr));
      return [...filtered, { id: "temp", user_id: userId, date: dateStr, type: next, created_at: "" }];
    });

    setDirty((prev) => {
      const nextMap = new Map(prev);
      const currentInDirty = prev.get(key);
      if (currentInDirty === next) {
        nextMap.delete(key);
      } else {
        nextMap.set(key, next);
      }
      return nextMap;
    });
  };

  const saveAll = async () => {
    if (dirty.size === 0) return;
    hapticImpact("medium");
    setSaving(true);

    const entries = Array.from(dirty.entries()).map(([k, type]) => {
      const [userId, date] = k.split("|");
      return { userId: userId!, date: date!, type };
    });

    const res = await saveSchedule(entries, initData ?? "");
    if (res.success) {
      hapticImpact("heavy");
      setDirty(new Map());
      setMsg(t("schedule.saved"));
      setMsgType("ok");
      cachedMonth.current = "";
      await fetchMonth(true);
    } else {
      setMsg(res.error ?? "Ошибка");
      setMsgType("err");
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 8000);
  };

  const prevWeek = () => { hapticImpact("light"); const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { hapticImpact("light"); const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToThisWeek = () => { hapticImpact("light"); setWeekStart(getWeekStart(new Date())); };

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();
  const dayLabels = [t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri"), t("day.sat"), t("day.sun")];
  const todayStr = toDateStr(new Date());

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border-color)] px-4 py-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
              {t("schedule.subtitle")}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{t("schedule.title")}</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {format(weekDays[0]!, "d MMM", { locale: dateLocale })} – {format(weekDays[6]!, "d MMM", { locale: dateLocale })}
            </p>
            {!isCurrentWeek && (
              <button onClick={goToThisWeek} className="mt-1.5 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 px-4 py-2.5 text-xs font-bold text-[var(--brand-primary)] transition-all active:scale-95 hover:bg-[var(--brand-primary)]/20">
                ← {t("schedule.thisWeek")}
              </button>
            )}
          </div>
          <button onClick={nextWeek} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {(["work", "off", "vacation", "sick"] as const).map((type) => (
            <span key={type} className="flex items-center gap-1 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[type].dot}`} />
              <span className={TYPE_COLORS[type].text}>{t(`schedule.${type}`)}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex-1 px-4 pb-24"
        onTouchStart={(e) => { touchStartX.current = e.touches[0]!.clientX; }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0]!.clientX - touchStartX.current;
          if (Math.abs(diff) > 80) { diff > 0 ? prevWeek() : nextWeek(); }
        }}
      >
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[var(--bg-surface)] p-2 text-left text-xs font-medium text-[var(--text-secondary)] min-w-[90px]">
                  {t("payroll.employee")}
                </th>
                {weekDays.map((day, i) => {
                  const isToday = toDateStr(day) === todayStr;
                  return (
                    <th key={i} className="p-1.5 text-center">
                      <div className={`text-xs font-medium ${isToday ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-secondary)]"}`}>
                        {dayLabels[i]}
                      </div>
                      <div className={`text-[13px] font-bold ${isToday ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-[var(--border-color)]">
                  <td className="sticky left-0 z-20 bg-[var(--bg-surface)] py-2 pr-2 min-w-[90px]">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{emp.full_name}</p>
                    {emp.position && (
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">{emp.position}</p>
                    )}
                  </td>
                  {weekDays.map((day, i) => {
                    const dateStr = toDateStr(day);
                    const key = dirtyKey(emp.id, dateStr);
                    const type = dirty.get(key) ?? getScheduleTypeForDay(schedules, emp.id, dateStr);
                    const colors = TYPE_COLORS[type];
                    const isToday = dateStr === todayStr;
                    const isDirty = dirty.has(key);
                    return (
                      <td key={i} className="p-0.5">
                        <button
                          onClick={() => cycleType(emp.id, day)}
                          aria-label={`${emp.full_name}, ${dayLabels[i]} ${day.getDate()}, ${t(`schedule.${type}`)}`}
                          className={`h-11 w-full rounded-xl text-xs font-bold transition-all active:scale-95 ${colors.bg} ${colors.text} ${isToday ? "ring-1 ring-[var(--brand-primary)]/30" : ""} ${isDirty ? "ring-2 ring-amber-400" : ""}`}
                        >
                          {type === "work" ? t("schedule.abbrWork") : type === "off" ? t("schedule.abbrOff") : type === "vacation" ? t("schedule.abbrVacation") : t("schedule.abbrSick")}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dirty.size > 0 && (
        <div className="sticky bottom-0 border-t border-[var(--border-color)] bg-[var(--bg-app)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-500">{t("schedule.unsaved")} ({dirty.size})</span>
            <button
              onClick={saveAll}
              disabled={saving}
              className="rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? t("schedule.saving") : t("schedule.save")}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`mx-4 mb-3 rounded-xl border px-4 py-3 text-sm font-medium ${msgType === "ok" ? "border-green-500/30 bg-green-500/10 text-green-600" : "border-red-500/30 bg-red-500/10 text-red-500"}`}>
          {msg}
        </div>
      )}

      {workingToday.length > 0 && (
        <div className="border-t border-[var(--border-color)] px-4 pt-4 pb-24">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            {t("schedule.todayOnShift")}
          </h2>
          <div className="space-y-2">
            {workingToday.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{w.full_name}</p>
                  {w.position && <p className="text-xs text-[var(--text-secondary)]">{w.position}</p>}
                </div>
                {w.clock_in ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                    </span>
                    <span className="text-xs text-[var(--brand-primary)]">{t("shift.onShift")}</span>
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">{t("schedule.notArrived")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
