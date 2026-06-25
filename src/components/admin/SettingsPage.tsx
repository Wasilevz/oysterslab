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
import { TOAST_DURATION_MS } from "@/lib/constants";
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
    const initData = useUserStore.getState().initData ?? "";
    const [settingsResult, employeesResult, locationsResult] = await Promise.all([
      getLocationSettings(initData),
      getEmployees(initData),
      getLocations(initData),
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
      const initData = useUserStore.getState().initData ?? "";
      const res = await fetch("/api/audit?limit=30", {
        headers: { "x-telegram-initdata": initData },
      });
      const data = await res.json();
      if (data.ok) setAuditLogs(data.logs);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSave = () => {
    const validIPs = allowedIPs.filter((ip) => ip.trim() !== "");
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const initData = useUserStore.getState().initData ?? "";
      const result = await saveLocationSettings(validIPs, "ip", initData);
      if (!result.success) {
        setError(result.error ?? t("settings.saveError"));
        return;
      }
      setSuccess(t("settings.saved"));
      setTimeout(() => setSuccess(null), TOAST_DURATION_MS);
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
        setTimeout(() => setSuccess(null), TOAST_DURATION_MS);
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
    if (!Number.isFinite(rate) || rate < 0) { setError(t("settings.invalidRate")); return; }
    const result = await updateEmployee(editingId, editName, editPosition, rate, useUserStore.getState().initData ?? "", editRole, editShiftStart, editLocationId);
    if (!result.success) { setError(result.error ?? t("common.error")); return; }
    cancelEdit();
    void loadSettings();
  };

  const handleAddEmployee = async () => {
    const tgId = Number(newTelegramId);
    const rate = Number(newRate);
    if (!newName.trim()) { setError(t("settings.enterName")); return; }
    if (!Number.isFinite(tgId) || tgId <= 0) { setError(t("settings.enterTelegramId")); return; }
    if (!Number.isFinite(rate) || rate < 0) { setError(t("settings.invalidRate")); return; }
    const result = await addEmployee(tgId, newName, newRole, newPosition, rate, useUserStore.getState().initData ?? "");
    if (!result.success) { setError(result.error ?? t("common.error")); return; }
    setNewName(""); setNewTelegramId(""); setNewPosition(""); setNewRate(""); setNewRole("employee");
    setShowAddForm(false);
    void loadSettings();
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!window.confirm(t("settings.confirmDeleteEmployee"))) return;
    const result = await deleteEmployee(userId, useUserStore.getState().initData ?? "");
    if (!result.success) { setError(result.error ?? t("common.error")); return; }
    void loadSettings();
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) { setError(t("settings.enterLocationName")); return; }
    const result = await addLocation(newLocationName, newLocationAddress, useUserStore.getState().initData ?? "");
    if (!result.success) { setError(result.error ?? t("common.error")); return; }
    setNewLocationName(""); setNewLocationAddress("");
    void loadSettings();
  };

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm(t("settings.confirmDeleteLocation"))) return;
    const result = await deleteLocation(id, useUserStore.getState().initData ?? "");
    if (!result.success) { setError(result.error ?? t("common.error")); return; }
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
          <button onClick={onBack} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
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
              Русский
            </button>
            <button onClick={() => setLocale("ro")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ro" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              Română
            </button>
          </div>
        </div>
      </div>

      {/* IP Location */}
      <div className="mt-4 px-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{t("settings.location")}</p>
          <p className="mb-3 text-xs text-[var(--text-secondary)]">{t("settings.locationDesc")}</p>
          <div className="space-y-2">
            {allowedIPs.map((ip, i) => (
              <div key={i} className="flex gap-2">
                <Input type="text" placeholder={t("settings.ipPlaceholder")} value={ip} onChange={(e) => updateIP(i, e.target.value)} />
                {allowedIPs.length > 1 && (
                  <button onClick={() => removeIP(i)} aria-label={t("nav.remove")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-rose-500/50 hover:text-rose-400">×</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="blue" className="flex-1" onClick={() => void detectMyIP()}>{t("settings.detectIP")}</Button>
            <button onClick={addIPField} aria-label={t("nav.add")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">+</button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">{t("settings.detectIPDesc")}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 mt-4">
        {error && <div className="mb-3 rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 px-4 py-3"><p className="text-sm text-[var(--color-error)]">{error}</p></div>}
        {success && <div className="mb-3 rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 px-4 py-3"><p className="text-sm text-[var(--color-success)]">{success}</p></div>}
        <Button variant="blue" className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? t("common.processing") : t("settings.save")}
        </Button>
      </div>

      {/* Locations - only for superadmin */}
      {isSuperAdmin && (
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{t("settings.locations")}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between rounded-xl border border-[var(--border-color)] px-3 py-2">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{loc.name}</p>
                {loc.address && <p className="text-xs text-[var(--text-secondary)]">{loc.address}</p>}
              </div>
              <button onClick={() => void handleDeleteLocation(loc.id)} className="flex h-11 items-center rounded-lg px-3 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10">{t("settings.delete")}</button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder={t("settings.locationNamePlaceholder")} value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} className="flex-1" />
            <Input placeholder={t("settings.addressPlaceholder2")} value={newLocationAddress} onChange={(e) => setNewLocationAddress(e.target.value)} className="flex-1" />
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
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8">
              <svg className="h-10 w-10 text-[var(--text-secondary)]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-sm text-[var(--text-secondary)]">{t("settings.employees")}</p>
            </div>
          ) : employees.map((emp) => (
            <div key={emp.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
              {editingId === emp.id ? (
                <div className="space-y-2">
                  <Input type="text" placeholder={t("settings.namePlaceholder")} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input type="text" placeholder={t("settings.positionPlaceholder")} value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
                  <Input type="number" inputMode="decimal" step="0.5" min="0" placeholder={t("settings.ratePlaceholder")} value={editRate} onChange={(e) => setEditRate(e.target.value)} />
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">{t("settings.shiftStart")}</label>
                    <input type="time" value={editShiftStart} onChange={(e) => setEditShiftStart(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">{t("settings.locationLabel")}</label>
                    <select value={editLocationId} onChange={(e) => setEditLocationId(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
                      <option value="">{t("settings.noLocation")}</option>
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
                    <p className="text-xs text-[var(--text-secondary)]">
                      {emp.role === "admin" ? t("settings.adminRole") : t("settings.employeeRole")} · {emp.hourly_rate} {t("common.ratePerHour")} · TG: {emp.telegram_id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(emp)} className="flex h-11 items-center rounded-[1440px] border border-[var(--border-color)] px-4 text-xs text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">{t("settings.edit")}</button>
                    <button onClick={() => void handleDeleteEmployee(emp.id)} className="flex h-11 items-center rounded-[1440px] border border-[var(--border-color)] px-4 text-xs text-[var(--text-secondary)] hover:border-rose-500/30 hover:text-rose-500">{t("settings.delete")}</button>
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
          aria-label={t("settings.auditLog")}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
        >
          <span className="text-sm font-semibold text-[var(--text-primary)]">{t("settings.auditLog")}</span>
          <svg className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${showLogs ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showLogs && (
          <div className="mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            {auditLogs.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-secondary)]">{t("settings.noLogs")}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between rounded-xl border border-[var(--border-color)] px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {log.users?.full_name || "System"} — {log.action}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {log.entity_type}{log.details ? `: ${log.details}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")}
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
