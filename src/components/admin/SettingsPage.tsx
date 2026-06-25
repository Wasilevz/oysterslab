"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  getLocationSettings,
  saveLocationSettings,
  getLocations,
  addLocation,
  deleteLocation,
} from "@/actions/locationActions";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from "@/actions/employeeActions";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Location, User } from "@/types/database";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
  users?: { full_name: string };
}

export function SettingsPage({ onBack }: { onBack?: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const user = useUserStore((s) => s.user);
  const isSuperAdmin = user?.role === "superadmin";
  const [employees, setEmployees] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editRole, setEditRole] = useState<"employee" | "admin">("employee");
  const [editShiftStart, setEditShiftStart] = useState("12:00");
  const [editLocationId, setEditLocationId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newRole, setNewRole] = useState<"employee" | "admin">("employee");
  const [allowedIPs, setAllowedIPs] = useState<string[]>([""]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSettings = useCallback(async () => {
    const callerId = useUserStore.getState().user?.id;
    const [settingsResult, employeesResult, locationsResult] = await Promise.all([
      getLocationSettings(),
      getEmployees(callerId),
      getLocations(),
    ]);
    if (settingsResult.success && settingsResult.data) {
      setAllowedIPs(settingsResult.data.allowedIPs.length > 0 ? settingsResult.data.allowedIPs : [""]);
    }
    if (employeesResult.success && employeesResult.data) {
      setEmployees(employeesResult.data);
    }
    if (locationsResult.success && locationsResult.data) {
      setLocations(locationsResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/audit?limit=30");
      const data = await res.json();
      if (data.ok) setAuditLogs(data.logs);
    } catch {}
  }, []);

  const handleSave = () => {
    const validIPs = allowedIPs.filter((ip) => ip.trim() !== "");
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveLocationSettings(validIPs, "ip");
      if (!result.success) {
        setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ° ÑÐ¾Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸Ñ");
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
        setSuccess("IP: " + data.ip);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»Ð¸Ñ‚ÑŒ IP");
    }
  };

  const startEdit = (emp: User) => {
    setEditingId(emp.id);
    setEditName(emp.full_name);
    setEditPosition(emp.position ?? "");
    setEditRate(String(emp.hourly_rate));
    setEditRole(emp.role as "employee" | "admin");
    setEditShiftStart(emp.shift_start_time ?? "12:00");
    setEditLocationId(emp.location_id ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPosition("");
    setEditRate("");
    setEditRole("employee");
    setEditShiftStart("12:00");
    setEditLocationId("");
  };

  const handleSaveEmployee = async () => {
    if (!editingId) return;
    const rate = Number(editRate);
    if (!Number.isFinite(rate) || rate < 0) { setError("Ð£ÐºÐ°Ð¶Ð¸Ñ‚Ðµ ÐºÐ¾Ñ€Ñ€ÐµÐºÑ‚Ð½ÑƒÑŽ ÑÑ‚Ð°Ð²ÐºÑƒ"); return; }
    const result = await updateEmployee(editingId, editName, editPosition, rate, editRole, editShiftStart, useUserStore.getState().user?.id ?? "", editLocationId);
    if (!result.success) { setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ°"); return; }
    cancelEdit();
    void loadSettings();
  };

  const handleAddEmployee = async () => {
    const tgId = Number(newTelegramId);
    const rate = Number(newRate);
    if (!newName.trim()) { setError("Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ Ð¸Ð¼Ñ"); return; }
    if (!Number.isFinite(tgId) || tgId <= 0) { setError("Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ Telegram ID"); return; }
    if (!Number.isFinite(rate) || rate < 0) { setError("Ð£ÐºÐ°Ð¶Ð¸Ñ‚Ðµ ÑÑ‚Ð°Ð²ÐºÑƒ"); return; }
    const result = await addEmployee(tgId, newName, newRole, newPosition, rate, useUserStore.getState().user?.id ?? "");
    if (!result.success) { setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ°"); return; }
    setNewName(""); setNewTelegramId(""); setNewPosition(""); setNewRate(""); setNewRole("employee");
    setShowAddForm(false);
    void loadSettings();
  };

  const handleDeleteEmployee = async (userId: string) => {
    const result = await deleteEmployee(userId, useUserStore.getState().user?.id ?? "");
    if (!result.success) { setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ°"); return; }
    void loadSettings();
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) { setError("Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸Ðµ"); return; }
    const result = await addLocation(newLocationName, newLocationAddress, useUserStore.getState().user?.id ?? "");
    if (!result.success) { setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ°"); return; }
    setNewLocationName(""); setNewLocationAddress("");
    void loadSettings();
  };

  const handleDeleteLocation = async (id: string) => {
    const result = await deleteLocation(id, useUserStore.getState().user?.id ?? "");
    if (!result.success) { setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ°"); return; }
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
      <header className="border-b border-[var(--border-color)] px-4 py-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
              {t("settings.title")}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{t("settings.security")}</h1>
          </div>
        </div>
      </header>

      {/* Language */}
      <div className="mt-4 px-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{t("settings.language")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setLocale("ru")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ru" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              Ð ÑƒÑÑÐºÐ¸Ð¹
            </button>
            <button onClick={() => setLocale("ro")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ro" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              RomÃ¢nÄƒ
            </button>
          </div>
        </div>
      </div>

      {/* IP Location */}
      <div className="mt-4 px-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{t("settings.location")}</p>
          <p className="mb-3 text-[10px] text-[var(--text-secondary)]">{t("settings.locationDesc")}</p>
          <div className="space-y-2">
            {allowedIPs.map((ip, i) => (
              <div key={i} className="flex gap-2">
                <Input type="text" placeholder={t("settings.ipPlaceholder")} value={ip} onChange={(e) => updateIP(i, e.target.value)} />
                {allowedIPs.length > 1 && (
                  <button onClick={() => removeIP(i)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-rose-500/50 hover:text-rose-400">Ã—</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="blue" className="flex-1" onClick={() => void detectMyIP()}>{t("settings.detectIP")}</Button>
            <button onClick={addIPField} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">+</button>
          </div>
          <p className="mt-3 text-[10px] text-[var(--text-secondary)]">{t("settings.detectIPDesc")}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 mt-4">
        {error && <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"><p className="text-sm text-red-500">{error}</p></div>}
        {success && <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"><p className="text-sm text-emerald-600">{success}</p></div>}
        <Button variant="blue" className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? t("common.processing") : t("settings.save")}
        </Button>
      </div>

      {/* Locations - only for superadmin */}
      {isSuperAdmin && (
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Ð›Ð¾ÐºÐ°Ñ†Ð¸Ð¸</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between rounded-xl border border-[var(--border-color)] px-3 py-2">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{loc.name}</p>
                {loc.address && <p className="text-[10px] text-[var(--text-secondary)]">{loc.address}</p>}
              </div>
              <button onClick={() => void handleDeleteLocation(loc.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10">Ð£Ð´Ð°Ð»Ð¸Ñ‚ÑŒ</button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="ÐÐ°Ð·Ð²Ð°Ð½Ð¸Ðµ" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} className="flex-1" />
            <Input placeholder="ÐÐ´Ñ€ÐµÑ" value={newLocationAddress} onChange={(e) => setNewLocationAddress(e.target.value)} className="flex-1" />
            <Button variant="blue" onClick={() => void handleAddLocation()}>+</Button>
          </div>
        </div>
      </div>
      )}

      {/* Employees */}
      <div className="px-4 mt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{t("settings.employees")}</p>
          <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-[1440px] border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">
            {showAddForm ? t("settings.hideForm") : t("settings.addEmployee")}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 p-4 space-y-2">
            <p className="mb-1 text-sm font-semibold text-[var(--brand-primary)]">{t("settings.newEmployee")}</p>
            <Input type="text" placeholder={t("settings.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="number" placeholder={t("settings.telegramIdPlaceholder")} value={newTelegramId} onChange={(e) => setNewTelegramId(e.target.value)} />
            <Input type="text" placeholder={t("settings.positionPlaceholder")} value={newPosition} onChange={(e) => setNewPosition(e.target.value)} />
            <Input type="number" inputMode="decimal" step="0.5" min="0" placeholder={t("settings.ratePlaceholder")} value={newRate} onChange={(e) => setNewRate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setNewRole("employee")} className={`rounded-[1440px] border py-2 text-xs font-semibold transition-colors ${newRole === "employee" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>{t("settings.employeeRole")}</button>
              <button onClick={() => setNewRole("admin")} className={`rounded-[1440px] border py-2 text-xs font-semibold transition-colors ${newRole === "admin" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>{t("settings.adminRole")}</button>
            </div>
            <Button variant="blue" className="w-full" onClick={() => void handleAddEmployee()}>{t("settings.addBtn")}</Button>
          </div>
        )}

        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
              {editingId === emp.id ? (
                <div className="space-y-2">
                  <Input type="text" placeholder={t("settings.namePlaceholder")} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input type="text" placeholder={t("settings.positionPlaceholder")} value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
                  <Input type="number" inputMode="decimal" step="0.5" min="0" placeholder={t("settings.ratePlaceholder")} value={editRate} onChange={(e) => setEditRate(e.target.value)} />
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--text-secondary)]">ÐÐ°Ñ‡Ð°Ð»Ð¾ ÑÐ¼ÐµÐ½Ñ‹</label>
                    <input type="time" value={editShiftStart} onChange={(e) => setEditShiftStart(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--text-secondary)]">Ð›Ð¾ÐºÐ°Ñ†Ð¸Ñ</label>
                    <select value={editLocationId} onChange={(e) => setEditLocationId(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
                      <option value="">Ð‘ÐµÐ· Ð»Ð¾ÐºÐ°Ñ†Ð¸Ð¸</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditRole("employee")} className={`rounded-[1440px] border py-2 text-xs font-semibold transition-colors ${editRole === "employee" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>{t("settings.employeeRole")}</button>
                    <button onClick={() => setEditRole("admin")} className={`rounded-[1440px] border py-2 text-xs font-semibold transition-colors ${editRole === "admin" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>{t("settings.adminRole")}</button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={cancelEdit}>{t("settings.cancel")}</Button>
                    <Button variant="blue" className="flex-1" onClick={() => void handleSaveEmployee()}>{t("settings.saveBtn")}</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{emp.full_name}</p>
                    {emp.position && <p className="text-xs text-[var(--text-secondary)]">{emp.position}</p>}
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {emp.role === "admin" ? t("settings.adminRole") : t("settings.employeeRole")} Â· {emp.hourly_rate} Ð»/Ñ‡ Â· TG: {emp.telegram_id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(emp)} className="rounded-[1440px] border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">{t("settings.edit")}</button>
                    <button onClick={() => void handleDeleteEmployee(emp.id)} className="rounded-[1440px] border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-rose-500/30 hover:text-rose-500">{t("settings.delete")}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="px-4 mt-6 pb-24">
        <button
          onClick={() => { setShowLogs(!showLogs); if (!showLogs) void loadLogs(); }}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
        >
          <span className="text-sm font-semibold text-[var(--text-primary)]">Ð–ÑƒÑ€Ð½Ð°Ð» Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ð¹</span>
          <svg className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${showLogs ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showLogs && (
          <div className="mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            {auditLogs.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-secondary)]">ÐÐµÑ‚ Ð·Ð°Ð¿Ð¸ÑÐµÐ¹</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between rounded-xl border border-[var(--border-color)] px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {log.users?.full_name || "System"} â€” {log.action}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {log.entity_type}{log.details ? `: ${log.details}` : ""}
                      </p>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
