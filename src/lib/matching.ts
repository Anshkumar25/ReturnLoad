// ---------------------------------------------------------------------
// ReturnLoad matching engine.
//
// Ranks loads against a transporter's published return trip (and the
// inverse) using a weighted multi-factor model:
//   route direction/alignment, estimated detour, capacity fit, timing,
//   and cargo restrictions.
//
// IMPORTANT HONESTY NOTE: Without a live routing provider, all distances
// and detours are ESTIMATES derived from the built-in city co-ordinate
// table (haversine over a straight-line corridor). The UI must always
// label them as estimates. Nothing here claims live GPS / traffic data.
// ---------------------------------------------------------------------

import type { Load, Trip } from "./model";
import { VEHICLE_TYPES, RATE_PER_TONNE_KM } from "./model";
import {
  cityCoords,
  distanceToCorridorKm,
  haversineKm,
  projectOnCorridor,
  corridorLengthKm,
  type Coords,
} from "./geo";

export type DetourTier = "none" | "minor" | "moderate" | "substantial" | "unknown";
export type MatchReasonKind = "good" | "warn" | "block";

export interface MatchReason {
  key: string;
  label: string;
  detail: string;
  kind: MatchReasonKind;
}

export interface CapacityFit {
  availableTons: number;
  neededTons: number;
  fits: boolean;
  remainingTons: number;
}

export interface MatchSummary {
  compatible: boolean;
  score: number; // 0..100
  scoreLabel: "high" | "medium" | "low";
  reasons: MatchReason[];
  detourKm: number | null;
  detourTier: DetourTier;
  detourLabel: string;
  /** Portion of the return leg (0..100) consumed by this load, or null. */
  routeOverlapPct: number | null;
  returnLegKm: number | null;
  capacityFit: CapacityFit;
}

export interface LoadMatch {
  load: Load;
  match: MatchSummary;
}

export interface TripMatch {
  trip: Trip;
  match: MatchSummary;
}

export interface MatchOptions {
  /** Detour radius within which a load is a "minor" detour (default 50 km). */
  detourMinorKm?: number;
  /** Detour radius within which a load is a "moderate" detour (default 150 km). */
  detourModerateKm?: number;
  /** How far off the corridor a point may still be considered "on route" (default 45 km). */
  corridorRadiusKm?: number;
  /** The delivery may be picked up this many days after the expected return. */
  pickupSlackDays?: number;
  /** Weights per dimension; must sum to ~1. */
  weights?: { route: number; detour: number; capacity: number; timing: number; cargo: number };
}

const DEFAULT_OPTIONS: Required<MatchOptions> = {
  detourMinorKm: 50,
  detourModerateKm: 150,
  corridorRadiusKm: 45,
  pickupSlackDays: 3,
  weights: { route: 0.35, detour: 0.25, capacity: 0.2, timing: 0.12, cargo: 0.08 },
};

function resolveOptions(o?: MatchOptions): Required<MatchOptions> {
  return { ...DEFAULT_OPTIONS, ...o, weights: { ...DEFAULT_OPTIONS.weights, ...(o?.weights ?? {}) } };
}

export function detourTierForKm(km: number | null, o: Required<MatchOptions>): {
  tier: DetourTier;
  label: string;
} {
  if (km === null) return { tier: "unknown", label: "Detour estimate unavailable" };
  if (km <= 0) return { tier: "none", label: "On route — no detour" };
  if (km <= o.detourMinorKm) return { tier: "minor", label: `Minor detour (≈ ${Math.round(km)} km)` };
  if (km <= o.detourModerateKm)
    return { tier: "moderate", label: `Moderate detour (≈ ${Math.round(km)} km)` };
  return { tier: "substantial", label: `Substantial detour (≈ ${Math.round(km)} km)` };
}

export interface EstimatedEconomics {
  routeKm: number | null;
  earnings: number | null;
  operatingCostEstimate: number;
  netEstimate: number | null;
  note: string;
}

