// ---------------------------------------------------------------------
// Demo mode data store.
//
// When Supabase credentials are not configured, the entire marketplace
// runs against this browser-local store (localStorage). It implements the
// same operations as the Supabase backend so the product is fully usable
// out of the box. It is NOT a production database: auth here is a simple
// hash kept for demo usability and the data is explicitly labelled demo.
// ---------------------------------------------------------------------

import type {
  AppNotification,
  Booking,
  Company,
  DemoSession,
  Load,
  Profile,
  ReportedIssue,
  Review,
  Trip,
  User,
  Vehicle,
  Role,
} from "../model";
import { BOOKING_STATUS_LABEL, GOODS_CATEGORIES, RATE_PER_TONNE_KM, VEHICLE_TYPES, uid } from "../model";
import { cityCoords, haversineKm } from "../geo";

export const DEMO_KEY = "returnload:v1";

interface DBShape {
  users: User[];
  profiles: Profile[];
  companies: Company[];
  vehicles: Vehicle[];
  trips: Trip[];
  loads: Load[];
  bookings: Booking[];
  reviews: Review[];
  notifications: AppNotification[];
  issues: ReportedIssue[];
  session: DemoSession | null;
  seededAt: string | null;
}

// ---------------------------------------------------------------------
// Demo auth helpers (labelled demo-only in the UI). FNV-1a hash keeps
// plaintext passwords out of storage — still NOT production-grade.
// ---------------------------------------------------------------------
function hashPassword(pw: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < pw.length; i++) {
    h ^= pw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + ":" + pw.length;
}

function verifyPassword(pw: string, hash: string | undefined): boolean {
  if (!hash) return false;
  return hashPassword(pw) === hash;
}

const nowIso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const days = (n: number) => n * 86400000;

// ---------------------------------------------------------------------
// Demo password shared by all seeded accounts — shown on the login page.
// ---------------------------------------------------------------------
export const DEMO_PASSWORD = "demo-pass";
export const DEMO_ACCOUNTS = [
  { role: "transporter", email: "transporter@returnload.demo", fullName: "Ramesh Sharma" },
  { role: "shipper", email: "shipper@returnload.demo", fullName: "Meera Prakash" },
  { role: "admin", email: "admin@returnload.demo", fullName: "Portal Admin" },
];

