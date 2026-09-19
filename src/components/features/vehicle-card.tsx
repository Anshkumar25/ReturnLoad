"use client";

import { Boxes, Truck as TruckIcon, Weight } from "lucide-react";
import type { Vehicle } from "@/lib/model";
import { VEHICLE_TYPES } from "@/lib/model";
import { fmtTons } from "@/lib/format";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { VehicleStatusBadge } from "@/components/ui/status-badge";

export function VehicleCard({ vehicle, footer }: { vehicle: Vehicle; footer?: React.ReactNode }) {
  const v = VEHICLE_TYPES[vehicle.vehicleType];
  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <TruckIcon className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{vehicle.registrationNumber}</p>
            <p className="text-xs text-slate-500">{v.label}</p>
          </div>
        </div>
        <VehicleStatusBadge status={vehicle.status} />
      </CardBody>
      <CardBody className="border-t border-slate-100 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Weight className="size-4 text-slate-400" aria-hidden />{fmtTons(vehicle.capacityTons)} capacity</span>
          {vehicle.capacityVolumeM3 ? <span className="inline-flex items-center gap-1.5"><Boxes className="size-4 text-slate-400" aria-hidden />{vehicle.capacityVolumeM3} m³</span> : null}
        </div>
      </CardBody>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}