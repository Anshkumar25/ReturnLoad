"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarRange, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { TripCard } from "@/components/features/trip-card";
import { TripFormModal } from "@/components/features/trip-form";
import { useToast } from "@/components/ui/toast";

export default function TransporterTripsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const { data: res, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return { trips: [], vehicles: [] };
    const [t, v] = await Promise.all([data.listTripsByTransporter(uid), data.listVehicles(uid)]);
    return { trips: t, vehicles: v };
  });

  if (loading || !res) return <SpinnerCentered label="Loading your trips…" />;
  const { trips, vehicles } = res;
  const active = trips.filter((t) => t.status === "active");
  const others = trips.filter((t) => t.status !== "active");

  async function cancelTrip(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Cancel this trip? Open booking requests will no longer be accepted.")) return;
    await data.cancelTrip(id);
    toast.info("Trip cancelled.");
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Return trips"
        description="Each trip publishes your free return capacity. Shippers request space, and you accept the ones that fit."
        actions={<Button onClick={() => setFormOpen(true)}><Plus className="size-4" aria-hidden />Publish return trip</Button>}
      />

      {active.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={CalendarRange}
            title="No active return trips"
            description="Publish the return leg of your run — cargo heads back to where you came from, and you earn instead of driving empty."
            action={{ label: "Publish a return trip", onClick: () => setFormOpen(true) }}
          />
          {others.length > 0 ? <p className="text-center text-xs text-slate-400">{others.length} past or cancelled trip{others.length > 1 ? "s" : ""} below.</p> : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((t) => (
            <TripCard
              key={t.id}
              trip={t}
              footer={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link href="/dashboard/transporter/matches">
                    <Button size="sm" variant="secondary"><Search className="size-3.5" aria-hidden />Match loads <ArrowRight className="size-3.5" aria-hidden /></Button>
                  </Link>
                  <Button size="sm" variant="subtleDanger" onClick={() => void cancelTrip(t.id)}>Cancel trip</Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {others.length > 0 ? (
        <div className="mt-10 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Past &amp; cancelled</h2>
          <div className="grid gap-4 opacity-70 lg:grid-cols-2">
            {others.slice(0, 6).map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <TripFormModal
          userId={user?.id ?? ""}
          vehicles={vehicles}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            void reload();
            toast.success("Return trip published — shippers can now request it.");
          }}
        />
      ) : null}
    </>
  );
}