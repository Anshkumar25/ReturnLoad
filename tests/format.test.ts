// ---------------------------------------------------------------------
// Unit tests for formatting helpers (INR, dates, weights, plurals).
// ---------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  daysBetween,
  fmtDate,
  fmtDateTime,
  fmtINR,
  fmtKm,
  fmtPercent,
  fmtTons,
  fromDatetimeLocal,
  initials,
  plural,
  toDatetimeLocal,
} from "../src/lib/format";

describe("fmtINR", () => {
  it("formats with the Indian numbering system", () => {
    expect(fmtINR(0)).toBe("₹0");
    expect(fmtINR(100000)).toBe("₹1,00,000");
    expect(fmtINR(12500)).toBe("₹12,500");
  });
});

describe("weights & distances", () => {
  it("formats tonnes as kg below 1t", () => {
    expect(fmtTons(0.5)).toBe("500 kg");
    expect(fmtTons(0.001)).toBe("1 kg"); // 0.001 t === 1 kg
    expect(fmtTons(1)).toBe("1 t");
    expect(fmtTons(1.2)).toBe("1.2 t");
  });

  it("labels distances honestly", () => {
    expect(fmtKm(null)).toBe("estimate unavailable");
    expect(fmtKm(0)).toBe("on route");
    expect(fmtKm(25.6)).toBe("≈ 26 km");
  });

  it("formats percents", () => {
    expect(fmtPercent(12.3)).toBe("12%");
    expect(fmtPercent(null)).toBe("—");
  });
});

describe("plurals & initials", () => {
  it("pluralizes correctly", () => {
    expect(plural(1, "load")).toBe("1 load");
    expect(plural(3, "load")).toBe("3 loads");
    expect(plural(2, "match", "matches")).toBe("2 matches");
  });

  it("derives up to two initials from the first words", () => {
    expect(initials("Ramesh Kumar Sharma")).toBe("RK");
    expect(initials("Meera")).toBe("M");
  });
});

describe("dates", () => {
  it("returns the placeholder for an invalid date", () => {
    expect(fmtDate("")).toBe("—");
    expect(fmtDateTime("garbage")).toBe("—");
  });

  it("round trips through datetime-local and measures day gaps", () => {
    const iso = "2026-10-04T06:30:00.000Z";
    const local = toDatetimeLocal(iso);
    expect(local).not.toBe("");
    expect(new Date(fromDatetimeLocal(local)).toISOString()).toBe(iso);
    expect(daysBetween("2026-10-04T00:00:00.000Z", "2026-10-06T00:00:00.000Z")).toBe(2);
  });
});