/**
 * Illustrative estimate of earnings and operating cost for a load on a
 * trip. Clearly an estimate — shown with a label, never as a live quote.
 */
export function estimateEconomics(load: Load, trip: Trip): EstimatedEconomics {
  const routeKm =
    cityCoords(load.pickupCity) && cityCoords(load.deliveryCity)
      ? Math.round(haversineKm(cityCoords(load.pickupCity)!, cityCoords(load.deliveryCity)!))
      : null;
  const costPerKm = VEHICLE_TYPES[trip.vehicleType]?.costPerKm ?? 34;
  const operatingCostEstimate = routeKm === null ? 0 : Math.round(routeKm * costPerKm);
  const earnings = routeKm === null ? null : Math.round(load.weight * RATE_PER_TONNE_KM * routeKm);
  const netEstimate = earnings === null ? null : earnings - operatingCostEstimate;
  return {
    routeKm,
    earnings,
    operatingCostEstimate,
    netEstimate,
    note: "Illustrative estimate using typical market rates. Not a live quote.",
  };
}

function tripCorridor(trip: Trip): { coords: Coords[]; complete: boolean } {
  const pts = [trip.originCity, ...trip.viaCities, trip.destinationCity]
    .map((c) => cityCoords(c))
    .filter((c): c is Coords => c !== null);
  return { coords: pts, complete: pts.length >= 2 };
}

