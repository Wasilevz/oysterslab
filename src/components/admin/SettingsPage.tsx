"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  getQRCode,
  getLocationSettings,
  saveLocationSettings,
} from "@/actions/locationActions";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from "@/actions/employeeActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types/database";

export function SettingsPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editRate, setEditRate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newRole, setNewRole] = useState<"employee" | "admin">("employee");
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState(0);
  const [qrCountdown, setQrCountdown] = useState(0);
  const [allowedIPs, setAllowedIPs] = useState<string[]>([""]);
  const [authMode, setAuthMode] = useState<"qr" | "ip">("qr");
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
      setAuthMode(settingsResult.data.authMode as "qr" | "ip");
    }
    if (employeesResult.success && employeesResult.data) {
      setEmployees(employeesResult.data);
    }
    setLoading(false);
  }, []);

  const refreshQR = useCallback(async () => {
    const result = await getQRCode();
    if (result.success && result.data) {
      setQrData(result.data.qrString);
      setQrExpiresAt(result.data.expiresAt);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
    void refreshQR();
  }, [loadSettings, refreshQR]);

  useEffect(() => {
    if (!qrExpiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      setQrCountdown(remaining);
      if (remaining <= 0) {
        void refreshQR();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrExpiresAt, refreshQR]);

  const handleSave = () => {
    const validIPs = allowedIPs.filter((ip) => ip.trim() !== "");
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await saveLocationSettings(validIPs, authMode);
      if (!result.success) {
        setError(result.error ?? "Ошибка сохранения");
        return;
      }
      setSuccess("Настройки сохранены");
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

  const startEdit = (emp: User) => {
    setEditingId(emp.id);
    setEditPosition(emp.position ?? "");
    setEditRate(String(emp.hourly_rate));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPosition("");
    setEditRate("");
  };

  const handleSaveEmployee = async () => {
    if (!editingId) return;
    const rate = Number(editRate);
    if (!Number.isFinite(rate) || rate < 0) {
      setError("Укажите корректную ставку");
      return;
    }

    const result = await updateEmployee(editingId, editPosition, rate);
    if (!result.success) {
      setError(result.error ?? "Ошибка сохранения");
      return;
    }
    setEditingId(null);
    setEditPosition("");
    setEditRate("");
    void loadSettings();
  };

  const handleAddEmployee = async () => {
    const tgId = Number(newTelegramId);
    const rate = Number(newRate);

    if (!newName.trim()) {
      setError("Введите имя");
      return;
    }
    if (!Number.isFinite(tgId) || tgId <= 0) {
      setError("Введите корректный Telegram ID");
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setError("Укажите корректную ставку");
      return;
    }

    const result = await addEmployee(tgId, newName, newRole, newPosition, rate);
    if (!result.success) {
      setError(result.error ?? "Ошибка добавления");
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
      setError(result.error ?? "Ошибка удаления");
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
      <header className="border-b border-zinc-800/60 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Настройки
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Безопасность</h1>
      </header>

      <div className="mt-4 px-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Режим авторизации
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAuthMode("qr")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              authMode === "qr"
                ? "border-blue-500/30 bg-blue-500/10"
                : "border-zinc-800 bg-zinc-900/30"
            }`}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">QR-код</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Сканирование кода</p>
          </button>

          <button
            onClick={() => setAuthMode("ip")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              authMode === "ip"
                ? "border-blue-500/30 bg-blue-500/10"
                : "border-zinc-800 bg-zinc-900/30"
            }`}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">WiFi IP</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Проверка сети</p>
          </button>
        </div>
      </div>

      {authMode === "qr" && (
        <div className="mt-6 px-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">QR-код для входа</p>
              <span className="text-xs text-zinc-500">
                {qrCountdown > 0 ? `${qrCountdown} сек` : "Обновление..."}
              </span>
            </div>

            <div className="flex flex-col items-center">
              {qrData && (
                <div className="rounded-2xl bg-white p-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                    alt="QR Code"
                    width={200}
                    height={200}
                  />
                </div>
              )}

              <div className="mt-4 w-full">
                <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${(qrCountdown / 60) * 100}%` }}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => void refreshQR()}
              >
                Обновить код
              </Button>

              <p className="mt-3 text-center text-[10px] text-zinc-600">
                Сотрудник сканирует код камерой телефона
                <br />
                Код обновляется каждые 60 секунд
              </p>
            </div>
          </div>
        </div>
      )}

      {authMode === "ip" && (
        <div className="mt-6 px-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Разрешённые IP-адреса</p>
            <p className="mb-3 text-[10px] text-zinc-500">
              Сотрудники смогут начать/завершить смену только с этих IP
            </p>

            <div className="space-y-2">
              {allowedIPs.map((ip, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="192.168.1.100"
                    value={ip}
                    onChange={(e) => updateIP(i, e.target.value)}
                  />
                  {allowedIPs.length > 1 && (
                    <button
                      onClick={() => removeIP(i)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-500 hover:border-rose-500/50 hover:text-rose-400"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addIPField}
              className="mt-3 w-full rounded-xl border border-dashed border-zinc-700 py-2 text-xs text-zinc-500 hover:border-blue-500/30 hover:text-blue-400"
            >
              + Добавить IP
            </button>
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        {error && (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm text-emerald-400">{success}</p>
          </div>
        )}
        <Button
          variant="blue"
          className="w-full"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </div>

      <div className="px-4 mt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Сотрудники
          </p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-blue-500/30 hover:text-blue-400"
          >
            {showAddForm ? "Скрыть" : "+ Добавить"}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-400">Новый сотрудник</p>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Имя и фамилия"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Telegram ID"
                value={newTelegramId}
                onChange={(e) => setNewTelegramId(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Должность (например: Официант)"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="Ставка (л/ч)"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewRole("employee")}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    newRole === "employee"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  Сотрудник
                </button>
                <button
                  onClick={() => setNewRole("admin")}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    newRole === "admin"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  Админ
                </button>
              </div>
              <Button
                variant="blue"
                className="w-full"
                onClick={() => void handleAddEmployee()}
              >
                Добавить сотрудника
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
            >
              {editingId === emp.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-white">{emp.full_name}</p>
                  <Input
                    type="text"
                    placeholder="Должность (например: Официант)"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder="Ставка (л/ч)"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={cancelEdit}
                    >
                      Отмена
                    </Button>
                    <Button
                      variant="blue"
                      className="flex-1"
                      onClick={() => void handleSaveEmployee()}
                    >
                      Сохранить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{emp.full_name}</p>
                    {emp.position && (
                      <p className="text-xs text-zinc-400">{emp.position}</p>
                    )}
                    <p className="text-[10px] text-zinc-500">
                      {emp.role === "admin" ? "Админ" : "Сотрудник"} · {emp.hourly_rate} л/ч · TG: {emp.telegram_id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(emp)}
                      className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-blue-500/30 hover:text-blue-400"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => void handleDeleteEmployee(emp.id)}
                      className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-rose-500/30 hover:text-rose-400"
                    >
                      Удалить
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
