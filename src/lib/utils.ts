import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export function getElapsedSeconds(from: string, to: Date = new Date()): number {
  const start = new Date(from).getTime();
  const end = to.getTime();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function roundTo30(date: Date): Date {
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
