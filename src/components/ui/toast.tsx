"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";

interface Toast {
  id: string;
  msg: string;
  tone: Tone;
}

interface ToastAPI {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastCtx = createContext<ToastAPI | null>(null);

const TONE_STYLE: Record<Tone, { box: string; icon: React.ReactNode }> = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: <AlertCircle className="size-4 text-red-600" aria-hidden /> },
  info: { box: "border-blue-200 bg-blue-50 text-blue-900", icon: <Info className="size-4 text-blue-600" aria-hidden /> },
};

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const api = useMemo<ToastAPI>(
    () =>
      (["success", "error", "info"] as const).reduce<ToastAPI>((acc, key) => {
        acc[key] = (msg: string) => {
          const id = `toast-${++_counter}`;
          setToasts((prev) => [...prev.slice(-4), { id, msg, tone: key }]);
          setTimeout(() => dismiss(id), 4500);
        };
        return acc;
      }, {} as ToastAPI),
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {typeof document !== "undefined" && createPortal(<Toaster toasts={toasts} dismiss={dismiss} />, document.body)}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

function Toaster({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => {
        const s = TONE_STYLE[t.tone];
        return (
          <div
            key={t.id}
            className={cn("pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-top-2", s.box)}
            role="alert"
          >
            <span className="mt-0.5 shrink-0">{s.icon}</span>
            <p className="flex-1 leading-snug">{t.msg}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-brand-500" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}