// ---------------------------------------------------------------------
// Core evaluation — is this load a good fit for this trip's RETURN leg?
// ---------------------------------------------------------------------
export function evaluateLoadForTrip(trip: Trip, load: Load, optsIn?: MatchOptions): MatchSummary {
  const o = resolveOptions(optsIn);
  const reasons: MatchReason[] = [];
  let compatible = true;

  const outbound = tripCorridor(trip);
  const pkCoords = cityCoords(load.pickupCity);
  const dlCoords = cityCoords(load.deliveryCity);
  const geometryOk =
    outbound.complete && pkCoords !== null && dlCoords !== null;

  let routeScore = 0.5;
  let detourKm: number | null = null;
  let overlapPct: number | null = null;
  const returnLegKm: number | null = outbound.complete ? corridorLengthKm(outbound.coords) : null;

  if (!geometryOk) {
    reasons.push({
      key: "route",
      label: "Route estimate unavailable",
      detail: "One of the cities isn't in our reference table, so route fit can't be estimated.",
      kind: "warn",
    });
  } else {
    const pkProj = projectOnCorridor(pkCoords, outbound.coords);
    const dlProj = projectOnCorridor(dlCoords, outbound.coords);
    const pkToCorridor = pkProj ? pkProj.offKm : distanceToCorridorKm(pkCoords, outbound.coords);
    const dlToCorridor = dlProj ? dlProj.offKm : distanceToCorridorKm(dlCoords, outbound.coords);

    const pkOnRoute = pkToCorridor <= o.corridorRadiusKm;
    const dlOnRoute = dlToCorridor <= o.corridorRadiusKm;
    // A return load moves TOWARD the origin: delivery progress < pickup progress.
    const movesTowardOrigin = pkProj !== null && dlProj !== null && dlProj.frac < pkProj.frac - 0.03;

    if (pkOnRoute && dlOnRoute && movesTowardOrigin) {
      routeScore = 1;
      const consumed = Math.max(0, Math.min(1, (pkProj!.frac - dlProj!.frac)));
      overlapPct = returnLegKm ? Math.round(consumed * 100) : null;
      reasons.push({
        key: "route",
        label: "On the return route",
        detail: `Pickup and delivery sit along the return leg${overlapPct !== null ? `; uses ~${overlapPct}% of it` : ""}.`,
        kind: "good",
      });
    } else if (pkOnRoute && dlOnRoute) {
      routeScore = 0.35;
      reasons.push({
        key: "route",
        label: "Moves away from the return route",
        detail: "This load runs the opposite direction, so it isn't suited to the empty return leg.",
        kind: "block",
      });
      compatible = false;
    } else {
      // Off the corridor but still moving in the return direction.
      const progressOk = pkProj !== null && dlProj !== null && dlProj.frac < pkProj.frac - 0.03;
      if (progressOk) {
        routeScore = 0.6;
        reasons.push({
          key: "route",
          label: "Along the return corridor",
          detail: "Somewhat off the straight return route, but heading the right way.",
          kind: "good",
        });
      } else {
        routeScore = 0.3;
        reasons.push({
          key: "route",
          label: "Route fit unclear",
          detail: "Pickup/delivery sit off the return corridor; a detour or head run would be needed.",
          kind: "warn",
        });
      }
    }

    detourKm = Math.round(pkToCorridor + dlToCorridor);
  }

  const det = detourTierForKm(detourKm, o);
  const detourScore =
    det.tier === "none" ? 1 : det.tier === "minor" ? 0.85 : det.tier === "moderate" ? 0.6 : det.tier === "substantial" ? 0.25 : 0.5;
  if (detourKm !== null) {
    reasons.push({ key: "detour", label: det.label, detail: "Estimated extra round-trip kilometres off the return route.", kind: det.tier === "substantial" ? "warn" : "good" });
  } else {
    reasons.push({ key: "detour", label: det.label, detail: "Enable a routing provider (see .env.local.example) for live estimates.", kind: "warn" });
  }

  // Capacity fit (tons; loads are normalized to tons at input).
  const availableTons = trip.availableCapacity;
  const neededTons = load.weight;
  const fits = neededTons <= availableTons;
  const partial = neededTons <= availableTons * 1.15;
  let capacityScore: number;
  const remainingTons = Math.max(0, +(availableTons - neededTons).toFixed(2));
  if (fits) {
    // Closest-fit scoring: a truck that has just enough room ranks highest.
    // A vastly oversized truck still fits, but scores slightly lower so
    // shippers aren't pushed toward paying for far more capacity than they
    // need. (Spec: "capacity ≥ w but minimal leftover: best.")
    const leftoverRatio = availableTons > 0 ? remainingTons / availableTons : 0;
    capacityScore = +(1 - 0.25 * Math.min(1, leftoverRatio)).toFixed(2);
    reasons.push({
      key: "capacity",
      label: "Capacity fits",
      detail: `${neededTons} t fits in the available ${availableTons} t — ${remainingTons} t left for more loads.`,
      kind: "good",
    });
  } else if (partial) {
    capacityScore = 0.55;
    reasons.push({
      key: "capacity",
      label: "Slightly over capacity",
      detail: `${neededTons} t exceeds the available ${availableTons} t (Δ ≈ ${Math.round(neededTons - availableTons)} t).`,
      kind: "warn",
    });
  } else {
    capacityScore = 0;
    compatible = false;
    reasons.push({
      key: "capacity",
      label: "Exceeds available capacity",
      detail: `${neededTons} t is well above the available ${availableTons} t.`,
      kind: "block",
    });
  }
  const capacityFit: CapacityFit = { availableTons, neededTons, fits, remainingTons };

  // Timing: can the truck pick the goods up around when it returns?
  const ret = new Date(trip.expectedReturnAt).getTime();
  const winS = new Date(load.pickupWindowStart).getTime();
  const winE = new Date(load.pickupWindowEnd).getTime();
  const slackMs = o.pickupSlackDays * 86400000;
  let timingScore: number;
  if (!isFinite(ret) || !isFinite(winS) || !isFinite(winE)) {
    timingScore = 0.5;
    reasons.push({ key: "timing", label: "Timing estimate unavailable", detail: "Dates haven't been provided for comparison.", kind: "warn" });
  } else if (winE < ret) {
    timingScore = 0;
    compatible = false;
    reasons.push({ key: "timing", label: "Pickup ends before return", detail: "The goods must be picked up before this truck is back from its outbound leg.", kind: "block" });
  } else if (winS <= ret) {
    timingScore = 1;
    reasons.push({ key: "timing", label: "Timing fits", detail: "The pickup window overlaps the expected return date.", kind: "good" });
  } else if (winS <= ret + slackMs) {
    timingScore = 0.8;
    reasons.push({ key: "timing", label: "Slight wait after return", detail: `Pickup is up to ${o.pickupSlackDays} days after the expected return — normally acceptable.`, kind: "good" });
  } else if (winS <= ret + 7 * 86400000) {
    timingScore = 0.5;
    reasons.push({ key: "timing", label: "Pickup far after return", detail: "The truck would wait several days. Confirm availability before booking.", kind: "warn" });
  } else {
    timingScore = 0.3;
    reasons.push({ key: "timing", label: "Very late pickup window", detail: "Consider republishing the return trip at a later date instead.", kind: "warn" });
  }

  // Cargo restrictions.
  const loadLabel = load.goodsType.toLowerCase();
  const restrictions = trip.goodsRestrictions.map((r) => r.toLowerCase());
  let cargoScore = 1;
  if (restrictions.length > 0) {
    const hit = restrictions.find((r) => labelMatchesRestriction(load, r, loadLabel));
    if (hit) {
      cargoScore = 0;
      compatible = false;
      reasons.push({ key: "cargo", label: "Restricted cargo", detail: `The transporter has listed "${hit}" as a restriction.`, kind: "block" });
    } else {
      reasons.push({ key: "cargo", label: "Cargo acceptable", detail: "No conflicts with the transporter's listed restrictions.", kind: "good" });
    }
  }

  const w = o.weights;
  const score =
    Math.round(
      100 * (w.route * routeScore + w.detour * detourScore + w.capacity * capacityScore + w.timing * timingScore + w.cargo * cargoScore),
    );

  return {
    compatible,
    score,
    scoreLabel: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    reasons,
    detourKm,
    detourTier: det.tier,
    detourLabel: det.label,
    routeOverlapPct: overlapPct,
    returnLegKm,
    capacityFit,
  };
}

