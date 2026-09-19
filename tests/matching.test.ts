// ---------------------------------------------------------------------
// Unit tests for the ReturnLoad matching engine.
// Covers the spec's core ranking factors: return-route alignment,
// detour tiers, closest-fit capacity, timing, cargo restrictions, and
// the compatible-first sort order.
// ---------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import type { Load, Trip } from "../src/lib/model";
import { VEHICLE_TYPES } from "../src/lib/model";
import {
  detourTierForKm,
  estimateEconomics,
  evaluateLoadForTrip,
  labelMatchesRestriction,
  rankLoadsForTrip,
  rankTripsForLoad,
  type MatchOptions,
} from "../src/lib/matching";

// A Delhi -> Jaipur outbound run. The RETURN leg (Jaipur -> Delhi) is what
// return loads are matched against.
const BASE_TRIP: Trip = {
  id: "trip-1",
  transporterId: "u-transporter",
  originCity: "Delhi",
  destinationCity: "Jaipur",
  viaCities: [],
  departureAt: "2026-10-01T06:00:00.000Z",
  expectedReturnAt: "2026-10-03T06:00:00.000Z",
  vehicleType: "truck",
  maxCapacity: 6,
  availableCapacity: 4,
  capacityUnit: "tons",
  goodsRestrictions: [],
  status: "active",
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
};

function makeTrip(over: Partial<Trip> = {}): Trip {
  return { ...BASE_TRIP, ...over };
}

function makeLoad(over: Partial<Load> = {}): Load {
  return {
    id: "load-1",
    shipperId: "u-shipper",
    pickupCity: "Jaipur",
    deliveryCity: "Delhi",
    goodsType: "Ceramic floor tiles",
    goodsCategory: "general",
    weight: 3,
    pickupWindowStart: "2026-10-04T06:00:00.000Z",
    pickupWindowEnd: "2026-10-04T18:00:00.000Z",
    deliveryDeadline: "2026-10-06T18:00:00.000Z",
    status: "open",
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    ...over,
  };
}

describe("evaluateLoadForTrip — return-route alignment", () => {
  it("scores a Jaipur→Delhi return load as compatible and on-route", () => {
    const m = evaluateLoadForTrip(makeTrip(), makeLoad());
    expect(m.compatible).toBe(true);
    expect(m.routeOverlapPct).not.toBeNull();
    expect(m.reasons.some((r) => r.key === "route" && r.kind === "good")).toBe(true);
    expect(m.score).toBeGreaterThanOrEqual(70);
  });

  it("blocks a load that runs AWAY from the return route (Delhi→Jaipur)", () => {
    const m = evaluateLoadForTrip(makeTrip(), makeLoad({ pickupCity: "Delhi", deliveryCity: "Jaipur" }));
    expect(m.compatible).toBe(false);
    expect(m.reasons.some((r) => r.key === "route" && r.kind === "block")).toBe(true);
  });
});

describe("evaluateLoadForTrip — detour tiers", () => {
  it("maps detour distance to none/minor/moderate/substantial/unknown", () => {
    const opts: Required<MatchOptions> = {
      detourMinorKm: 50,
      detourModerateKm: 150,
      corridorRadiusKm: 45,
      pickupSlackDays: 3,
      weights: { route: 0.35, detour: 0.25, capacity: 0.2, timing: 0.12, cargo: 0.08 },
    };
    expect(detourTierForKm(null, opts).tier).toBe("unknown");
    expect(detourTierForKm(0, opts).tier).toBe("none");
    expect(detourTierForKm(20, opts).tier).toBe("minor");
    expect(detourTierForKm(100, opts).tier).toBe("moderate");
    expect(detourTierForKm(300, opts).tier).toBe("substantial");
  });
});

describe("evaluateLoadForTrip — capacity (closest fit wins)", () => {
  it("orders exact-capacity fit above an oversized truck (per spec)", () => {
    const load = makeLoad({ weight: 4 });
    const exactFit = evaluateLoadForTrip(makeTrip({ availableCapacity: 4 }), load);
    const looseFit = evaluateLoadForTrip(makeTrip({ availableCapacity: 5 }), load);
    const oversized = evaluateLoadForTrip(makeTrip({ availableCapacity: 10 }), load);

    expect(exactFit.compatible).toBe(true);
    expect(looseFit.compatible).toBe(true);
    expect(oversized.compatible).toBe(true);
    // capacityScore: 4t=1.0, 5t=0.95, 10t=0.85 → closest fit ranks higher.
    expect(exactFit.score).toBeGreaterThan(looseFit.score);
    expect(looseFit.score).toBeGreaterThan(oversized.score);
  });

  it("blocks a load beyond the available capacity", () => {
    const m = evaluateLoadForTrip(makeTrip({ availableCapacity: 3 }), makeLoad({ weight: 4 }));
    expect(m.compatible).toBe(false);
    expect(m.capacityFit.fits).toBe(false);
    expect(m.reasons.some((r) => r.key === "capacity" && r.kind === "block")).toBe(true);
  });
});