// ---------------------------------------------------------------------
// Seeded, clearly-labelled DEMO DATA. The headline scenario mirrors the
// product brief: a truck Delhi -> Jaipur returning empty can pick a
// Jaipur -> Delhi load and earn instead of running without cargo.
// ---------------------------------------------------------------------
function buildSeed(): DBShape {
  const users: User[] = [
    { id: "demo-admin", email: "admin@returnload.demo", passwordHash: hashPassword(DEMO_PASSWORD), createdAt: nowIso(-days(30)) },
    { id: "demo-transporter", email: "transporter@returnload.demo", passwordHash: hashPassword(DEMO_PASSWORD), createdAt: nowIso(-days(28)) },
    { id: "demo-shipper", email: "shipper@returnload.demo", passwordHash: hashPassword(DEMO_PASSWORD), createdAt: nowIso(-days(28)) },
    { id: "demo-trailer", email: "anil@returnload.demo", passwordHash: hashPassword(DEMO_PASSWORD), createdAt: nowIso(-days(20)) },
    { id: "demo-retail", email: "retail@returnload.demo", passwordHash: hashPassword(DEMO_PASSWORD), createdAt: nowIso(-days(15)) },
  ];
  const profiles: Profile[] = [
    {
      id: "demo-admin", userId: "demo-admin", role: "admin", fullName: "Portal Admin",
      email: "admin@returnload.demo", verificationStatus: "verified", createdAt: nowIso(-days(30)), updatedAt: nowIso(-days(30)),
    },
    {
      id: "demo-transporter", userId: "demo-transporter", role: "transporter", fullName: "Ramesh Sharma",
      email: "transporter@returnload.demo", phone: "+91 98110 22233", verificationStatus: "verified",
      companyId: "demo-co-sharma", city: "Delhi", createdAt: nowIso(-days(28)), updatedAt: nowIso(-days(3)),
    },
    {
      id: "demo-shipper", userId: "demo-shipper", role: "shipper", fullName: "Meera Prakash",
      email: "shipper@returnload.demo", phone: "+91 98713 45678", verificationStatus: "verified",
      companyId: "demo-co-prakash", city: "Jaipur", createdAt: nowIso(-days(28)), updatedAt: nowIso(-days(4)),
    },
    {
      id: "demo-trailer", userId: "demo-trailer", role: "transporter", fullName: "Anil Kumar",
      email: "anil@returnload.demo", phone: "+91 99870 11223", verificationStatus: "verified",
      companyId: "demo-co-anil", city: "Mumbai", createdAt: nowIso(-days(20)), updatedAt: nowIso(-days(2)),
    },
    {
      id: "demo-retail", userId: "demo-retail", role: "shipper", fullName: "Sneha Reddy",
      email: "retail@returnload.demo", phone: "+91 90080 77665", verificationStatus: "unverified",
      companyId: "demo-co-metro", city: "Bangalore", createdAt: nowIso(-days(15)), updatedAt: nowIso(-days(15)),
    },
  ];
  const companies: Company[] = [
    { id: "demo-co-sharma", ownerId: "demo-transporter", name: "Sharma Roadlines", legalType: "Proprietorship", city: "Delhi", description: "Delhi-based truck operator, daily Delhi–Jaipur and Delhi–Punjab runs.", gstin: "07ABCDE1234F1Z5", verified: true, createdAt: nowIso(-days(28)), updatedAt: nowIso(-days(3)) },
    { id: "demo-co-prakash", ownerId: "demo-shipper", name: "Prakash Wholesale", legalType: "Partnership", city: "Jaipur", description: "Wholesale distributor of spices, food staples and textiles across Rajasthan and NCR.", gstin: "08PQRSX5678K2M3", verified: true, createdAt: nowIso(-days(28)), updatedAt: nowIso(-days(4)) },
    { id: "demo-co-anil", ownerId: "demo-trailer", name: "Anil Transport Co.", legalType: "Sole proprietorship", city: "Mumbai", description: "Trailer / flatbed operator running Maharashtra–Karnataka lanes.", gstin: "27LMNOP9012G3H4", verified: true, createdAt: nowIso(-days(20)), updatedAt: nowIso(-days(2)) },
    { id: "demo-co-metro", ownerId: "demo-retail", name: "Metro Mart Retail", legalType: "Pvt Ltd", city: "Bangalore", description: "Multi-city retail chain stocking apparel, homeware and electronics.", verified: false, createdAt: nowIso(-days(15)), updatedAt: nowIso(-days(15)) },
  ];
  const vehicles: Vehicle[] = [
    { id: "veh-sharma-1", ownerId: "demo-transporter", companyId: "demo-co-sharma", registrationNumber: "HR 55 AB 1234", vehicleType: "truck", capacityTons: 6, capacityVolumeM3: 32, status: "available", createdAt: nowIso(-days(27)), updatedAt: nowIso(-days(5)) },
    { id: "veh-sharma-2", ownerId: "demo-transporter", companyId: "demo-co-sharma", registrationNumber: "DL 01 CD 5678", vehicleType: "container-20", capacityTons: 14, capacityVolumeM3: 28, status: "available", createdAt: nowIso(-days(26)), updatedAt: nowIso(-days(5)) },
    { id: "veh-anil-1", ownerId: "demo-trailer", companyId: "demo-co-anil", registrationNumber: "MH 12 TT 9090", vehicleType: "trailer", capacityTons: 20, capacityVolumeM3: 55, status: "available", createdAt: nowIso(-days(19)), updatedAt: nowIso(-days(2)) },
  ];
  const trips: Trip[] = [
    {
      id: "trip-return-dl-jp", transporterId: "demo-transporter", companyId: "demo-co-sharma", vehicleId: "veh-sharma-1",
      originCity: "Delhi", destinationCity: "Jaipur", viaCities: ["Gurugram"],
      departureAt: nowIso(days(4) + 6 * 3600000), expectedReturnAt: nowIso(days(7) + 18 * 3600000),
      vehicleType: "truck", maxCapacity: 6, availableCapacity: 5.5, capacityUnit: "tons",
      goodsRestrictions: ["Hazardous", "Live animals"],
      notes: "Delivering auto parts to Jaipur. Return leg to Delhi is open — looking for return cargo.",
      status: "active", createdAt: nowIso(-days(2)), updatedAt: nowIso(-days(1)),
    },
    {
      id: "trip-anil-mum-pune", transporterId: "demo-trailer", companyId: "demo-co-anil", vehicleId: "veh-anil-1",
      originCity: "Mumbai", destinationCity: "Pune", viaCities: [],
      departureAt: nowIso(days(3) + 7 * 3600000), expectedReturnAt: nowIso(days(6) + 14 * 3600000),
      vehicleType: "trailer", maxCapacity: 20, availableCapacity: 20, capacityUnit: "tons",
      goodsRestrictions: ["Hazardous"],
      notes: "Empty trailer returning from Pune — can carry up to 20 t.",
      status: "active", createdAt: nowIso(-days(1)), updatedAt: nowIso(-days(1)),
    },
    {
      id: "trip-sharma-jp-again", transporterId: "demo-transporter", companyId: "demo-co-sharma", vehicleId: "veh-sharma-2",
      originCity: "Jaipur", destinationCity: "Delhi", viaCities: [],
      departureAt: nowIso(days(2) + 8 * 3600000), expectedReturnAt: nowIso(days(9) + 12 * 3600000),
      vehicleType: "container-20", maxCapacity: 14, availableCapacity: 14, capacityUnit: "tons",
      goodsRestrictions: [],
      notes: "20 ft container moving Jaipur→Delhi; will also be returning from Delhi later in the week.",
      status: "active", createdAt: nowIso(-days(1)), updatedAt: nowIso(-days(1)),
    },
  ];
  const loads: Load[] = [
    {
      id: "load-spices-jp-dl", shipperId: "demo-shipper", companyId: "demo-co-prakash",
      pickupCity: "Jaipur", deliveryCity: "Delhi", goodsType: "Packaged spices (750 cartons)",
      goodsCategory: "general", weight: 3.2, volumeM3: 18, dimensions: "3 × 2 × 2 m",
      pickupWindowStart: nowIso(days(7)), pickupWindowEnd: nowIso(days(9) + 12 * 3600000),
      deliveryDeadline: nowIso(days(11)), specialHandling: "Keep dry; stack no higher than 6 cartons.",
      status: "open", createdAt: nowIso(-days(1)), updatedAt: nowIso(-days(1)),
    },
    {
      id: "load-garments-jp-grg", shipperId: "demo-retail", companyId: "demo-co-metro",
      pickupCity: "Jaipur", deliveryCity: "Gurugram", goodsType: "Retail garments (export packing)",
      goodsCategory: "fragile", weight: 2, volumeM3: 9,
      pickupWindowStart: nowIso(days(8)), pickupWindowEnd: nowIso(days(10)), deliveryDeadline: nowIso(days(12)),
      specialHandling: "Handle with care — export cartons.",
      status: "open", createdAt: nowIso(-days(1)), updatedAt: nowIso(-days(1)),
    },
    {
      id: "load-electronics-mum-blr", shipperId: "demo-retail", companyId: "demo-co-metro",
      pickupCity: "Mumbai", deliveryCity: "Bangalore", goodsType: "Electronics (televisions)",
      goodsCategory: "fragile", weight: 4, volumeM3: 12,
      pickupWindowStart: nowIso(days(6)), pickupWindowEnd: nowIso(days(8)), deliveryDeadline: nowIso(days(13)),
      specialHandling: "Fragile — avoid stacking.",
      status: "open", createdAt: nowIso(-days(2)), updatedAt: nowIso(-days(2)),
    },
    {
      id: "load-machinery-dl-ldh", shipperId: "demo-shipper", companyId: "demo-co-prakash",
      pickupCity: "Delhi", deliveryCity: "Ludhiana", goodsType: "Machinery spares",
      goodsCategory: "oversized", weight: 5, volumeM3: 22, dimensions: "4 × 1.5 × 1.5 m",
      pickupWindowStart: nowIso(days(5)), pickupWindowEnd: nowIso(days(7)), deliveryDeadline: nowIso(days(10)),
      specialHandling: "Open-top / flatbed preferred; forklift at both ends.",
      status: "open", createdAt: nowIso(-days(3)), updatedAt: nowIso(-days(3)),
    },
    {
      id: "load-textiles-aj-dl", shipperId: "demo-shipper", companyId: "demo-co-prakash",
      pickupCity: "Ajmer", deliveryCity: "Delhi", goodsType: "Room textiles (bale lots)",
      goodsCategory: "general", weight: 2.2, volumeM3: 11,
      pickupWindowStart: nowIso(days(9)), pickupWindowEnd: nowIso(days(10)), deliveryDeadline: nowIso(days(14)),
      specialHandling: "",
      status: "open", createdAt: nowIso(-days(2)), updatedAt: nowIso(-days(2)),
    },
  ];
  const bookings: Booking[] = [
    {
      id: "bk-req-spices", tripId: "trip-return-dl-jp", loadId: "load-spices-jp-dl",
      shipperId: "demo-shipper", transporterId: "demo-transporter", status: "requested",
      quantityTons: 3.2, estimatedEarnings: Math.round(3.2 * RATE_PER_TONNE_KM * 270),
      message: "Need this shifted to our NCR godown by the weekend if possible.",
      createdAt: nowIso(-days(1)), updatedAt: nowIso(-days(1)),
    },
    {
      id: "bk-accept-tex", tripId: "trip-anil-mum-pune", loadId: "load-electronics-mum-blr",
      shipperId: "demo-retail", transporterId: "demo-trailer", status: "accepted",
      quantityTons: 4, priceQuote: 34000, estimatedEarnings: Math.round(4 * RATE_PER_TONNE_KM * 985),
      message: "Price okay, please confirm pickup at our warehouse at BKC.",
      createdAt: nowIso(-days(1)), updatedAt: nowIso(-days(1)),
    },
    {
      id: "bk-complete-old", tripId: "trip-anil-mum-pune", loadId: "load-machinery-dl-ldh",
      shipperId: "demo-retail", transporterId: "demo-trailer", status: "completed",
      quantityTons: 4, priceQuote: 29000, estimatedEarnings: 30000,
      message: "Thank you!",
      createdAt: nowIso(-days(40)), updatedAt: nowIso(-days(38)),
    },
  ];
  const reviews: Review[] = [
    { id: "rev-1", bookingId: "bk-complete-old", authorId: "demo-retail", subjectId: "demo-trailer", authorRole: "shipper", subjectRole: "transporter", rating: 5, comment: "Anil was punctual and careful with fragile electronics. Would book again.", createdAt: nowIso(-days(38)) },
    { id: "rev-2", bookingId: "bk-complete-old", authorId: "demo-trailer", subjectId: "demo-retail", authorRole: "transporter", subjectRole: "shipper", rating: 5, comment: "Very smooth pickup — warehouse staff ready to load at arrival time.", createdAt: nowIso(-days(38)) },
  ];
  const notifications: AppNotification[] = [
    { id: uid(), userId: "demo-transporter", type: "booking-request", title: "New booking request", body: `Prakash Wholesale requested your ${tripLabel(trips[0])} for 3.2 t of spices (${BOOKING_STATUS_LABEL.requested}).`, link: "/dashboard/transporter/bookings", read: false, createdAt: nowIso(-days(1)) },
    { id: uid(), userId: "demo-shipper", type: "booking-accepted", title: "Booking accepted", body: "Anil Transport Co. accepted your Mumbai→Bangalore electronics haul.", link: "/dashboard/shipper/bookings", read: false, createdAt: nowIso(-days(1)) },
    { id: uid(), userId: "demo-shipper", type: "verification", title: "Profile verified", body: "Prakash Wholesale is verified on ReturnLoad.", link: "/dashboard/profile", read: true, createdAt: nowIso(-days(4)) },
  ];
  const issues: ReportedIssue[] = [
    {
      id: "issue-1", reporterId: "demo-retail", subjectType: "trip", subjectId: "trip-anil-mum-pune",
      reason: "Suspected vehicle mismatch", details: "The promised trailer class seems larger than stated.",
      status: "open", createdAt: nowIso(-days(2)),
    },
  ];
  return { users, profiles, companies, vehicles, trips, loads, bookings, reviews, notifications, issues, seededAt: nowIso(), session: null };
}

