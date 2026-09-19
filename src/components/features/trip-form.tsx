"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CityInput } from "./city-input";
import { tripSchema } from "@/lib/validation";
import { VEHICLE_TYPES, VEHICLE_TYPE_OPTIONS } from "@/lib/model";
import type { Vehicle, VehicleType } from "@/lib/model";
import * as data from "@/lib/data";
import { defaultDatetimeLocal, fromDatetimeLocal } from "@/lib/format";

const RESTRICTION_OPTIONS = [
  "Hazardous materials",
  "Live animals",
  "Perishable / food",
  "Pharma / temperature-sensitive",
  "Frozen or chilled goods",
  "Oversized or heavy cargo",
];

export function TripFormModal({ userId, vehicles, onClose, onDone }: { userId: string; vehicles: Vehicle[]; onClose: () => void; onDone: () => void }) {
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [viaCities, setViaCities] = useState("");
  const [departureAt, setDepartureAt] = useState(defaultDatetimeLocal(2, 8));
  const [expectedReturnAt, setExpectedReturnAt] = useState(defaultDatetimeLocal(5, 12));
  const [vehicleType, setVehicleType] = useState<VehicleType>("truck");
  const [maxCapacity, setMaxCapacity] = useState("6");
  const [availableCapacity, setAvailableCapacity] = useState("6");
  const [capacityUnit, setCapacityUnit] = useState<"tons" | "kg" | "m3">("tons");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickVehicleType(type: VehicleType) {
    setVehicleType(type);
    const def = VEHICLE_TYPES[type].defaultCapacityTons;
    setMaxCapacity(String(def));
    setAvailableCapacity(String(def));
  }

  function toggleRestriction(r: string) {
    setRestrictions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = tripSchema.safeParse({
      originCity,
      destinationCity,
      viaCities: viaCities.split(",").map((s) => s.trim()).filter(Boolean),
      departureAt: fromDatetimeLocal(departureAt),
      expectedReturnAt: fromDatetimeLocal(expectedReturnAt),
      vehicleType,
      maxCapacity,
      availableCapacity,
      capacityUnit,
      goodsRestrictions: restrictions,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      await data.createTrip(userId, {
        ...parsed.data,
        notes: parsed.data.notes || undefined,
        companyId: undefined,
        vehicleId: vehicleId || undefined,
      });
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Could not save the trip. Try again.");
      return;
    }
    setBusy(false);
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Publish a return trip" wide>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Tell us where your truck is heading and when it&apos;ll return — the empty return leg is what we match against.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pickup (origin)" required htmlFor="trip-origin" hint="Where the outbound load is picked up.">
            <CityInput id="trip-origin" value={originCity} onChange={(e) => setOriginCity(e.target.value)} />
          </Field>
          <Field label="Outbound destination" required htmlFor="trip-dest">
            <CityInput id="trip-dest" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} />
          </Field>
        </div>

        <Field label="Via stops (optional)" htmlFor="trip-via" hint="Comma-separated, in order — e.g. Gurugram, Rewari">
          <Input id="trip-via" value={viaCities} onChange={(e) => setViaCities(e.target.value)} placeholder="Gurugram, Rewari" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Departure" required htmlFor="trip-depart">
            <Input id="trip-depart" type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} />
          </Field>
          <Field label="Expected return" required htmlFor="trip-return" hint="When the truck will be free for return cargo.">
            <Input id="trip-return" type="datetime-local" value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} />
          </Field>
        </div>

        <Field label="Vehicle type" required htmlFor="trip-vtype">
          <Select id="trip-vtype" value={vehicleType} onChange={(e) => pickVehicleType(e.target.value as VehicleType)}>
            {VEHICLE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>

        {vehicles.length > 0 ? (
          <Field label="Link a registered vehicle (optional)" htmlFor="trip-vehicle">
            <Select id="trip-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Not linked to a specific vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} · {VEHICLE_TYPES[v.vehicleType].label}</option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Max capacity" required htmlFor="trip-cap-max">
            <Input id="trip-cap-max" type="number" min={0} step="0.5" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} />
          </Field>
          <Field label="Available on return" required htmlFor="trip-cap-avail">
            <Input id="trip-cap-avail" type="number" min={0} step="0.5" value={availableCapacity} onChange={(e) => setAvailableCapacity(e.target.value)} />
          </Field>
          <Field label="Capacity unit" required htmlFor="trip-cap-unit">
            <Select id="trip-cap-unit" value={capacityUnit} onChange={(e) => setCapacityUnit(e.target.value as "tons" | "kg" | "m3")}>
              <option value="tons">Tonnes</option>
              <option value="kg">Kilograms</option>
              <option value="m3">Cubic metres</option>
            </Select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Goods you won&apos;t carry</p>
          <div className="flex flex-wrap gap-2">
            {RESTRICTION_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={restrictions.includes(r)}
                onClick={() => toggleRestriction(r)}
                className={
                  restrictions.includes(r)
                    ? "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200"
                    : "rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                }
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Loads matching these are blocked from booking automatically.</p>
        </div>

        <Field label="Notes (optional)" htmlFor="trip-notes" hint="Vehicle specs, loading points, contact hours — shown to shippers.">
          <Textarea id="trip-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Returning empty from Jaipur; forklift available at pickup in Delhi." />
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Publish trip</Button>
        </div>
      </form>
    </Modal>
  );
}