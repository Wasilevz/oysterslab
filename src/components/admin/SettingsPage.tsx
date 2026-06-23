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
        setError(result.error ?? t("settings.saveError"));
        return;
      }
      setSuccess(t("settings.saved"));
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const addIPField = () => {
    setAllowedIPs([...allowedIPs, ""]);
  };

  const updateIP = (index: number, value: string) => {
    const updated = [...allowedIPs];
    updated[index] = value;
    setAllowedIPs(updated);
  };

  const removeIP = (index: number) => {
    setAllowedIPs(allowedIPs.filter((_, i) => i !== index));
  };

  const detectMyIP = async () => {
    try {
      const res = await fetch("/api/my-ip");
      const data = await res.json();
      if (data.ip && data.ip !== "unknown") {
        setAllowedIPs([data.ip]);
        setSuccess(t("settings.ipDetected", { ip: data.ip }));
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError(t("settings.detectIPFailed"));
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
    if (!Number.isFinite(rate) || rate < 0) {
      setError(t("settings.invalidRate"));
      return;
    }

    const result = await updateEmployee(editingId, editName, editPosition, rate, editRole);
    if (!result.success) {
      setError(result.error ?? t("settings.saveError"));
      return;
    }
    setEditingId(null);
    setEditName("");
    setEditPosition("");
    setEditRate("");
    setEditRole("employee");
    void loadSettings();
  };

  const handleAddEmployee = async () => {
    const tgId = Number(newTelegramId);
    const rate = Number(newRate);

    if (!newName.trim()) {
      setError(t("settings.enterName"));
      return;
    }
    if (!Number.isFinite(tgId) || tgId <= 0) {
      setError(t("settings.invalidTelegramId"));
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setError(t("settings.invalidRate"));
      return;
    }

    const result = await addEmployee(tgId, newName, newRole, newPosition, rate);
    if (!result.success) {
      setError(result.error ?? t("settings.addError"));
      return;
    }
    setNewName("");
    setNewTelegramId("");
    setNewPosition("");
    setNewRate("");
    setNewRole("employee");
    setShowAddForm(false);
    void loadSettings();
  };

  const handleDeleteEmployee = async (userId: string) => {
    const result = await deleteEmployee(userId);
    if (!result.success) {
      setError(result.error ?? t("settings.deleteError"));
      return;
    }
    void loadSettings();
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b dark:border-zinc-800/60 border-zinc-200/60 px-4 py-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-xl p-2 dark:text-zinc-400 text-zinc-600 dark:hover:bg-zinc-800 hover:bg-zinc-100 dark:hover:text-white hover:text-zinc-900">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest dark:text-zinc-600 text-zinc-400">
              {t("settings.title")}
            </p>
            <h1 className="mt-1 text-2xl font-bold dark:text-white text-zinc-900">{t("settings.security")}</h1>
          </div>
        </div>
      </header>

      <div className="mt-6 px-4">
        <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900/30 bg-zinc-100/80 p-4">
          <p className="mb-3 text-sm font-semibold dark:text-white text-zinc-900">{t("settings.language")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLocale("ru")}
              className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                locale === "ru"
                  ? "border-blue-500/30 dark:bg-blue-500/10 bg-blue-100 text-blue-400"
                  : "dark:border-zinc-700 border-zinc-300 dark:text-zinc-500 text-zinc-400"
              }`}
            >
              🇷🇺 Русский
            </button>
            <button
              onClick={() => setLocale("ro")}
              className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                locale === "ro"
                  ? "border-blue-500/30 dark:bg-blue-500/10 bg-blue-100 text-blue-400"
                  : "dark:border-zinc-700 border-zinc-300 dark:text-zinc-500 text-zinc-400"
              }`}
            >
              🇲🇩 Română
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 px-4">
        <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900/30 bg-zinc-100/80 p-4">
          <p className="mb-1 text-sm font-semibold dark:text-white text-zinc-900">{t("settings.location")}</p>
          <p className="mb-3 text-[10px] dark:text-zinc-500 text-zinc-400">
            {t("settings.locationDesc")}
          </p>
        </div>

        {showAddForm && (
          <div className="mb-4 rounded-2xl border border-blue-500/10 dark:bg-blue-500/5 bg-blue-50 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-400">{t("settings.newEmployee")}</p>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={t("settings.namePlaceholder")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t("settings.telegramIdPlaceholder")}
                value={newTelegramId}
                onChange={(e) => setNewTelegramId(e.target.value)}
              />
              <Input
                type="text"
                placeholder={t("settings.positionPlaceholder")}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder={t("settings.ratePlaceholder")}
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewRole("employee")}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    newRole === "employee"
                      ? "border-blue-500/30 dark:bg-blue-500/10 bg-blue-100 text-blue-400"
                      : "dark:border-zinc-700 border-zinc-300 dark:text-zinc-500 text-zinc-400"
                  }`}
                >
                  {t("settings.employeeRole")}
                </button>
                <button
                  onClick={() => setNewRole("admin")}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    newRole === "admin"
                      ? "border-blue-500/30 dark:bg-blue-500/10 bg-blue-100 text-blue-400"
                      : "dark:border-zinc-700 border-zinc-300 dark:text-zinc-500 text-zinc-400"
                  }`}
                >
                  {t("settings.adminRole")}
                </button>
              </div>
              <Button
                variant="blue"
                className="w-full"
                onClick={() => void handleAddEmployee()}
              >
                {t("settings.addBtn")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-2xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900/30 bg-zinc-100/80 p-4"
            >
              {editingId === emp.id ? (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder={t("settings.namePlaceholder")}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder={t("settings.position")}
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder={t("settings.ratePlaceholder")}
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditRole("employee")}
                      className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      editRole === "employee"
                        ? "border-blue-500/30 dark:bg-blue-500/10 bg-blue-100 text-blue-400"
                        : "dark:border-zinc-700 border-zinc-300 dark:text-zinc-500 text-zinc-400"
                      }`}
                    >
                      {t("settings.employeeRole")}
                    </button>
                    <button
                      onClick={() => setEditRole("admin")}
                      className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                        editRole === "admin"
                          ? "border-blue-500/30 dark:bg-blue-500/10 bg-blue-100 text-blue-400"
                          : "dark:border-zinc-700 border-zinc-300 dark:text-zinc-500 text-zinc-400"
                      }`}
                    >
                      {t("settings.adminRole")}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={cancelEdit}
                    >
                      {t("settings.cancel")}
                    </Button>
                    <Button
                      variant="blue"
                      className="flex-1"
                      onClick={() => void handleSaveEmployee()}
                    >
                      {t("settings.saveBtn")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold dark:text-white text-zinc-900">{emp.full_name}</p>
                    {emp.position && (
                      <p className="text-xs dark:text-zinc-400 text-zinc-600">{emp.position}</p>
                    )}
                    <p className="text-[10px] dark:text-zinc-500 text-zinc-400">
                      {emp.role === "admin" ? t("settings.adminRole") : t("settings.employeeRole")} · {emp.hourly_rate} л/ч · TG: {emp.telegram_id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(emp)}
            className="rounded-xl border dark:border-zinc-700 border-zinc-300 px-3 py-1.5 text-xs dark:text-zinc-400 text-zinc-600 hover:border-blue-500/30 hover:text-blue-400"
                    >
                      {t("settings.edit")}
                    </button>
                    <button
                      onClick={() => void handleDeleteEmployee(emp.id)}
                      className="rounded-xl border dark:border-zinc-700 border-zinc-300 px-3 py-1.5 text-xs dark:text-zinc-400 text-zinc-600 hover:border-rose-500/30 hover:text-rose-400"
                    >
                      {t("settings.delete")}
                    </button>
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