function tripLabel(t: Trip): string {
  return `${t.originCity} → ${t.destinationCity}`;
}

// ---------------------------------------------------------------------
// LocalDB — state + operations, persisted to localStorage.
// ---------------------------------------------------------------------
class LocalDB {
  private db: DBShape;

  constructor() {
    this.db = this.load();
  }

  private load(): DBShape {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DBShape;
        if (parsed && Array.isArray(parsed.users)) return parsed;
      }
    } catch {
      // storage unavailable or corrupt — fall through to a fresh seed
    }
    const seed = buildSeed();
    this.persist(seed);
    return seed;
  }

  private persist(db: DBShape) {
    this.db = db;
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(db));
    } catch {
      // quota / private mode — keep state in memory for the session
    }
  }

  private save() {
    this.persist(this.db);
  }

  /** Drop everything and re-seed the clearly-labelled demo data. */
  resetDemo() {
    this.persist(buildSeed());
  }

  isSeeded(): boolean {
    return this.db.seededAt !== null;
  }

  // ---------- Auth (demo-only) ----------
  findUserByEmail(email: string): User | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  signUpDemo(input: { fullName: string; email: string; password: string; role: Role }): { ok: true; session: DemoSession } | { ok: false; error: string } {
    const email = input.email.trim().toLowerCase();
    if (this.findUserByEmail(email)) return { ok: false, error: "An account with this email already exists." };
    const id = uid();
    const user: User = { id, email, passwordHash: hashPassword(input.password), createdAt: nowIso() };
    const profile: Profile = {
      id, userId: id, role: input.role, fullName: input.fullName.trim(), email,
      verificationStatus: "unverified", createdAt: nowIso(), updatedAt: nowIso(),
    };
    this.db.users.push(user);
    this.db.profiles.push(profile);
    this.db.session = { userId: id, email, role: input.role };
    this.save();
    return { ok: true, session: this.db.session };
  }

  signInDemo(email: string, password: string): { ok: true; session: DemoSession } | { ok: false; error: string } {
    const user = this.findUserByEmail(email);
    const profile = user ? this.db.profiles.find((p) => p.userId === user.id) : undefined;
    if (!user || !profile) return { ok: false, error: "No account found with this email." };
    if (!verifyPassword(password, user.passwordHash)) return { ok: false, error: "Incorrect password. Try the demo accounts." };
    if (profile.isSuspended) return { ok: false, error: "This account has been suspended by an administrator." };
    this.db.session = { userId: user.id, email: user.email, role: profile.role };
    this.save();
    return { ok: true, session: this.db.session };
  }

  signOutDemo() {
    this.db.session = null;
    this.save();
  }

  getSession(): DemoSession | null {
    if (!this.db.session) return null;
    const profile = this.db.profiles.find((p) => p.userId === this.db.session!.userId);
    if (!profile || profile.isSuspended) {
      this.db.session = null;
      this.save();
      return null;
    }
    return this.db.session;
  }

  // ---------- Profiles ----------
  getProfile(userId: string): Profile | undefined {
    return this.db.profiles.find((p) => p.userId === userId);
  }

  saveProfile(userId: string, patch: Partial<Pick<Profile, "fullName" | "phone" | "city" | "companyId" | "verificationStatus" | "isSuspended">>): Profile {
    const p = this.getProfile(userId);
    if (!p) throw new Error("Profile not found");
    Object.assign(p, patch, { updatedAt: nowIso() });
    this.save();
    return p;
  }

  allProfiles(): Profile[] {
    return [...this.db.profiles];
  }

  // ---------- Companies ----------
  getCompanyByOwner(ownerId: string): Company | undefined {
    return this.db.companies.find((c) => c.ownerId === ownerId);
  }

  createCompany(ownerId: string, input: { name: string; legalType: string; city?: string; description?: string; gstin?: string }): Company {
    const company: Company = {
      id: uid(), ownerId, name: input.name.trim(), legalType: input.legalType.trim(),
      city: input.city || undefined, description: input.description || undefined, gstin: input.gstin || undefined,
      verified: false, createdAt: nowIso(), updatedAt: nowIso(),
    };
    this.db.companies.push(company);
    this.save();
    return company;
  }

  updateCompany(id: string, patch: Partial<Pick<Company, "name" | "legalType" | "city" | "description" | "gstin" | "verified">>): Company | undefined {
    const c = this.db.companies.find((x) => x.id === id);
    if (!c) return undefined;
    Object.assign(c, patch, { updatedAt: nowIso() });
    this.save();
    return c;
  }

  allCompanies(): Company[] {
    return [...this.db.companies];
  }

  // ---------- Vehicles ----------
  listVehiclesOwned(ownerId: string): Vehicle[] {
    return this.db.vehicles.filter((v) => v.ownerId === ownerId);
  }

  createVehicle(ownerId: string, input: Partial<Vehicle> & { registrationNumber: string; vehicleType: Vehicle["vehicleType"]; capacityTons: number }): Vehicle {
    const vehicle: Vehicle = {
      id: uid(), ownerId, companyId: input.companyId ?? null,
      registrationNumber: input.registrationNumber.trim().toUpperCase(),
      vehicleType: input.vehicleType, capacityTons: input.capacityTons,
      capacityVolumeM3: input.capacityVolumeM3,
      status: "available", createdAt: nowIso(), updatedAt: nowIso(),
    };
    this.db.vehicles.push(vehicle);
    this.save();
    return vehicle;
  }

  updateVehicle(id: string, patch: Partial<Pick<Vehicle, "status" | "registrationNumber" | "vehicleType" | "capacityTons" | "capacityVolumeM3">>): Vehicle | undefined {
    const v = this.db.vehicles.find((x) => x.id === id);
    if (!v) return undefined;
    Object.assign(v, patch, { updatedAt: nowIso() });
    this.save();
    return v;
  }

  deleteVehicle(id: string): void {
    this.db.vehicles = this.db.vehicles.filter((v) => v.id !== id);
    this.save();
  }

  getVehicle(id: string | null | undefined): Vehicle | undefined {
    return this.db.vehicles.find((v) => v.id === id);
  }

  // ---------- Trips ----------
  listTripsOwned(transporterId: string): Trip[] {
    return this.db.trips
      .filter((t) => t.transporterId === transporterId && t.status !== "archived")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  getTrip(id: string): Trip | undefined {
    return this.db.trips.find((t) => t.id === id);
  }

  listOpenTrips(): Trip[] {
    return this.db.trips
      .filter((t) => t.status === "active" && t.availableCapacity > 0)
      .sort((a, b) => +new Date(a.expectedReturnAt) - +new Date(b.expectedReturnAt));
  }

  createTrip(transporterId: string, input: Omit<Trip, "id" | "transporterId" | "status" | "createdAt" | "updatedAt">): Trip {
    const trip: Trip = {
      ...input,
      id: uid(),
      transporterId,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.db.trips.push(trip);
    this.save();
    return trip;
  }

  updateTrip(id: string, patch: Partial<Pick<Trip, "status" | "availableCapacity" | "notes">>): Trip | undefined {
    const t = this.db.trips.find((x) => x.id === id);
    if (!t) return undefined;
    Object.assign(t, patch, { updatedAt: nowIso() });
    this.save();
    return t;
  }

  // ---------- Loads ----------
  listLoadsOwned(shipperId: string): Load[] {
    return this.db.loads
      .filter((l) => l.shipperId === shipperId && l.status !== "archived")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  getLoad(id: string): Load | undefined {
    return this.db.loads.find((l) => l.id === id);
  }

  listOpenLoads(): Load[] {
    return this.db.loads
      .filter((l) => l.status === "open")
      .sort((a, b) => +new Date(a.pickupWindowStart) - +new Date(b.pickupWindowStart));
  }

  createLoad(shipperId: string, input: Omit<Load, "id" | "shipperId" | "status" | "createdAt" | "updatedAt">): Load {
    const load: Load = {
      ...input,
      id: uid(),
      shipperId,
      status: "open",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.db.loads.push(load);
    this.save();
    // Let transporters know about a fresh open load matching their active trips.
    for (const trip of this.listOpenTrips()) {
      if (trip.transporterId !== shipperId) {
        this.pushNotification({
          userId: trip.transporterId,
          type: "new-match",
          title: "New load near your route",
          body: `${load.goodsType} (${load.weight} t) from ${load.pickupCity} → ${load.deliveryCity}.`,
          link: "/dashboard/transporter/matches",
        });
      }
    }
    return load;
  }

  updateLoad(id: string, patch: Partial<Pick<Load, "status">>): Load | undefined {
    const l = this.db.loads.find((x) => x.id === id);
    if (!l) return undefined;
    Object.assign(l, patch, { updatedAt: nowIso() });
    this.save();
    return l;
  }

  // ---------- Bookings ----------
  listBookings(): Booking[] {
    return [...this.db.bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  getBooking(id: string): Booking | undefined {
    return this.db.bookings.find((b) => b.id === id);
  }

  createBookingRequest(input: {
    tripId: string; loadId: string; shipperId: string; transporterId: string;
    priceQuote?: number; message?: string; estimatedEarnings?: number;
  }): { ok: true; booking: Booking } | { ok: false; error: string } {
    const trip = this.getTrip(input.tripId);
    const load = this.getLoad(input.loadId);
    if (!trip || !load) return { ok: false, error: "Trip or load no longer exists." };
    if (trip.status !== "active") return { ok: false, error: "This trip is no longer active." };
    if (load.status !== "open") return { ok: false, error: "This load has already been booked by someone else." };
    if (this.db.bookings.some((b) => b.loadId === input.loadId && b.status === "requested" || b.loadId === input.loadId && b.status === "accepted")) {
      return { ok: false, error: "A booking is already pending or accepted for this load." };
    }
    const quantityTons = Math.min(load.weight, trip.availableCapacity);
    if (quantityTons <= 0) return { ok: false, error: "No return capacity left on this trip." };
    const booking: Booking = {
      id: uid(), tripId: input.tripId, loadId: input.loadId,
      shipperId: input.shipperId, transporterId: input.transporterId, status: "requested",
      quantityTons, priceQuote: input.priceQuote, message: input.message,
      estimatedEarnings: input.estimatedEarnings,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    this.db.bookings.push(booking);
    this.pushNotification({
      userId: input.transporterId,
      type: "booking-request",
      title: "New booking request",
      body: `${this.nameOf(input.shipperId)} requested ${quantityTons} t of "${load.goodsType}" on your ${tripLabel(trip)} trip.`,
      link: "/dashboard/transporter/bookings",
    });
    this.save();
    return { ok: true, booking };
  }

  acceptBooking(bookingId: string): { ok: true; booking: Booking } | { ok: false; error: string } {
    const b = this.getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "requested") return { ok: false, error: "Only requested bookings can be accepted." };
    const trip = this.getTrip(b.tripId);
    if (!trip || trip.status !== "active") return { ok: false, error: "The linked trip is no longer active." };
    const load = this.getLoad(b.loadId);
    if (load && load.status !== "open") return { ok: false, error: "The load is no longer open." };
    if (b.quantityTons > trip.availableCapacity) return { ok: false, error: "Not enough capacity remains on this trip." };
    b.status = "accepted";
    b.updatedAt = nowIso();
    trip.availableCapacity = Math.max(0, +(trip.availableCapacity - b.quantityTons).toFixed(2));
    if (load) {
      load.status = "booked";
      load.updatedAt = nowIso();
    }
    this.pushNotification({
      userId: b.shipperId,
      type: "booking-accepted",
      title: "Booking accepted",
      body: `${this.nameOf(trip.transporterId)} accepted your booking for "${load?.goodsType ?? "goods"}". Your load is confirmed on ${tripLabel(trip)}.`,
      link: "/dashboard/shipper/bookings",
    });
    this.save();
    return { ok: true, booking: b };
  }

  rejectBooking(bookingId: string): { ok: true; booking: Booking } | { ok: false; error: string } {
    const b = this.getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "requested") return { ok: false, error: "Only requested bookings can be rejected." };
    b.status = "rejected";
    b.updatedAt = nowIso();
    this.pushNotification({
      userId: b.shipperId,
      type: "booking-rejected",
      title: "Booking declined",
      body: `${this.nameOf(b.transporterId)} declined your booking request.`, link: "/dashboard/shipper/bookings",
    });
    this.save();
    return { ok: true, booking: b };
  }

  cancelBooking(bookingId: string, byUserId: string, reason: string): { ok: true; booking: Booking } | { ok: false; error: string } {
    const b = this.getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status === "completed" || b.status === "rejected") return { ok: false, error: "Completed or rejected bookings can't be cancelled." };
    const otherParty = byUserId === b.shipperId ? b.transporterId : byUserId === b.transporterId ? b.shipperId : null;
    const wasAccepted = b.status === "accepted";
    b.status = "cancelled";
    b.cancelledById = byUserId;
    b.cancellationReason = reason;
    b.updatedAt = nowIso();
    if (wasAccepted) {
      const trip = this.getTrip(b.tripId);
      if (trip) trip.availableCapacity = Math.min(trip.maxCapacity, +(trip.availableCapacity + b.quantityTons).toFixed(2));
      const load = this.getLoad(b.loadId);
      if (load && load.status === "booked") {
        load.status = "open";
        load.updatedAt = nowIso();
      }
    }
    if (otherParty) {
      this.pushNotification({
        userId: otherParty, type: "booking-cancelled",
        title: "Booking cancelled",
        body: `A booking was cancelled: ${reason}`, link: "/dashboard/bookings",
      });
    }
    this.save();
    return { ok: true, booking: b };
  }

  completeBooking(bookingId: string, byUserId: string): { ok: true; booking: Booking } | { ok: false; error: string } {
    const b = this.getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "accepted") return { ok: false, error: "Only accepted bookings can be marked completed." };
    b.status = "completed";
    b.updatedAt = nowIso();
    const load = this.getLoad(b.loadId);
    if (load && load.status !== "cancelled") {
      load.status = "completed";
      load.updatedAt = nowIso();
    }
    const otherParty = byUserId === b.shipperId ? b.transporterId : b.shipperId;
    this.pushNotification({
      userId: otherParty, type: "booking-completed",
      title: "Booking completed",
      body: "A delivery was marked as delivered. You can now leave a review.",
      link: "/dashboard/bookings",
    });
    this.save();
    return { ok: true, booking: b };
  }

  // ---------- Reviews ----------
  listReviewsBySubject(subjectId: string): Review[] {
    return this.db.reviews.filter((r) => r.subjectId === subjectId);
  }

  listReviewsByIds(bookingIds: string[]): Review[] {
    const set = new Set(bookingIds);
    return this.db.reviews.filter((r) => set.has(r.bookingId));
  }

  getRating(subjectId: string): { average: number | null; count: number } {
    const reviews = this.listReviewsBySubject(subjectId);
    if (reviews.length === 0) return { average: null, count: 0 };
    return { average: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, count: reviews.length };
  }

  canReview(bookingId: string, userId: string): boolean {
    const b = this.getBooking(bookingId);
    if (!b || b.status !== "completed") return false;
    return !this.db.reviews.some((r) => r.bookingId === bookingId && r.authorId === userId);
  }

  createReview(input: { bookingId: string; authorId: string; rating: number; comment?: string }): { ok: true; review: Review } | { ok: false; error: string } {
    const b = this.getBooking(input.bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "completed") return { ok: false, error: "You can review only completed bookings." };
    const authorProfile = this.getProfile(input.authorId);
    const isShipper = input.authorId === b.shipperId;
    const isTransporter = input.authorId === b.transporterId;
    if (!authorProfile || (!isShipper && !isTransporter)) return { ok: false, error: "Only the two parties on a booking can review each other." };
    if (!this.canReview(input.bookingId, input.authorId)) return { ok: false, error: "You've already reviewed this booking." };
    const subjectId = isShipper ? b.transporterId : b.shipperId;
    const review: Review = {
      id: uid(), bookingId: input.bookingId, authorId: input.authorId, subjectId,
      authorRole: isShipper ? "shipper" : "transporter",
      subjectRole: isShipper ? "transporter" : "shipper",
      rating: input.rating, comment: input.comment || undefined, createdAt: nowIso(),
    };
    this.db.reviews.push(review);
    this.pushNotification({
      userId: subjectId, type: "new-review",
      title: "You received a new review",
      body: `${authorProfile.fullName} rated you ${input.rating}/5.`,
      link: "/dashboard/profile",
    });
    this.save();
    return { ok: true, review };
  }

  // ---------- Notifications ----------
  private pushNotification(input: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification {
    const n: AppNotification = { ...input, id: uid(), read: false, createdAt: nowIso() };
    this.db.notifications.unshift(n);
    return n;
  }

  listNotifications(userId: string): AppNotification[] {
    return this.db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  unreadCount(userId: string): number {
    return this.db.notifications.filter((n) => n.userId === userId && !n.read).length;
  }

  markNotificationsRead(userId: string): void {
    for (const n of this.db.notifications) if (n.userId === userId) n.read = true;
    this.save();
  }

  // ---------- Reported issues ----------
  reportIssue(input: { reporterId: string; subjectType: ReportedIssue["subjectType"]; subjectId: string; reason: string; details?: string }): ReportedIssue {
    const issue: ReportedIssue = {
      id: uid(), reporterId: input.reporterId, subjectType: input.subjectType, subjectId: input.subjectId,
      reason: input.reason, details: input.details || undefined, status: "open", createdAt: nowIso(),
    };
    this.db.issues.unshift(issue);
    this.save();
    return issue;
  }

  listIssues(): ReportedIssue[] {
    return [...this.db.issues].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  setIssueStatus(id: string, status: ReportedIssue["status"]): ReportedIssue | undefined {
    const i = this.db.issues.find((x) => x.id === id);
    if (!i) return undefined;
    i.status = status;
    i.resolvedAt = status === "open" ? undefined : nowIso();
    this.save();
    return i;
  }

  // ---------- Admin ----------
  suspendUser(userId: string, suspended: boolean): Profile | undefined {
    const p = this.getProfile(userId);
    if (!p || p.role === "admin") return undefined;
    this.saveProfile(userId, { isSuspended: suspended });
    if (suspended) this.pushNotification({ userId, type: "verification", title: "Account suspended", body: "An administrator has suspended your account. Contact support if this is a mistake.", link: "/login" });
    return p;
  }

  setVerification(userId: string, status: Profile["verificationStatus"]): Profile | undefined {
    const p = this.getProfile(userId);
    if (!p) return undefined;
    this.saveProfile(userId, { verificationStatus: status });
    if (status === "verified") this.pushNotification({ userId, type: "verification", title: "Profile verified", body: "Great news — your profile has been verified.", link: "/dashboard/profile" });
    return p;
  }

  archiveTripAdmin(id: string): void {
    this.updateTrip(id, { status: "archived" });
  }

  archiveLoadAdmin(id: string): void {
    this.updateLoad(id, { status: "archived" });
  }

  // ---------- helpers ----------
  nameOf(userId: string): string {
    const p = this.getProfile(userId);
    if (!p) return "A user";
    const company = this.getCompanyByOwner(userId);
    return company ? `${p.fullName} (${company.name})` : p.fullName;
  }

  profileOf(userId: string): Profile | undefined {
    return this.getProfile(userId);
  }

  companyOf(userId: string): Company | undefined {
    return this.getCompanyByOwner(userId);
  }
}

export function estimateLoadDistanceKm(pickupCity: string, deliveryCity: string): number {
  const a = cityCoords(pickupCity);
  const b = cityCoords(deliveryCity);
  if (!a || !b) return 0;
  return Math.round(haversineKm(a, b));
}

export const demoDb = new LocalDB();

// Keep this export used so tree-shaking never drops clearly-labelled reference data.
export const DEMO_REFERENCE = { VEHICLE_TYPES, GOODS_CATEGORIES };