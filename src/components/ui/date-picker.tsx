"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isAfter, isBefore } from "date-fns";
import { ru } from "date-fns/locale";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

export function DatePicker({ value, onChange, placeholder = "Выбрать дату", minDate, maxDate }: DatePickerProps) {
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
        className="flex w-full items-center justify-between rounded-xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B] bg-white px-3 py-2.5 text-sm text-left"
      >
        <span className={value ? "dark:text-[#F8FAFC] text-[#2D3748]" : "dark:text-[#64748B] text-[#A0AEC0]"}>
          {value ? format(new Date(value), "d MMMM yyyy", { locale: ru }) : placeholder}
        </span>
        <svg className="h-4 w-4 dark:text-[#64748B] text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg dark:text-[#94A3B8] text-[#718096] dark:hover:bg-[#334155] hover:bg-[#F1F5F9] dark:hover:text-[#F8FAFC] hover:text-[#2D3748]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <p className="text-sm font-semibold dark:text-[#F8FAFC] text-[#2D3748]">
                {format(currentMonth, "LLLL yyyy", { locale: ru })}
              </p>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg dark:text-[#94A3B8] text-[#718096] dark:hover:bg-[#334155] hover:bg-[#F1F5F9] dark:hover:text-[#F8FAFC] hover:text-[#2D3748]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <div key={day} className="py-1 text-center text-[10px] font-medium dark:text-[#64748B] text-[#A0AEC0]">{day}</div>
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
                        ? "dark:text-[#334155] text-[#CBD5E0] cursor-not-allowed"
                        : isSelected
                          ? "bg-[#008080] text-white dark:bg-[#D6BC97] dark:text-[#0F172A]"
                          : isToday
                            ? "dark:bg-[#D6BC97]/10 bg-[#008080]/10 text-[#008080] dark:text-[#D6BC97]"
                            : "dark:text-[#F8FAFC] text-[#2D3748] dark:hover:bg-[#334155] hover:bg-[#F1F5F9]"
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
