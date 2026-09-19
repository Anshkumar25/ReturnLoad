"use client";

import { AlertTriangle, CheckCircle2, RotateCcw, Scale, XCircle } from "lucide-react";
import type { MatchSummary, EstimatedEconomics } from "@/lib/matching";
import { fmtINR, fmtPercent, fmtTons } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

const KIND_STYLE = {
  good: { icon: CheckCircle2, cls: "text-emerald-600" },
  warn: { icon: AlertTriangle, cls: "text-amber-600" },
  block: { icon: XCircle, cls: "text-red-600" },
} as const;

/** Score ring / bar with label, and match reasons. Marks the estimate nature. */
export function MatchSummaryPanel({ match }: { match: MatchSummary }) {
  const barColor = !match.compatible ? "bg-red-400" : match.score >= 70 ? "bg-brand-600" : match.score >= 40 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="space-y-3">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100">
          <span className={cn("text-lg font-extrabold leading-none", !match.compatible ? "text-red-500" : match.score >= 70 ? "text-brand-700" : match.score >= 40 ? "text-amber-600" : "text-slate-500")}>
            {match.score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold capitalize text-slate-800">{match.scoreLabel} match</p>
            <MatchCompatiblePill compatible={match.compatible} />
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", barColor)} style={{ width: `${match.score}%` }} />
          </div>
        </div>
      </div>

      {/* Reasons */}
      <ul className="space-y-1.5">
        {match.reasons.map((r) => {
          const s = KIND_STYLE[r.kind];
          return (
            <li key={r.key} className="flex items-start gap-2 text-sm">
              <s.icon className={cn("mt-0.5 size-4 shrink-0", s.cls)} aria-hidden />
              <span>
                <span className={cn("font-medium", r.kind === "block" ? "text-red-700" : r.kind === "warn" ? "text-amber-800" : "text-slate-800")}>{r.label}.</span>{" "}
                <span className="text-slate-500">{r.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* Geometry breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <CheckMetric label="Detour" value={match.detourLabel} note="estimate" />
        <CheckMetric label="Route overlap" value={match.routeOverlapPct !== null ? fmtPercent(match.routeOverlapPct) : "—"} note={match.returnLegKm !== null ? `return leg ≈ ${Math.round(match.returnLegKm)} km` : ""} />
        <CheckMetric
          label="Capacity fit"
          value={match.capacityFit.fits ? `${fmtTons(match.capacityFit.availableTons)} free` : `needs ${fmtTons(match.capacityFit.neededTons)}`}
          note={match.capacityFit.fits ? `${fmtTons(match.capacityFit.remainingTons)} would remain` : match.capacityFit.remainingTons <= 0 ? "does not fit" : `over by ${fmtTons(match.capacityFit.neededTons - match.capacityFit.availableTons)}`}
          tone={match.capacityFit.fits ? "good" : "warn"}
        />
      </div>
    </div>
  );
}

export function MatchCompatiblePill({ compatible }: { compatible: boolean }) {
  return compatible ? <Badge tone="green">Fit</Badge> : <Badge tone="red">Not suited</Badge>;
}

function CheckMetric({ label, value, note, tone = "neutral" }: { label: string; value: string; note?: string; tone?: "good" | "warn" | "neutral" }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", tone === "good" ? "border-emerald-200 bg-emerald-50/60" : tone === "warn" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50")}>
      <p className="font-medium text-slate-500">{label}</p>
      <p className={cn("truncate text-sm font-semibold", tone === "good" ? "text-emerald-800" : tone === "warn" ? "text-amber-800" : "text-slate-800")} title={value}>{value}</p>
      {note ? <p className="truncate text-xs text-slate-400" title={note}>{note}</p> : null}
    </div>
  );
}

/** Illustrative economics — always labelled as an estimate, never a quote. */
export function EconomicsPanel({ eco }: { eco: EstimatedEconomics | null }) {
  if (!eco) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <RotateCcw className="size-3.5" aria-hidden /> Estimated economics <Badge tone="accent" className="px-1.5 py-0">Est.</Badge>
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metrics label="Route" value={eco.routeKm !== null ? `≈ ${Math.round(eco.routeKm)} km` : "—"} sub="straight line" />
        <Metrics label="Earnings" value={eco.earnings !== null ? fmtINR(eco.earnings) : "—"} sub="at market rate" tone="brand" />
        <Metrics label="Est. net" value={eco.netEstimate !== null ? fmtINR(eco.netEstimate) : "—"} sub="earnings − fuel & wear" tone={eco.netEstimate !== null && eco.netEstimate < 0 ? "warn" : "neutral"} />
      </div>
      <p className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-400">
        <Scale className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span>{eco.note}</span>
      </p>
    </div>
  );
}

function Metrics({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub: string; tone?: "brand" | "warn" | "neutral" }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("text-sm font-bold", tone === "brand" ? "text-brand-700" : tone === "warn" ? "text-amber-700" : "text-slate-800")}>{value}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}