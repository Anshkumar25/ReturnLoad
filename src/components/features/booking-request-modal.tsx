"use client";

import { useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { bookingRequestSchema } from "@/lib/validation";
import type { Load, Trip } from "@/lib/model";
import { VEHICLE_TYPES } from "@/lib/model";
import * as data from "@/lib/data";
import { fmtTons } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

/** Shipper requests a booking for a load on a specific return trip. */
export function BookingRequestModal({ trip, loads, onClose, onDone }: { trip: Trip; loads: Load[]; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const openLoads = loads.filter((l) => l.status === "open");
  const [loadId, setLoadId] = useState(openLoads[0]?.id ?? "");
  const [priceQuote, setPriceQuote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => openLoads.find((l) => l.id === loadId), [openLoads, loadId]);
  const fits = selected ? selected.weight <= trip.availableCapacity : false;

  if (openLoads.length === 0) {
    return (
      <Modal open onClose={onClose} title="Request a booking">
        <EmptyState
          icon={PackagePlus}
          title="Post a load first"
          description="You need an open load before you can request space on a return trip."
          action={{
            component: (
              <Link href="/dashboard/shipper/loads">
                <Button onClick={onClose}>Go to my loads</Button>
              </Link>
            ),
          }}
        />
      </Modal>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const parsed = bookingRequestSchema.safeParse({ tripId: trip.id, loadId, priceQuote: priceQuote || "", message: message || "" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the fields.");
      return;
    }
    setBusy(true);
    const res = await data.createBookingRequest({
      tripId: trip.id,
      loadId: parsed.data.loadId,
      shipperId: user.id,
      transporterId: trip.transporterId,
      priceQuote: parsed.data.priceQuote ? Number(parsed.data.priceQuote) : undefined,
      message: parsed.data.message || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Booking request sent to the transporter.");
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Request this return trip" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-800">{trip.originCity} → {trip.destinationCity}</p>
          <p className="text-slate-500">
            {VEHICLE_TYPES[trip.vehicleType].label} · {fmtTons(trip.availableCapacity)} free on return · returns {new Date(trip.expectedReturnAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>

        <Field label="Which load are you shipping?" required htmlFor="br-load">
          <Select id="br-load" value={loadId} onChange={(e) => setLoadId(e.target.value)}>
            {openLoads.map((l) => (
              <option key={l.id} value={l.id}>{l.goodsType} · {l.pickupCity} → {l.deliveryCity} · {fmtTons(l.weight)}</option>
            ))}
          </Select>
        </Field>

        {selected ? (
          <div className="space-y-2 rounded-lg border px-4 py-3 text-sm">
            <p className="font-medium text-slate-800">{selected.goodsType}</p>
            <p className="text-slate-500">{selected.pickupCity} → {selected.deliveryCity} · {fmtTons(selected.weight)}</p>
            {fits ? (
              <p className="text-xs text-emerald-600">Weight fits the {fmtTons(trip.availableCapacity)} t available. ~{Math.min(100, Math.round((selected.weight / trip.maxCapacity) * 100))}% of truck capacity.</p>
            ) : (
              <p className="text-xs text-amber-700">
                This load ({fmtTons(selected.weight)}) exceeds the {fmtTons(trip.availableCapacity)} t free on this trip — the transporter may decline.
              </p>
            )}
          </div>
        ) : null}

        <Field label="Proposed price (₹, optional)" htmlFor="br-price" hint="A reasonable offer. Transporter negotiates on accept/decline.">
          <Input id="br-price" type="number" min={0} step="any" value={priceQuote} onChange={(e) => setPriceQuote(e.target.value)} placeholder="e.g. 18000" />
        </Field>
        <Field label="Message (optional)" htmlFor="br-message" hint="Contact hours, loading point, urgency…">
          <Textarea id="br-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Need it at our godown before the weekend if possible." />
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!selected}>Send booking request</Button>
        </div>
      </form>
    </Modal>
  );
}