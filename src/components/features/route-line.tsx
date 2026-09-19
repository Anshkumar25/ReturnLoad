import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Displays an Origin → … → Destination route with via stops. */
export function RouteLine({ origin, via = [], destination, className }: { origin: string; via?: string[]; destination: string; className?: string }) {
  const stops = [origin, ...via, destination];
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1 font-semibold text-slate-900", className)}>
      {stops.map((s, i) => (
        <span key={`${s}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? <ArrowRight className="size-3.5 text-slate-400" aria-hidden /> : null}
          <span>{s}</span>
        </span>
      ))}
    </span>
  );
}