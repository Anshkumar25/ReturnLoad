import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "error";

const STYLES: Record<Tone, { box: string; icon: ReactNode }> = {
  info: {
    box: "border-blue-200 bg-blue-50 text-blue-900",
    icon: <Info className="size-4 text-blue-600" aria-hidden />,
  },
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />,
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <AlertTriangle className="size-4 text-amber-600" aria-hidden />,
  },
  error: {
    box: "border-red-200 bg-red-50 text-red-900",
    icon: <XCircle className="size-4 text-red-600" aria-hidden />,
  },
};

export function Alert({ tone = "info", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  const s = STYLES[tone];
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", s.box, className)}>
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}