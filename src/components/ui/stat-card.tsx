import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "./card";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "brand",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "brand" | "accent" | "green" | "red" | "blue" | "neutral";
  className?: string;
}) {
  const TONE_ICONS: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    accent: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    neutral: "bg-slate-50 text-slate-600",
  };
  return (
    <Card className={cn("border border-slate-200", className)}>
      <CardBody className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TONE_ICONS[tone])}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-600">{label}</p>
          <p className="truncate text-xl font-bold text-slate-900">{value}</p>
        </div>
        {sub ? <p className="shrink-0 text-xs text-slate-500">{sub}</p> : null}
      </CardBody>
    </Card>
  );
}