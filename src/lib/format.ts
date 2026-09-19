// ---------------------------------------------------------------------
// Formatting helpers — INR, dates, weights, distances. All "estimate"
// values are surfaced with a tilde so callers can label them honestly.
// ---------------------------------------------------------------------

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function fmtINR(n: number): string {
  return inr.format(Math.round(n));
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function fmtDate(iso: string | Date): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function fmtDateTime(iso: string | Date): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function fmtTons(tons: number): string {
  if (tons < 0.001) return `${tons} t`;
  if (tons < 1) return `${Math.round(tons * 1000)} kg`;
  const rounded = Number(tons.toFixed(2));
  return `${rounded} t`.replace(/,/g, "");
}

export function fmtKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "estimate unavailable";
  if (km <= 0) return "on route";
  return `≈ ${Math.round(km)} km`;
}

export function fmtPercent(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return `${Math.round(pct)}%`;
}

/** "1 load", "3 loads" */
export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : (pluralWord ?? `${word}s`)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86400000);
}

/** ISO → value for an <input type="datetime-local">. */
export function toDatetimeLocal(iso: string | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO string (paired with an offset hint for the reader). */
export function fromDatetimeLocal(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** A convenient default: tomorrow at 9am local. */
export function defaultDatetimeLocal(daysAhead = 1, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return toDatetimeLocal(d);
}