// ---------------------------------------------------------------------
// Geography — a small built-in co-ordinate table for major cities,
// haversine distance, and corridor projection helpers.
//
// This backs the city-based matching FALLBACK used when no live routing
// provider is configured. All outputs derived here are ESTIMATES and the
// UI labels them as such. It intentionally does not pretend to know
// exact roads, traffic, or live routes.
// ---------------------------------------------------------------------

export interface Coords {
  lat: number;
  lon: number;
}

/** Approximate co-ordinates for route estimation. Not GPS-accurate. */
const CITY_COORDS: Record<string, Coords> = {
  delhi: { lat: 28.6139, lon: 77.209 },
  newdelhi: { lat: 28.6139, lon: 77.209 },
  gurugram: { lat: 28.4595, lon: 77.0266 },
  gurgaon: { lat: 28.4595, lon: 77.0266 },
  noida: { lat: 28.5355, lon: 77.391 },
  greaternoida: { lat: 28.4744, lon: 77.504 },
  faridabad: { lat: 28.4089, lon: 77.3178 },
  ghaziabad: { lat: 28.6692, lon: 77.4538 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  agra: { lat: 27.1767, lon: 78.0081 },
  mathura: { lat: 27.4924, lon: 77.6737 },
  alwar: { lat: 27.553, lon: 76.6346 },
  kota: { lat: 25.2138, lon: 75.8648 },
  ajmer: { lat: 26.4499, lon: 74.6399 },
  jodhpur: { lat: 26.2389, lon: 73.0243 },
  udaipur: { lat: 24.5854, lon: 73.7125 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  pune: { lat: 18.5204, lon: 73.8567 },
  nashik: { lat: 19.9975, lon: 73.7898 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  surat: { lat: 21.1702, lon: 72.8311 },
  vadodara: { lat: 22.3072, lon: 73.1812 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  gandhinagar: { lat: 23.2156, lon: 72.6369 },
  indore: { lat: 22.7196, lon: 75.8577 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  howrah: { lat: 22.5958, lon: 88.2636 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  kanpur: { lat: 26.4499, lon: 80.3319 },
  varanasi: { lat: 25.3176, lon: 82.9739 },
  allahabad: { lat: 25.4358, lon: 81.8463 },
  prayagraj: { lat: 25.4358, lon: 81.8463 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
  ludhiana: { lat: 30.901, lon: 75.8573 },
  amritsar: { lat: 31.634, lon: 74.8723 },
  jalandhar: { lat: 31.326, lon: 75.5762 },
  patiala: { lat: 30.3398, lon: 76.3869 },
  dehradun: { lat: 30.3165, lon: 78.0322 },
  haridwar: { lat: 29.9457, lon: 78.1642 },
  meerut: { lat: 28.9845, lon: 77.7064 },
  muzaffarnagar: { lat: 29.4727, lon: 77.7086 },
  bikaner: { lat: 28.0229, lon: 73.3119 },
  shimla: { lat: 31.1048, lon: 77.1734 },
  patna: { lat: 25.5941, lon: 85.1376 },
  ranchi: { lat: 23.3441, lon: 85.3096 },
  bhubaneswar: { lat: 20.2961, lon: 85.8245 },
  guwahati: { lat: 26.1445, lon: 91.7362 },
  aurangabad: { lat: 19.8762, lon: 75.3433 },
  belgaum: { lat: 15.8497, lon: 74.4977 },
  goa: { lat: 15.2993, lon: 74.124 },
  mangaluru: { lat: 12.9141, lon: 74.856 },
  mysuru: { lat: 12.2958, lon: 76.6394 },
  vijayawada: { lat: 16.5062, lon: 80.648 },
  visakhapatnam: { lat: 17.6868, lon: 83.2185 },
};

/** List used for UI autocomplete ("Other city" searches still work). */
export const CITY_OPTIONS = Object.keys(CITY_COORDS)
  .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
  .filter((n) => !["Newdelhi", "Gurgaon", "Bangalore", "Howrah", "Allahabad"].includes(n))
  .sort();

/** Normalizes a free-text city name to its lookup key ("New Delhi" -> "newdelhi"). */
export function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/^(the|city|town|district|pin)\d*/, "")
    .trim();
}

export function cityCoords(city: string): Coords | null {
  return CITY_COORDS[normalizeCity(city)] ?? null;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coords, b: Coords): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function cityDistanceKm(a: string, b: string): number | null {
  const ca = cityCoords(a);
  const cb = cityCoords(b);
  if (!ca || !cb) return null;
  return haversineKm(ca, cb);
}

/**
 * Approximate great-circle distance between a point and a polyline
 * corridor. On the small scale of India's inter-city roads this planar
 * approximation is good enough for labelled estimates.
 */
export function distanceToCorridorKm(point: Coords, corridor: Coords[]): number {
  if (corridor.length === 0) return Number.POSITIVE_INFINITY;
  if (corridor.length === 1) return haversineKm(point, corridor[0]);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < corridor.length - 1; i++) {
    best = Math.min(best, pointToSegmentKm(point, corridor[i], corridor[i + 1]));
  }
  return best;
}

function pointToSegmentKm(p: Coords, a: Coords, b: Coords): number {
  // Convert to an approximate equirectangular kilometre plane.
  const toKm = (c: Coords) => ({
    x: c.lon * 111.32 * Math.cos((c.lat * Math.PI) / 180),
    y: c.lat * 111.32,
  });
  const P = toKm(p);
  const A = toKm(a);
  const B = toKm(b);
  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((P.x - A.x) * abx + (P.y - A.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = A.x + t * abx;
  const projY = A.y + t * aby;
  return Math.hypot(P.x - projX, P.y - projY);
}

/**
 * Projects a point onto a corridor and returns (approximate) distance
 * travelled along the corridor from its start, total corridor length,
 * off-corridor distance, and progress fraction 0..1.
 */
export function projectOnCorridor(
  point: Coords,
  corridor: Coords[],
): { distAlongKm: number; totalKm: number; offKm: number; frac: number } | null {
  if (corridor.length === 0) return null;
  if (corridor.length === 1) {
    return { distAlongKm: 0, totalKm: 0, offKm: haversineKm(point, corridor[0]), frac: 0 };
  }
  let travelled = 0;
  let best = Number.POSITIVE_INFINITY;
  let bestDistAlong = 0;
  const bestTotal = corridorLengthKm(corridor) ?? 0;
  for (let i = 0; i < corridor.length - 1; i++) {
    const a = corridor[i];
    const b = corridor[i + 1];
    const segKm = haversineKm(a, b);
    // planar projection for position along segment
    const toKm = (c: Coords) => ({
      x: c.lon * 111.32 * Math.cos((c.lat * Math.PI) / 180),
      y: c.lat * 111.32,
    });
    const P = toKm(point);
    const A = toKm(a);
    const B = toKm(b);
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const len2 = abx * abx + aby * aby;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby) / len2));
    const projX = A.x + t * abx;
    const projY = A.y + t * aby;
    const off = Math.hypot(P.x - projX, P.y - projY) - 0.5; // stop at 0 if inside corridor pseudowidth
    if (off < best) {
      best = Math.max(0, off);
      bestDistAlong = travelled + segKm * t;
    }
    travelled += segKm;
  }
  const frac = bestTotal === 0 ? 0 : Math.max(0, Math.min(1, bestDistAlong / bestTotal));
  return { distAlongKm: bestDistAlong, totalKm: bestTotal, offKm: best, frac };
}

export function corridorLengthKm(corridor: Coords[]): number | null {
  let total = 0;
  for (let i = 0; i < corridor.length - 1; i++) {
    total += haversineKm(corridor[i], corridor[i + 1]);
  }
  return corridor.length === 0 ? null : total;
}