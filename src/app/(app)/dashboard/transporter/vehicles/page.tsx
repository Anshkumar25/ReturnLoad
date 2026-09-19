"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { VehicleCard } from "@/components/features/vehicle-card";
import { VehicleFormModal } from "@/components/features/vehicle-form";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";

export default function TransporterVehiclesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const { data: vehicles, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return [];
    return data.listVehicles(uid);
  });

  const vehiclesArray = vehicles ?? [];

  async function remove(id: string, reg: string) {
    if (typeof window !== "undefined" && !window.confirm(`Remove ${reg} from your fleet?`)) return;
    await data.deleteVehicle(id);
    toast.info(`${reg} removed from your fleet.`);
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Your fleet. Link vehicles to return trips so shippers know exactly what's coming."
        actions={<Button onClick={() => setFormOpen(true)}><Plus className="size-4" aria-hidden />Add vehicle</Button>}
      />

      {loading ? (
        <SpinnerCentered label="Loading your fleet…" />
      ) : vehiclesArray.length === 0 ? (
        <EmptyState icon={Trash2} title="No vehicles registered" description="Add your truck(s) so return trips can be linked to a real vehicle with the correct capacity." action={{ label: "Add your first vehicle", onClick: () => setFormOpen(true) }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehiclesArray.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              footer={
                <button type="button" onClick={() => void remove(v.id, v.registrationNumber)} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700">
                  <Trash2 className="size-3.5" aria-hidden /> Remove
                </button>
              }
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">{plural(vehiclesArray.length, "vehicle")} registered · adding a vehicle never publishes a trip by itself.</p>

      {formOpen ? (
        <VehicleFormModal
          userId={user?.id ?? ""}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            void reload();
            toast.success("Vehicle added to your fleet.");
          }}
        />
      ) : null}
    </>
  );
}