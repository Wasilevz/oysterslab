"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isAfter, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

export function DatePicker({ value, onChange, placeholder, minDate, maxDate }: DatePickerProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;

  const selectedDate = value ? new Date(value) : null;
  const minDateObj = minDate ? new Date(minDate) : null;
  const maxDateObj = maxDate ? new Date(maxDate) : null;

  const handleSelect = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const isDisabled = (day: Date) => {
    if (minDateObj && isBefore(day, minDateObj)) return true;
    if (maxDateObj && isAfter(day, maxDateObj)) return true;
    return false;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 h-12 text-sm text-left"
      >
        <span className={value ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
          {value ? format(new Date(value), "d MMMM yyyy", { locale: ru }) : (placeholder ?? t("datePicker.placeholder"))}
        </span>
        <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {format(currentMonth, "LLLL yyyy", { locale: ru })}
              </p>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {[t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri"), t("day.sat"), t("day.sun")].map((day) => (
                <div key={day} className="py-1 text-center text-[10px] font-medium text-[var(--text-secondary)]">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const disabled = isDisabled(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !disabled && handleSelect(day)}
                    disabled={disabled}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      disabled
                        ? "text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "bg-[var(--brand-primary)] text-white"
                          : isToday
                            ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
