"use client";

import { Boxes, CalendarClock, Package } from "lucide-react";
import type { Load } from "@/lib/model";
import { GOODS_CATEGORIES } from "@/lib/model";
import { fmtDate, fmtDateTime, fmtTons } from "@/lib/format";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { LoadStatusBadge } from "@/components/ui/status-badge";
import { RouteLine } from "./route-line";

export function LoadCard({ load, footer, highlight }: { load: Load; footer?: React.ReactNode; highlight?: boolean }) {
  const cat = GOODS_CATEGORIES.find((c) => c.value === load.goodsCategory)?.label ?? load.goodsCategory;
  return (
    <Card className={highlight ? "border-brand-300 ring-1 ring-brand-200" : undefined}>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <RouteLine origin={load.pickupCity} destination={load.deliveryCity} />
          <LoadStatusBadge status={load.status} />
        </div>
        <p className="text-sm font-medium text-slate-800">{load.goodsType}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Package className="size-4 text-slate-400" aria-hidden />{cat}</span>
          <span className="inline-flex items-center gap-1.5"><Boxes className="size-4 text-slate-400" aria-hidden />{fmtTons(load.weight)}{load.volumeM3 ? ` · ${load.volumeM3} m³` : ""}</span>
        </div>
        <div className="space-y-1 text-xs text-slate-500">
          <p className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-slate-400" aria-hidden />Pickup {fmtDate(load.pickupWindowStart)} – {fmtDate(load.pickupWindowEnd)}</p>
          <p className="inline-flex items-center gap-1.5">Deadline {fmtDateTime(load.deliveryDeadline)}{load.specialHandling ? ` · ${load.specialHandling}` : ""}</p>
        </div>
      </CardBody>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}