/** Does a restriction string apply to this load? Matches category + free text. Case-insensitive. */
export function labelMatchesRestriction(load: Load, restriction: string, loadLabel: string): boolean {
  const r = restriction.toLowerCase();
  const label = loadLabel.toLowerCase();
  const catLabel = load.goodsCategory.replace("-", " ");
  if (r.includes("hazard") && load.goodsCategory === "hazardous") return true;
  if (r.includes("live") && load.goodsCategory === "live-animal") return true;
  if (r.includes("perish") && load.goodsCategory === "perishable") return true;
  if (r.includes("pharma") && load.goodsCategory === "pharma") return true;
  if (r.includes("food") && (load.goodsCategory === "perishable" || load.goodsCategory === "frozen")) return true;
  const words = r.split(/\s+/);
  return words.some((word) => word.length > 3 && (catLabel.includes(word) || label.includes(word)));
}

/** Rank open loads for a trip, best match first. Incompatible loads are sorted last. */
export function rankLoadsForTrip(trip: Trip, loads: Load[], opts?: MatchOptions): LoadMatch[] {
  return loads
    .map((load) => ({ load, match: evaluateLoadForTrip(trip, load, opts) }))
    .sort((a, b) => Number(b.match.compatible) - Number(a.match.compatible) || b.match.score - a.match.score);
}

/** Rank open trips for a load, best match first. Incompatible trips are sorted last. */
export function rankTripsForLoad(load: Load, trips: Trip[], opts?: MatchOptions): TripMatch[] {
  return trips
    .map((trip) => ({ trip, match: evaluateLoadForTrip(trip, load, opts) }))
    .sort((a, b) => Number(b.match.compatible) - Number(a.match.compatible) || b.match.score - a.match.score);
}