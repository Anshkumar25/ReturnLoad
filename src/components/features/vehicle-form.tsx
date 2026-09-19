"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { vehicleSchema } from "@/lib/validation";
import { VEHICLE_TYPES, VEHICLE_TYPE_OPTIONS } from "@/lib/model";
import type { VehicleType } from "@/lib/model";
import * as data from "@/lib/data";

export function VehicleFormModal({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("truck");
  const [capacityTons, setCapacityTons] = useState("6");
  const [capacityVolumeM3, setCapacityVolumeM3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickType(type: VehicleType) {
    setVehicleType(type);
    setCapacityTons(String(VEHICLE_TYPES[type].defaultCapacityTons));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = vehicleSchema.safeParse({
      registrationNumber,
      vehicleType,
      capacityTons,
      capacityVolumeM3: capacityVolumeM3 || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      await data.createVehicle(userId, {
        registrationNumber: parsed.data.registrationNumber,
        vehicleType: parsed.data.vehicleType,
        capacityTons: parsed.data.capacityTons,
        capacityVolumeM3: parsed.data.capacityVolumeM3 ? Number(parsed.data.capacityVolumeM3) : undefined,
      });
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not save the vehicle. Try again.");
      return;
    }
    setBusy(false);
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Add a vehicle">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Registration number" required htmlFor="veh-reg" hint="e.g. HR 55 AB 1234">
          <Input id="veh-reg" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="HR 55 AB 1234" />
        </Field>
        <Field label="Vehicle type" required htmlFor="veh-type">
          <Select id="veh-type" value={vehicleType} onChange={(e) => pickType(e.target.value as VehicleType)}>
            {VEHICLE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Capacity (${VEHICLE_TYPES[vehicleType].defaultCapacityTons} t typical)`} required htmlFor="veh-cap">
            <Input id="veh-cap" type="number" min={0} step="0.5" value={capacityTons} onChange={(e) => setCapacityTons(e.target.value)} />
          </Field>
          <Field label="Volume (m³)" htmlFor="veh-vol" hint="Optional">
            <Input id="veh-vol" type="number" min={0} step="any" value={capacityVolumeM3} onChange={(e) => setCapacityVolumeM3(e.target.value)} placeholder="32" />
          </Field>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Add vehicle</Button>
        </div>
      </form>
    </Modal>
  );
}