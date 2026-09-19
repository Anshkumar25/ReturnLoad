"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadMatchCard } from "@/components/features/match-cards";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fmtTons } from "@/lib/format";

export default function TransporterMatchesPage() {
  const { user } = useAuth();
  const { data: trips, loading } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return [];
    const all = await data.listTripsByTransporter(uid);
    return all.filter((t) => t.status === "active" && t.availableCapacity > 0);
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = (trips ?? []).find((t) => t.id === selectedId) ?? (trips ?? [])[0] ?? null;

  if (loading) return <SpinnerCentered label="Loading your trips…" />;

  return (
    <>
      <PageHeader
        title="Match return loads"
        description="Open loads scored against each of your return trips — route fit, detour, capacity, timing and cargo."
      />

      {(trips ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Publish a trip to start matching"
          description="Return trips with available capacity are matched against open loads. Publish one and scored matches will appear here."
          action={{ component: <Link href="/dashboard/transporter/trips"><Button>Publish a return trip</Button></Link> }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Select a trip">
            {(trips ?? []).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected?.id === t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selected?.id === t.id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
                )}
              >
                {t.originCity} → {t.destinationCity} · {fmtTons(t.availableCapacity)}
              </button>
            ))}
          </div>

          {selected ? (
            <MatchesForTrip tripId={selected.id} />
          ) : null}
        </>
      )}
    </>
  );
}

function MatchesForTrip({ tripId }: { tripId: string }) {
  const { data: res, loading, reload } = useAsyncData(async () => {
    const trip = await data.getTrip(tripId);
    if (!trip) return null;
    const matches = await data.getTripMatches(tripId);
    return { trip, matches };
  }, tripId);

  if (loading || !res) return <SpinnerCentered label="Scoring loads…" />;
  const compatible = res.matches.filter((m) => m.match.compatible);

  return (
    <div className="space-y-4">
      <Alert tone="info">
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="size-4" aria-hidden />
          Shippers request bookings on your trips — when you accept, the capacity locks and the load is confirmed. Reach out to shippers you&apos;d like to carry for.
        </span>
      </Alert>

      {compatible.length === 0 ? (
        <EmptyState icon={CalendarRange} title="No compatible loads right now" description="Keep this trip active. We notify you the moment a compatible load is posted near your return route." action={{ component: <Button variant="secondary" onClick={() => void reload()}>Refresh matches</Button> }} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {compatible.map((m) => (
            <LoadMatchCard key={m.load.id} trip={res.trip} loadMatch={m} />
          ))}
        </div>
      )}

      {res.matches.some((m) => !m.match.compatible) ? (
        <details className="mt-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">Show {res.matches.filter((m) => !m.match.compatible).length} loads that don&apos;t fit this trip</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {res.matches.filter((m) => !m.match.compatible).map((m) => (
              <LoadMatchCard key={m.load.id} trip={res.trip} loadMatch={m} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}