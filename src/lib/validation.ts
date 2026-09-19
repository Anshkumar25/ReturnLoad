// ---------------------------------------------------------------------
// Form validation schemas (zod) shared by all forms.
// ---------------------------------------------------------------------

import { z } from "zod";
import type { GoodsCategory, VehicleType } from "./model";

const cityName = z.string().trim().min(2, "Enter a city name (at least 2 characters)").max(60);

const isoInstant = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: "Enter a valid date and time",
});

const positiveNum = z.coerce.number("Must be a number").positive("Must be greater than 0");

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["transporter", "shipper"] as const, "Choose whether you're a transporter or a shipper"),
  })
  .strict();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const companySchema = z.object({
  name: z.string().trim().min(2, "Enter your company or business name").max(100),
  legalType: z.string().trim().min(2, "e.g. Sole proprietorship, Pvt Ltd, Partnership").max(60),
  city: cityName.optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .regex(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3})$/, "Enter a valid 15-char GSTIN, or leave blank")
    .optional()
    .or(z.literal("")),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().regex(/^[0-9+ -]{10,15}$/, "Enter a valid phone number").optional().or(z.literal("")),
  city: cityName.optional().or(z.literal("")),
});

export const vehicleTypeSchema = z.enum([
  "mini-truck",
  "truck",
  "container-20",
  "container-40",
  "trailer",
  "tanker",
] as VehicleType[]);

export const vehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(5, "Enter the registration number (e.g. HR 55 AB 1234)")
    .max(15),
  vehicleType: vehicleTypeSchema,
  capacityTons: z.coerce.number().positive("Must be greater than 0").max(60, "Check the capacity — max 60 t"),
  capacityVolumeM3: z.coerce.number().positive().max(200).optional().or(z.literal("")),
});

export const tripSchema = z
  .object({
    originCity: cityName,
    destinationCity: cityName,
    viaCities: z.array(cityName).max(6, "At most 6 via stops"),
    departureAt: isoInstant,
    expectedReturnAt: isoInstant,
    vehicleType: vehicleTypeSchema,
    maxCapacity: z.coerce.number().positive("Must be greater than 0").max(100, "Check the capacity — max 100 t"),
    availableCapacity: z.coerce.number().nonnegative("Can't be negative"),
    capacityUnit: z.enum(["tons", "kg", "m3"] as const),
    goodsRestrictions: z.array(z.string().trim().min(2)).max(8),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((v) => new Date(v.expectedReturnAt).getTime() >= new Date(v.departureAt).getTime(), {
    message: "Expected return must be on or after departure",
    path: ["expectedReturnAt"],
  })
  .refine((v) => Number(v.availableCapacity) <= Number(v.maxCapacity), {
    message: "Available capacity can't exceed maximum capacity",
    path: ["availableCapacity"],
  })
  .refine((v) => v.originCity.trim().toLowerCase() !== v.destinationCity.trim().toLowerCase(), {
    message: "Origin and destination must be different cities",
    path: ["destinationCity"],
  });

export const loadSchema = z
  .object({
    pickupCity: cityName,
    deliveryCity: cityName,
    goodsType: z.string().trim().min(3, "Describe the goods briefly (e.g. 'Ceramic tiles')").max(80),
    goodsCategory: z.enum(
      ["general", "perishable", "fragile", "hazardous", "oversized", "frozen", "live-animal", "pharma"] as GoodsCategory[],
    ),
    weight: positiveNum,
    weightUnit: z.enum(["tons", "kg"] as const),
    volumeM3: z.coerce.number().positive().max(200).optional().or(z.literal("")),
    dimensions: z.string().trim().max(40).optional().or(z.literal("")),
    pickupWindowStart: isoInstant,
    pickupWindowEnd: isoInstant,
    deliveryDeadline: isoInstant,
    specialHandling: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((v) => new Date(v.pickupWindowEnd).getTime() >= new Date(v.pickupWindowStart).getTime(), {
    message: "Pickup window end must be after its start",
    path: ["pickupWindowEnd"],
  });

export const bookingRequestSchema = z.object({
  tripId: z.string().min(1),
  loadId: z.string().min(1),
  priceQuote: z.coerce.number().positive("Enter a positive amount").optional().or(z.literal("")),
  message: z.string().trim().max(300).optional().or(z.literal("")),
});

export const cancelBookingSchema = z.object({
  cancellationReason: z.string().trim().min(10, "Explain why you're cancelling (at least 10 characters)").max(300),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional().or(z.literal("")),
});

export const reportIssueSchema = z.object({
  subjectType: z.enum(["user", "trip", "load", "booking"] as const),
  subjectId: z.string().min(1),
  reason: z.string().trim().min(3, "Choose or write a reason").max(120),
  details: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TripFormValues = z.infer<typeof tripSchema>;
export type LoadFormValues = z.infer<typeof loadSchema>;

/** Convert a kg value to tonnes for storage (inputs can choose tons or kg). */
export function toTons(weight: number, unit: "tons" | "kg"): number {
  return unit === "kg" ? +(weight / 1000).toFixed(3) : +weight.toFixed(2);
}