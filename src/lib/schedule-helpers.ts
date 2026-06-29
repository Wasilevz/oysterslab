import type { Schedule, ScheduleType } from "@/types/database";

export function getScheduleTypeForDay(schedules: Schedule[], userId: string, dateStr: string): ScheduleType {
  const entry = schedules.find((s) => s.user_id === userId && s.date === dateStr);
  return entry?.type ?? "work";
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getMonthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const weeks: Date[][] = [];
  let current = getWeekStart(firstDay);

  while (current <= lastDay || weeks.length === 0) {
    const weekDays = getWeekDays(current);
    weeks.push(weekDays);
    const nextWeek = new Date(current);
    nextWeek.setDate(nextWeek.getDate() + 7);
    if (nextWeek > lastDay && weekDays[6]! >= lastDay) break;
    current = nextWeek;
  }

  return weeks;
}
