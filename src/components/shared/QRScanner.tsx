"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setError("Вставьте данные QR-кода");
      return;
    }
    try {
      const parsed = JSON.parse(manualInput.trim());
      if (parsed.ts && parsed.nonce && parsed.sig) {
        onScan(manualInput.trim());
      } else {
        setError("Неверный формат QR-кода");
      }
    } catch {
      setError("Неверный формат QR-кода");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Сканирование QR</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex flex-col items-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-600">
            <svg className="h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          </div>

          <p className="mb-2 text-center text-sm text-zinc-400">
            Попросите админа показать QR-код
          </p>
          <p className="mb-4 text-center text-xs text-zinc-600">
            Отсканируйте код или вставьте данные вручную
          </p>
        </div>

        <div className="space-y-2">
          <textarea
            placeholder="Вставьте данные QR-кода из камеры..."
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value);
              setError(null);
            }}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500"
            rows={3}
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button
            variant="blue"
            className="w-full"
            onClick={handleManualSubmit}
          >
            Подтвердить
          </Button>
        </div>
      </div>
    </div>
  );
}
