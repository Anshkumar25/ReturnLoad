"use client";

import type { Load, Trip } from "@/lib/model";
import type { LoadMatch, TripMatch } from "@/lib/matching";
import { estimateEconomics } from "@/lib/matching";
import { fmtDateTime, fmtTons } from "@/lib/format";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { MatchSummaryPanel, EconomicsPanel, MatchCompatiblePill } from "./match-summary";
import { RouteLine } from "./route-line";
import { GOODS_CATEGORIES } from "@/lib/model";

/** A matched LOAD (shown to transporters reviewing loads for one of their trips). */
export function LoadMatchCard({ trip, loadMatch, actions }: { trip: Trip; loadMatch: LoadMatch; actions?: React.ReactNode }) {
  const { load, match } = loadMatch;
  const eco = estimateEconomics(load, trip);
  const cat = GOODS_CATEGORIES.find((c) => c.value === load.goodsCategory)?.label ?? load.goodsCategory;
  return (
    <Card className={match.compatible ? "border-brand-200" : undefined}>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <RouteLine origin={load.pickupCity} destination={load.deliveryCity} />
          <MatchCompatiblePill compatible={match.compatible} />
        </div>
        <p className="text-sm font-medium text-slate-800">{load.goodsType}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span>{cat}</span>
          <span>{fmtTons(load.weight)}</span>
          {load.volumeM3 ? <span>{load.volumeM3} m³</span> : null}
        </div>
        <p className="text-xs text-slate-500">Pickup {fmtDateTime(load.pickupWindowStart)} onward</p>
        <MatchSummaryPanel match={match} />
        <EconomicsPanel eco={eco} />
      </CardBody>
      {actions ? <CardFooter className="flex flex-wrap items-center justify-end gap-2">{actions}</CardFooter> : null}
    </Card>
  );
}

/** A matched TRIP (shown to shippers browsing return trips for their load). */
export function TripMatchCard({ load, tripMatch, actions }: { load: Load; tripMatch: TripMatch; actions?: React.ReactNode }) {
  const { trip, match } = tripMatch;
  const eco = estimateEconomics(load, trip);
  return (
    <Card className={match.compatible ? "border-brand-200" : undefined}>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <RouteLine origin={trip.originCity} via={trip.viaCities} destination={trip.destinationCity} />
          <MatchCompatiblePill compatible={match.compatible} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span>{trip.vehicleType.replace("-", " ")}</span>
          <span>{fmtTons(trip.availableCapacity)} free</span>
          {trip.goodsRestrictions.length ? <span className="text-amber-700">Restricted: {trip.goodsRestrictions.join(", ")}</span> : null}
        </div>
        <p className="text-xs text-slate-500">Returns {fmtDateTime(trip.expectedReturnAt)}</p>
        <MatchSummaryPanel match={match} />
        <EconomicsPanel eco={eco} />
      </CardBody>
      {actions ? <CardFooter className="flex flex-wrap items-center justify-end gap-2">{actions}</CardFooter> : null}
    </Card>
  );
}