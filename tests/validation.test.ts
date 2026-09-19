// ---------------------------------------------------------------------
// Unit tests for zod validation schemas and normalization helpers.
// ---------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  bookingRequestSchema,
  cancelBookingSchema,
  companySchema,
  loadSchema,
  loginSchema,
  profileSchema,
  reportIssueSchema,
  reviewSchema,
  signupSchema,
  toTons,
  tripSchema,
} from "../src/lib/validation";

describe("signup / login", () => {
  it("accepts a valid transporter signup and lowercases the email", () => {
    const res = signupSchema.safeParse({
      fullName: "Ramesh Kumar",
      email: "Ramesh.Kumar@Example.com",
      password: "secret-pass-1",
      role: "transporter",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe("ramesh.kumar@example.com");
  });

  it("rejects an invalid email, short password, or non-user role", () => {
    expect(signupSchema.safeParse({ fullName: "A", email: "x", password: "abcdefgh", role: "shipper" }).success).toBe(false);
    expect(signupSchema.safeParse({ fullName: "A B", email: "a@b.com", password: "short", role: "shipper" }).success).toBe(false);
    // admin cannot be self-assigned at signup
    expect(signupSchema.safeParse({ fullName: "A B", email: "a@b.com", password: "abcdefgh", role: "admin" }).success).toBe(false);
  });

  it("login requires a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "r@x.com", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "r@x.com", password: "anything" }).success).toBe(true);
  });
});

describe("profile & company", () => {
  it("validates phone numbers and cities", () => {
    expect(profileSchema.safeParse({ fullName: "Ramesh Kumar", phone: "+91 98111 00000", city: "Jaipur" }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: "Ramesh Kumar", phone: "123", city: "Jaipur" }).success).toBe(false);
  });

  it("validates a GSTIN or accepts blank", () => {
    const ok = companySchema.safeParse({ name: "Sharma Roadlines", legalType: "Sole proprietorship", gstin: "07ABCDE1234F1Z5" });
    expect(ok.success).toBe(true);
    const bad = companySchema.safeParse({ name: "Sharma Roadlines", legalType: "Sole proprietorship", gstin: "123" });
    expect(bad.success).toBe(false);
  });
});

describe("tripSchema", () => {
  const base = {
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
    notes: "",
  };

  it("accepts a valid trip", () => {
    expect(tripSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a return before departure", () => {
    const res = tripSchema.safeParse({ ...base, expectedReturnAt: "2026-09-30T06:00:00.000Z" });
    expect(res.success).toBe(false);
  });

  it("rejects available capacity above max capacity", () => {
    expect(tripSchema.safeParse({ ...base, availableCapacity: 9 }).success).toBe(false);
  });

  it("rejects identical origin and destination", () => {
    expect(tripSchema.safeParse({ ...base, destinationCity: "Delhi" }).success).toBe(false);
  });
});

describe("loadSchema", () => {
  const base = {
    pickupCity: "Jaipur",
    deliveryCity: "Delhi",
    goodsType: "Ceramic tiles",
    goodsCategory: "general",
    weight: 3,
    weightUnit: "tons",
    pickupWindowStart: "2026-10-04T06:00:00.000Z",
    pickupWindowEnd: "2026-10-04T18:00:00.000Z",
    deliveryDeadline: "2026-10-06T18:00:00.000Z",
  };

  it("accepts a valid load", () => {
    expect(loadSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a pickup window that ends before it starts", () => {
    const res = loadSchema.safeParse({ ...base, pickupWindowEnd: "2026-10-03T18:00:00.000Z" });
    expect(res.success).toBe(false);
  });

  it("rejects zero/negative weight", () => {
    expect(loadSchema.safeParse({ ...base, weight: "0" }).success).toBe(false);
    expect(loadSchema.safeParse({ ...base, weight: "-2" }).success).toBe(false);
  });
});

describe("workflow schemas", () => {
  it("validates a booking request with an optional quote and message", () => {
    expect(bookingRequestSchema.safeParse({ tripId: "t1", loadId: "l1", priceQuote: "4500", message: "" }).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ tripId: "t1", loadId: "l1", priceQuote: "-5" }).success).toBe(false);
  });

  it("requires a real cancellation reason", () => {
    expect(cancelBookingSchema.safeParse({ cancellationReason: "Vehicle broke down and the run is delayed" }).success).toBe(true);
    expect(cancelBookingSchema.safeParse({ cancellationReason: "no" }).success).toBe(false);
  });

  it("validates reviews and issue reports", () => {
    expect(reviewSchema.safeParse({ rating: 4, comment: "" }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(reportIssueSchema.safeParse({ subjectType: "trip", subjectId: "t1", reason: "No-show", details: "" }).success).toBe(true);
  });
});

describe("toTons normalization", () => {
  it("converts kg to tonnes and keeps tonnes as-is", () => {
    expect(toTons(500, "kg")).toBe(0.5);
    expect(toTons(1000, "kg")).toBe(1);
    expect(toTons(1.5, "tons")).toBe(1.5);
  });
});