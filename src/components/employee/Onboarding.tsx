"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const STEPS = [
  { icon: "ðŸ‘‹", key: "welcome" },
  { icon: "â°", key: "shift" },
  { icon: "ðŸ’°", key: "salary" },
  { icon: "ðŸ“…", key: "schedule" },
];

const STEPS_RO = [
  { icon: "ðŸ‘‹", key: "welcome" },
  { icon: "â°", key: "shift" },
  { icon: "ðŸ’°", key: "salary" },
  { icon: "ðŸ“…", key: "schedule" },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { locale } = useI18n();

  const texts: Record<string, Record<string, { title: string; desc: string }>> = {
    ru: {
      welcome: { title: "Ð”Ð¾Ð±Ñ€Ð¾ Ð¿Ð¾Ð¶Ð°Ð»Ð¾Ð²Ð°Ñ‚ÑŒ!", desc: "Ð­Ñ‚Ð¾ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ Ð´Ð»Ñ ÑƒÑ‡Ñ‘Ñ‚Ð° Ñ€Ð°Ð±Ð¾Ñ‡ÐµÐ³Ð¾ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð¸. Ð—Ð´ÐµÑÑŒ Ñ‚Ñ‹ Ð¼Ð¾Ð¶ÐµÑˆÑŒ Ð¾Ñ‚Ð¼ÐµÑ‡Ð°Ñ‚ÑŒ ÑÐ¼ÐµÐ½Ñ‹ Ð¸ Ð²Ð¸Ð´ÐµÑ‚ÑŒ ÑÐ²Ð¾ÑŽ Ð·Ð°Ñ€Ð¿Ð»Ð°Ñ‚Ñƒ." },
      shift: { title: "ÐÐ°Ñ‡Ð°Ð»Ð¾ ÑÐ¼ÐµÐ½Ñ‹", desc: "ÐÐ°Ð¶Ð¼Ð¸ ÐºÐ½Ð¾Ð¿ÐºÑƒ Â«ÐÐ°Ñ‡Ð°Ñ‚ÑŒ ÑÐ¼ÐµÐ½ÑƒÂ» ÐºÐ¾Ð³Ð´Ð° Ð¿Ñ€Ð¸ÑˆÑ‘Ð» Ð½Ð° Ñ€Ð°Ð±Ð¾Ñ‚Ñƒ. ÐÐµ Ð·Ð°Ð±ÑƒÐ´ÑŒ Ð·Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ ÑÐ¼ÐµÐ½Ñƒ Ð² ÐºÐ¾Ð½Ñ†Ðµ Ð´Ð½Ñ!" },
      salary: { title: "Ð—Ð°Ñ€Ð¿Ð»Ð°Ñ‚Ð°", desc: "Ð’Ð½Ð¸Ð·Ñƒ Ð³Ð»Ð°Ð²Ð½Ð¾Ð³Ð¾ ÑÐºÑ€Ð°Ð½Ð° Ñ‚Ñ‹ ÑƒÐ²Ð¸Ð´Ð¸ÑˆÑŒ ÑÐ²Ð¾Ð¸ Ð²Ñ‹Ð¿Ð»Ð°Ñ‚Ñ‹. ÐŸÐ¾ÑÐ»Ðµ Ð¾Ð´Ð¾Ð±Ñ€ÐµÐ½Ð¸Ñ Ð°Ð´Ð¼Ð¸Ð½Ð¾Ð¼ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸ Ð¿Ð¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ðµ." },
      schedule: { title: "Ð“Ñ€Ð°Ñ„Ð¸Ðº", desc: "ÐŸÐ¾ÑÐ¼Ð¾Ñ‚Ñ€Ð¸ Ñ€Ð°ÑÐ¿Ð¸ÑÐ°Ð½Ð¸Ðµ Ð½Ð° Ð¼ÐµÑÑÑ†. Ð—ÐµÐ»Ñ‘Ð½Ñ‹Ðµ Ñ‚Ð¾Ñ‡ÐºÐ¸ â€” Ñ€Ð°Ð±Ð¾Ñ‡Ð¸Ðµ Ð´Ð½Ð¸, ÑÐµÑ€Ñ‹Ðµ â€” Ð²Ñ‹Ñ…Ð¾Ð´Ð½Ñ‹Ðµ." },
    },
    ro: {
      welcome: { title: "Bine aÈ›i venit!", desc: "AceastÄƒ aplicaÈ›ie este pentru evidenÈ›a timpului de muncÄƒ. Aici poÈ›i marca turele È™i vedea salariul." },
      shift: { title: "ÃŽnceputul turei", desc: "ApasÄƒ butonul Â«ÃŽncepe turaÂ» cÃ¢nd ajungi la muncÄƒ. Nu uita sÄƒ Ã®nchei tura la sfÃ¢rÈ™itul zilei!" },
      salary: { title: "Salariul", desc: "ÃŽn partea de jos a ecranului principal vezi plÄƒÈ›ile. DupÄƒ aprobarea administratorului, confirmÄƒ primirea." },
      schedule: { title: "Programul", desc: "Vezi programul pe lunÄƒ. Punctele verzi â€” zile de lucru, gri â€” libere." },
    },
  };

  const t = texts[locale] ?? texts.ru;
  const current = t[STEPS[step].key];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]">
      <div className="w-full max-w-sm px-8 text-center">
        <div className="mb-8 text-7xl">{STEPS[step].icon}</div>

        <h2 className="mb-3 text-2xl font-bold text-[var(--text-primary)]">
          {current.title}
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          {current.desc}
        </p>

        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-8 bg-[var(--brand-primary)]" : "w-2 bg-[var(--border-color)]"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (step < STEPS.length - 1) {
              setStep(step + 1);
            } else {
              localStorage.setItem("onboarded", "1");
              onComplete();
            }
          }}
          className="w-full rounded-[16px] bg-[var(--brand-primary)] py-4 text-base font-bold text-white hover:opacity-90 transition-all active:scale-[0.98]"
        >
          {step < STEPS.length - 1 ? (locale === "ro" ? "Mai departe" : "Ð”Ð°Ð»ÐµÐµ") : (locale === "ro" ? "ÃŽncepe" : "ÐÐ°Ñ‡Ð°Ñ‚ÑŒ")}
        </button>

        <button
          onClick={() => {
            localStorage.setItem("onboarded", "1");
            onComplete();
          }}
          className="mt-3 w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {locale === "ro" ? "Sari" : "ÐŸÑ€Ð¾Ð¿ÑƒÑÑ‚Ð¸Ñ‚ÑŒ"}
        </button>
      </div>
    </div>
  );
}
