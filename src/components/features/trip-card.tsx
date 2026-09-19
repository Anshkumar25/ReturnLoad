"use client";

import { CalendarDays, MapPin, ShieldAlert, Truck as TruckIcon, Weight } from "lucide-react";
import type { Trip } from "@/lib/model";
import { VEHICLE_TYPES } from "@/lib/model";
import { fmtDateTime, fmtTons } from "@/lib/format";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { TripStatusBadge } from "@/components/ui/status-badge";
import { RouteLine } from "./route-line";

export function TripCard({ trip, footer, highlight }: { trip: Trip; footer?: React.ReactNode; highlight?: boolean }) {
  const v = VEHICLE_TYPES[trip.vehicleType];
  const overbooked = trip.availableCapacity <= 0;
  return (
    <Card className={highlight ? "border-brand-300 ring-1 ring-brand-200" : undefined}>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <RouteLine origin={trip.originCity} via={trip.viaCities} destination={trip.destinationCity} />
          <TripStatusBadge status={trip.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><TruckIcon className="size-4 text-slate-400" aria-hidden />{v.label}</span>
          <span className="inline-flex items-center gap-1.5"><Weight className="size-4 text-slate-400" aria-hidden />{fmtTons(trip.availableCapacity)} free of {fmtTons(trip.maxCapacity)}</span>
        </div>
        <div className="space-y-1 text-xs text-slate-500">
          <p className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-slate-400" aria-hidden />Departs {fmtDateTime(trip.departureAt)}</p>
          <p className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-slate-400" aria-hidden />Returns {fmtDateTime(trip.expectedReturnAt)}</p>
        </div>
        {trip.goodsRestrictions.length > 0 ? (
          <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-amber-700">
            <ShieldAlert className="size-3.5" aria-hidden />
            <span className="font-medium">Won’t carry:</span>
            {trip.goodsRestrictions.join(", ")}
          </p>
        ) : null}
        {trip.notes ? <p className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">{trip.notes}</p> : null}
        {overbooked && trip.status === "active" ? (
          <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Return capacity fully booked — no more loads fit on this trip.</p>
        ) : null}
      </CardBody>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}