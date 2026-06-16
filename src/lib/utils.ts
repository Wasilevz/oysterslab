import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getElapsedMinutes(from: string, to: Date = new Date()): number {
  const start = new Date(from).getTime();
  const end = to.getTime();
  return Math.max(0, Math.floor((end - start) / 60000));
}
