"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import type { Role } from "@/lib/model";
import type { BookingStatus } from "@/lib/model";
import type { BookingListItem } from "@/lib/data";
import { BookingCard } from "./booking-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SpinnerCentered } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

const TABS: ("all" | BookingStatus)[] = ["all", "requested", "accepted", "completed", "cancelled", "rejected"];

export function BookingsList({ bookings, loading, role, onReload }: { bookings: BookingListItem[] | null; loading: boolean; role: Role; onReload: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  if (loading || !bookings) return <SpinnerCentered label="Loading bookings…" />;
  const filtered = tab === "all" ? bookings : bookings.filter((b) => b.status === tab);
  const counts = (s: (typeof TABS)[number]) => (s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
            )}
          >
            {t} <span className={cn("ml-1 rounded-full px-1.5 text-[10px]", tab === t ? "bg-white/20" : "bg-slate-100")}>{counts(t)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title={`No ${tab === "all" ? "" : tab + " "}bookings`} description="When a booking appears you'll act on it right here." />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} role={role} onChanged={onReload} />
          ))}
        </div>
      )}
    </div>
  );
}