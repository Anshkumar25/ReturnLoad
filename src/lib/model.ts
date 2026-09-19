// ---------------------------------------------------------------------
// ReturnLoad domain model — shared types, enums, and label maps.
// Every module reads from here so the data layer, matching engine, and
// UI stay consistent.
// ---------------------------------------------------------------------

export type Role = "transporter" | "shipper" | "admin";

export type VehicleType =
  | "mini-truck"
  | "truck"
  | "container-20"
  | "container-40"
  | "trailer"
  | "tanker";

export type CapacityUnit = "tons" | "kg" | "m3";

export type VerificationStatus = "unverified" | "pending" | "verified";

export type TripStatus = "active" | "completed" | "cancelled" | "archived";
export type LoadStatus = "open" | "booked" | "completed" | "cancelled" | "archived";
export type BookingStatus = "requested" | "accepted" | "rejected" | "cancelled" | "completed";
export type VehicleStatus = "available" | "on-trip" | "maintenance";
export type IssueStatus = "open" | "resolved" | "dismissed";

export type GoodsCategory =
  | "general"
  | "perishable"
  | "fragile"
  | "hazardous"
  | "oversized"
  | "frozen"
  | "live-animal"
  | "pharma";

export type NotificationType =
  | "booking-request"
  | "booking-accepted"
  | "booking-rejected"
  | "booking-cancelled"
  | "booking-completed"
  | "new-review"
  | "new-match"
  | "verification"
  | "issue";

export interface User {
  id: string;
  email: string;
  /** Present in DEMO MODE only — a deliberately simple hash, never synced to Supabase. */
  passwordHash?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  role: Role;
  fullName: string;
  email: string;
  phone?: string;
  verificationStatus: VerificationStatus;
  companyId?: string | null;
  city?: string;
  /** Admin-only flag. Suspended users cannot sign in on the platform. */
  isSuspended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  ownerId: string;
  name: string;
  legalType: string;
  city?: string;
  description?: string;
  gstin?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  companyId?: string | null;
  registrationNumber: string;
  vehicleType: VehicleType;
  capacityTons: number;
  capacityVolumeM3?: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  transporterId: string;
  companyId?: string | null;
  vehicleId?: string | null;
  originCity: string;
  destinationCity: string;
  /** Intermediate stops on the outbound route, in order. */
  viaCities: string[];
  departureAt: string; // ISO
  expectedReturnAt: string; // ISO
  vehicleType: VehicleType;
  maxCapacity: number; // tons
  /** Remaining return capacity in tons — decreases as bookings are accepted. */
  availableCapacity: number;
  capacityUnit: CapacityUnit;
  /** Cargo the transporter will NOT carry, e.g. "Hazardous". */
  goodsRestrictions: string[];
  notes?: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Load {
  id: string;
  shipperId: string;
  companyId?: string | null;
  pickupCity: string;
  deliveryCity: string;
  /** User-entered goods description, e.g. "Ceramic floor tiles". */
  goodsType: string;
  goodsCategory: GoodsCategory;
  /** Weight, normalized to tons at input time. */
  weight: number;
  volumeM3?: number;
  dimensions?: string;
  pickupWindowStart: string; // ISO
  pickupWindowEnd: string; // ISO
  deliveryDeadline: string; // ISO
  specialHandling?: string;
  status: LoadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tripId: string;
  loadId: string;
  shipperId: string;
  transporterId: string;
  status: BookingStatus;
  quantityTons: number;
  /** Proposed price the shipper offers (INR, illustrative). */
  priceQuote?: number;
  /** Illustrative earnings estimate captured at match time. */
  estimatedEarnings?: number;
  /** Short message from the shipper accompanying the request. */
  message?: string;
  cancellationReason?: string;
  cancelledById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  subjectId: string;
  /** Role of the person leaving the review. */
  authorRole: Role;
  /** Role being reviewed. */
  subjectRole: Role;
  rating: number; // 1..5
  comment?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ReportedIssue {
  id: string;
  reporterId: string;
  subjectType: "user" | "trip" | "load" | "booking";
  subjectId: string;
  /** Short canned reason chosen by the reporter. */
  reason: string;
  details?: string;
  status: IssueStatus;
  createdAt: string;
  resolvedAt?: string;
}

/** Session persisted in DEMO MODE only. */
export interface DemoSession {
  userId: string;
  email: string;
  role: Role;
}

export interface CityPoint {
  city: string;
  lat: number;
  lon: number;
}

// ---------------------------------------------------------------------
// Reference data / labels
// ---------------------------------------------------------------------

export const ROLES: Role[] = ["transporter", "shipper", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  transporter: "Transporter",
  shipper: "Shipper",
  admin: "Administrator",
};

export const VEHICLE_TYPES: Record<
  VehicleType,
  { label: string; shortLabel: string; defaultCapacityTons: number; costPerKm: number }
> = {
  "mini-truck": { label: "Mini truck / Tempo", shortLabel: "Mini", defaultCapacityTons: 1.5, costPerKm: 14 },
  truck: { label: "6-tonne truck", shortLabel: "Truck", defaultCapacityTons: 6, costPerKm: 34 },
  "container-20": { label: "20 ft container", shortLabel: "20 ft", defaultCapacityTons: 14, costPerKm: 48 },
  "container-40": { label: "40 ft container", shortLabel: "40 ft", defaultCapacityTons: 26, costPerKm: 62 },
  trailer: { label: "Trailer / Flatbed", shortLabel: "Trailer", defaultCapacityTons: 20, costPerKm: 55 },
  tanker: { label: "Tanker", shortLabel: "Tanker", defaultCapacityTons: 12, costPerKm: 45 },
};

export const VEHICLE_TYPE_OPTIONS = (Object.keys(VEHICLE_TYPES) as VehicleType[]).map((v) => ({
  value: v,
  label: VEHICLE_TYPES[v].label,
}));

export const GOODS_CATEGORIES: { value: GoodsCategory; label: string }[] = [
  { value: "general", label: "General cargo" },
  { value: "perishable", label: "Perishable" },
  { value: "fragile", label: "Fragile" },
  { value: "hazardous", label: "Hazardous" },
  { value: "oversized", label: "Oversized / heavy" },
  { value: "frozen", label: "Frozen / chilled" },
  { value: "live-animal", label: "Live animals" },
  { value: "pharma", label: "Pharma / temperature-sensitive" },
];

/** Goods categories that most general trucks will not carry. */
export const RESTRICTED_CATEGORIES: GoodsCategory[] = ["hazardous", "live-animal"];

export const CAPACITY_UNIT_LABEL: Record<CapacityUnit, string> = {
  tons: "Tonnes",
  kg: "Kilograms",
  m3: "Cubic metres",
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Verification pending",
  verified: "Verified",
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived by admin",
};

export const LOAD_STATUS_LABEL: Record<LoadStatus, string> = {
  open: "Open",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived by admin",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Available",
  "on-trip": "On trip",
  maintenance: "Maintenance",
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

// ---------------------------------------------------------------------
// Illustrative economics constants (INR). Clearly estimates.
// ---------------------------------------------------------------------
export const RATE_PER_TONNE_KM = 2.6; // ₹ per tonne-km, illustrative market rate
export const DEMO_BADGE = "Demo data";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}