describe("evaluateLoadForTrip — timing", () => {
  it("blocks a pickup that ends before the truck returns", () => {
    const m = evaluateLoadForTrip(
      makeTrip({ expectedReturnAt: "2026-10-03T06:00:00.000Z" }),
      makeLoad({
        pickupWindowStart: "2026-10-02T06:00:00.000Z",
        pickupWindowEnd: "2026-10-02T12:00:00.000Z",
      }),
    );
    expect(m.compatible).toBe(false);
    expect(m.reasons.some((r) => r.key === "timing" && r.kind === "block")).toBe(true);
  });

  it("accepts a pickup window that overlaps the expected return date", () => {
    const m = evaluateLoadForTrip(
      makeTrip({ expectedReturnAt: "2026-10-03T06:00:00.000Z" }),
      makeLoad({ pickupWindowStart: "2026-10-03T08:00:00.000Z" }),
    );
    expect(m.compatible).toBe(true);
    expect(m.reasons.some((r) => r.key === "timing" && r.kind === "good")).toBe(true);
  });
});

describe("evaluateLoadForTrip — cargo restrictions", () => {
  it("blocks hazardous goods on a trip that excludes them", () => {
    const m = evaluateLoadForTrip(
      makeTrip({ goodsRestrictions: ["Hazardous materials"] }),
      makeLoad({ goodsCategory: "hazardous", goodsType: "Industrial solvent" }),
    );
    expect(m.compatible).toBe(false);
    expect(m.reasons.some((r) => r.key === "cargo" && r.kind === "block")).toBe(true);
  });

  it("accepts unrestricted goods", () => {
    const m = evaluateLoadForTrip(makeTrip(), makeLoad());
    expect(m.compatible).toBe(true);
  });
});

describe("labelMatchesRestriction", () => {
  it("matches restrictions by goods category", () => {
    const load = makeLoad({ goodsCategory: "hazardous", goodsType: "Paints" });
    expect(labelMatchesRestriction(load, "Hazardous materials", load.goodsType.toLowerCase())).toBe(true);
    const safe = makeLoad();
    expect(labelMatchesRestriction(safe, "Hazardous materials", safe.goodsType.toLowerCase())).toBe(false);
  });
});

describe("rankLoadsForTrip / rankTripsForLoad", () => {
  it("sorts compatible loads first, then by score", () => {
    const trip = makeTrip();
    const loads = [
      makeLoad({ id: "away", pickupCity: "Noida", deliveryCity: "Jaipur", weight: 1 }), // off-route/away
      makeLoad({ id: "general", weight: 1 }),
      makeLoad({ id: "oversized-load", weight: 9 }), // incompatible (exceeds 6 t)
    ];
    const ranked = rankLoadsForTrip(trip, loads);
    expect(ranked[0]!.load.id).toBe("general");
    expect(ranked[0]!.match.compatible).toBe(true);
    expect(ranked[0]!.match.score).toBeGreaterThanOrEqual(ranked[1]!.match.score);
    expect(ranked[2]!.match.compatible).toBe(false);
  });

  it("sorts compatible trips for a load first", () => {
    const load = makeLoad();
    const trips = [
      makeTrip({ id: "t-away", originCity: "Mumbai", destinationCity: "Nagpur" }), // not on the return route
      makeTrip({ id: "t-good" }),
    ];
    const ranked = rankTripsForLoad(load, trips);
    expect(ranked[0]!.trip.id).toBe("t-good");
    expect(ranked[0]!.match.compatible).toBe(true);
  });
});

describe("estimateEconomics", () => {
  it("computes an illustrative net estimate from route km", () => {
    const ec = estimateEconomics(makeLoad({ weight: 3 }), makeTrip());
    expect(ec.routeKm).not.toBeNull();
    expect(ec.routeKm).toBeGreaterThan(100);
    expect(ec.earnings).toBe(Math.round(3 * 2.6 * ec.routeKm!));
    expect(ec.operatingCostEstimate).toBe(Math.round(ec.routeKm! * VEHICLE_TYPES.truck.costPerKm));
    expect(ec.netEstimate).toBe(ec.earnings! - ec.operatingCostEstimate);
    expect(ec.note).toContain("Illustrative");
  });

  it("returns nulls for cities outside the reference table (no fake routing)", () => {
    const ec = estimateEconomics(makeLoad({ pickupCity: "Atlantis", deliveryCity: "Delhi" }), makeTrip());
    expect(ec.routeKm).toBeNull();
    expect(ec.earnings).toBeNull();
    expect(ec.netEstimate).toBeNull();
    expect(ec.operatingCostEstimate).toBe(0);
  });
});