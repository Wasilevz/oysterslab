"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const STEPS = [
  { icon: "👋", key: "welcome" },
  { icon: "⏰", key: "shift" },
  { icon: "💰", key: "salary" },
  { icon: "📅", key: "schedule" },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { t: tFn, locale } = useI18n();

  const texts: Record<string, Record<string, { title: string; desc: string }>> = {
    ru: {
      welcome: { title: "Добро пожаловать!", desc: "Это приложение для учёта рабочего времени. Здесь ты можешь отмечать смены и видеть свою зарплату." },
      shift: { title: "Начало смены", desc: "Нажми кнопку «Начать смену» когда пришёл на работу. Не забудь закрыть смену в конце дня!" },
      salary: { title: "Зарплата", desc: "Внизу главного экрана ты увидишь свои выплаты. После одобрения админом подтверди получение." },
      schedule: { title: "График", desc: "Посмотри расписание на месяц. Зелёные точки — рабочие дни, серые — выходные." },
    },
    ro: {
      welcome: { title: "Bine ați venit!", desc: "Această aplicație este pentru evidența timpului de muncă. Aici poți marca turele și vedea salariul." },
      shift: { title: "Începutul turei", desc: "Apasă butonul «Începe tura» când ajungi la muncă. Nu uita să închei tura la sfârșitul zilei!" },
      salary: { title: "Salariul", desc: "În partea de jos a ecranului principal vezi plățile. După aprobarea administratorului, confirmă primirea." },
      schedule: { title: "Programul", desc: "Vezi programul pe lună. Punctele verzi — zile de lucru, gri — libere." },
    },
  };

  const stepTexts = texts[locale] ?? texts.ru;
  const current = stepTexts[STEPS[step].key];

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
          className="w-full rounded-2xl bg-[var(--brand-primary)] py-4 text-base font-bold text-white hover:opacity-90 transition-all active:scale-[0.98]"
        >
          {step < STEPS.length - 1 ? tFn("onboarding.next") : tFn("onboarding.start")}
        </button>

        <button
          onClick={() => {
            localStorage.setItem("onboarded", "1");
            onComplete();
          }}
          className="mt-3 w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {tFn("onboarding.skip")}
        </button>
      </div>
    </div>
  );
}
