"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  getLocationSettings,
  saveLocationSettings,
} from "@/actions/locationActions";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from "@/actions/employeeActions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types/database";

export function SettingsPage({ onBack }: { onBack?: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const [employees, setEmployees] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editRole, setEditRole] = useState<"employee" | "admin">("employee");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newRole, setNewRole] = useState<"employee" | "admin">("employee");
  const [allowedIPs, setAllowedIPs] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSettings = useCallback(async () => {
    const [settingsResult, employeesResult] = await Promise.all([
      getLocationSettings(),
      getEmployees(),
    ]);
    if (settingsResult.success && settingsResult.data) {
      setAllowedIPs(settingsResult.data.allowedIPs.length > 0 ? settingsResult.data.allowedIPs : [""]);
    }
    if (employeesResult.success && employeesResult.data) {
      setEmployees(employeesResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
  }, [loadSettings]);

  const handleSave = () => {
    const validIPs = allowedIPs.filter((ip) => ip.trim() !== "");
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveLocationSettings(validIPs, "ip");
      if (!result.success) {
        setError(result.error ?? "Ошибка");
        return;
      }
      setSuccess(t("settings.saved"));
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const addIPField = () => setAllowedIPs([...allowedIPs, ""]);
  const updateIP = (index: number, value: string) => {
    const updated = [...allowedIPs];
    updated[index] = value;
    setAllowedIPs(updated);
  };
  const removeIP = (index: number) => setAllowedIPs(allowedIPs.filter((_, i) => i !== index));

  const detectMyIP = async () => {
    try {
      const res = await fetch("/api/my-ip");
      const data = await res.json();
      if (data.ip && data.ip !== "unknown") {
        setAllowedIPs([data.ip]);
        setSuccess(`IP: ${data.ip}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("Не удалось определить IP");
    }
  };

  const startEdit = (emp: User) => {
    setEditingId(emp.id);
    setEditName(emp.full_name);
    setEditPosition(emp.position ?? "");
    setEditRate(String(emp.hourly_rate));
    setEditRole(emp.role as "employee" | "admin");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPosition("");
    setEditRate("");
    setEditRole("employee");
  };

  const handleSaveEmployee = async () => {
    if (!editingId) return;
    const rate = Number(editRate);
    if (!Number.isFinite(rate) || rate < 0) { setError("Укажите корректную ставку"); return; }
    const result = await updateEmployee(editingId, editName, editPosition, rate, editRole);
    if (!result.success) { setError(result.error ?? "Ошибка"); return; }
    cancelEdit();
    void loadSettings();
  };

  const handleAddEmployee = async () => {
    const tgId = Number(newTelegramId);
    const rate = Number(newRate);
    if (!newName.trim()) { setError("Введите имя"); return; }
    if (!Number.isFinite(tgId) || tgId <= 0) { setError("Введите Telegram ID"); return; }
    if (!Number.isFinite(rate) || rate < 0) { setError("Укажите ставку"); return; }
    const result = await addEmployee(tgId, newName, newRole, newPosition, rate);
    if (!result.success) { setError(result.error ?? "Ошибка"); return; }
    setNewName(""); setNewTelegramId(""); setNewPosition(""); setNewRate(""); setNewRole("employee");
    setShowAddForm(false);
    void loadSettings();
  };

  const handleDeleteEmployee = async (userId: string) => {
    const result = await deleteEmployee(userId);
    if (!result.success) { setError(result.error ?? "Ошибка"); return; }
    void loadSettings();
  };

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
      <header className="border-b border-[var(--card-border)]/60 px-4 py-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-xl p-2 text-[var(--muted-light)] hover:bg-[var(--card-border)] hover:text-[var(--fg)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
              {t("settings.title")}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--fg)]">{t("settings.security")}</h1>
          </div>
        </div>
      </header>

      {/* Language */}
      <div className="mt-4 px-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--fg)]">{t("settings.language")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setLocale("ru")} className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${locale === "ru" ? "border-[var(--accent)]/30 bg-[var(--accent)] text-[var(--accent)]" : "border-[var(--card-border)] text-[var(--muted)]"}`}>
              🇷🇺 Русский
            </button>
            <button onClick={() => setLocale("ro")} className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${locale === "ro" ? "border-[var(--accent)]/30 bg-[var(--accent)] text-[var(--accent)]" : "border-[var(--card-border)] text-[var(--muted)]"}`}>
              🇲🇩 Română
            </button>
          </div>
        </div>
      </div>

      {/* IP Location */}
      <div className="mt-3 px-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="mb-1 text-sm font-semibold text-[var(--fg)]">{t("settings.location")}</p>
          <p className="mb-3 text-[10px] text-[var(--muted)]">{t("settings.locationDesc")}</p>
          <div className="space-y-2">
            {allowedIPs.map((ip, i) => (
              <div key={i} className="flex gap-2">
                <Input type="text" placeholder={t("settings.ipPlaceholder")} value={ip} onChange={(e) => updateIP(i, e.target.value)} />
                {allowedIPs.length > 1 && (
                  <button onClick={() => removeIP(i)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:border-rose-500/50 hover:text-rose-400">×</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="blue" className="flex-1" onClick={() => void detectMyIP()}>{t("settings.detectIP")}</Button>
            <button onClick={addIPField} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">+</button>
          </div>
          <p className="mt-3 text-[10px] text-[var(--muted)]">{t("settings.detectIPDesc")}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 mt-4">
        {error && <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"><p className="text-sm text-red-500">{error}</p></div>}
        {success && <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"><p className="text-sm text-emerald-400">{success}</p></div>}
        <Button variant="blue" className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? t("common.processing") : t("settings.save")}
        </Button>
      </div>

      {/* Employees */}
      <div className="px-4 mt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{t("settings.employees")}</p>
          <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-xl border border-[var(--card-border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">
            {showAddForm ? t("settings.hideForm") : t("settings.addEmployee")}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 rounded-2xl border border-[var(--accent)]/10 bg-[var(--accent)] p-4 space-y-2">
            <p className="mb-1 text-sm font-semibold text-[var(--accent)]">{t("settings.newEmployee")}</p>
            <Input type="text" placeholder={t("settings.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="number" placeholder={t("settings.telegramIdPlaceholder")} value={newTelegramId} onChange={(e) => setNewTelegramId(e.target.value)} />
            <Input type="text" placeholder={t("settings.positionPlaceholder")} value={newPosition} onChange={(e) => setNewPosition(e.target.value)} />
            <Input type="number" inputMode="decimal" step="0.5" min="0" placeholder={t("settings.ratePlaceholder")} value={newRate} onChange={(e) => setNewRate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setNewRole("employee")} className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${newRole === "employee" ? "border-[var(--accent)]/30 bg-[var(--accent)] text-[var(--accent)]" : "border-[var(--card-border)] text-[var(--muted)]"}`}>{t("settings.employeeRole")}</button>
              <button onClick={() => setNewRole("admin")} className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${newRole === "admin" ? "border-[var(--accent)]/30 bg-[var(--accent)] text-[var(--accent)]" : "border-[var(--card-border)] text-[var(--muted)]"}`}>{t("settings.adminRole")}</button>
            </div>
            <Button variant="blue" className="w-full" onClick={() => void handleAddEmployee()}>{t("settings.addBtn")}</Button>
          </div>
        )}

        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              {editingId === emp.id ? (
                <div className="space-y-2">
                  <Input type="text" placeholder={t("settings.namePlaceholder")} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input type="text" placeholder={t("settings.positionPlaceholder")} value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
                  <Input type="number" inputMode="decimal" step="0.5" min="0" placeholder={t("settings.ratePlaceholder")} value={editRate} onChange={(e) => setEditRate(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditRole("employee")} className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${editRole === "employee" ? "border-[var(--accent)]/30 bg-[var(--accent)] text-[var(--accent)]" : "border-[var(--card-border)] text-[var(--muted)]"}`}>{t("settings.employeeRole")}</button>
                    <button onClick={() => setEditRole("admin")} className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${editRole === "admin" ? "border-[var(--accent)]/30 bg-[var(--accent)] text-[var(--accent)]" : "border-[var(--card-border)] text-[var(--muted)]"}`}>{t("settings.adminRole")}</button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={cancelEdit}>{t("settings.cancel")}</Button>
                    <Button variant="blue" className="flex-1" onClick={() => void handleSaveEmployee()}>{t("settings.saveBtn")}</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--fg)]">{emp.full_name}</p>
                    {emp.position && <p className="text-xs text-[var(--muted-light)]">{emp.position}</p>}
                    <p className="text-[10px] text-[var(--muted)]">
                      {emp.role === "admin" ? t("settings.adminRole") : t("settings.employeeRole")} · {emp.hourly_rate} л/ч · TG: {emp.telegram_id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(emp)} className="rounded-xl border border-[var(--card-border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">{t("settings.edit")}</button>
                    <button onClick={() => void handleDeleteEmployee(emp.id)} className="rounded-xl border border-[var(--card-border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-rose-500/30 hover:text-rose-500">{t("settings.delete")}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
