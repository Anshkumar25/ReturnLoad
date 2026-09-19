"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/page-guard";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { TripCard } from "@/components/features/trip-card";
import { LoadCard } from "@/components/features/load-card";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function AdminListingsPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <Listings />
    </RoleGuard>
  );
}

function Listings() {
  const toast = useToast();
  const [tab, setTab] = useState<"trips" | "loads">("trips");
  const { data: res, loading, reload } = useAsyncData(async () => {
    const [users, trips, loads] = await Promise.all([data.listAllUsers(), data.listAllTripsAdmin(), data.listAllLoadsAdmin()]);
    const nameOf = new Map(users.map((u) => [u.profile.userId, `${u.profile.fullName}${u.company?.name ? ` (${u.company.name})` : ""}`]));
    return { nameOf, trips, loads };
  });

  if (loading || !res) return <SpinnerCentered label="Loading listings…" />;

  async function archiveTrip(id: string) {
    await data.archiveTripAdmin(id);
    toast.info("Trip archived and hidden from the marketplace.");
    void reload();
  }
  async function archiveLoad(id: string) {
    await data.archiveLoadAdmin(id);
    toast.info("Load archived and hidden from the marketplace.");
    void reload();
  }

  const trips = res.trips.filter((t) => t.status !== "archived");
  const loads = res.loads.filter((l) => l.status !== "archived");

  return (
    <>
      <PageHeader title="Listings" description="All active trips and loads. Archive anything that shouldn't be on the marketplace." />
      <div className="mb-5 flex gap-2">
        {(["trips", "loads"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", tab === t ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400")}
          >
            {t === "trips" ? `${trips.length} trips` : `${loads.length} loads`}
          </button>
        ))}
      </div>

      {tab === "trips" ? (
        trips.length === 0 ? (
          <EmptyState icon={Archive} title="No active trips" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {trips.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                footer={
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{res.nameOf.get(t.transporterId) ?? "—"}</span>
                    <Button size="sm" variant="subtleDanger" onClick={() => void archiveTrip(t.id)}><Archive className="size-3.5" aria-hidden />Archive</Button>
                  </div>
                }
              />
            ))}
          </div>
        )
      ) : loads.length === 0 ? (
        <EmptyState icon={Archive} title="No active loads" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {loads.map((l) => (
            <LoadCard
              key={l.id}
              load={l}
              footer={
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{res.nameOf.get(l.shipperId) ?? "—"}</span>
                  <Button size="sm" variant="subtleDanger" onClick={() => void archiveLoad(l.id)}><Archive className="size-3.5" aria-hidden />Archive</Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}