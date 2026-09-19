// ---------------------------------------------------------------------
// Unified data access facade.
//
// Routes every operation through either the Supabase backend or the
// browser-local demo store depending on APP_MODE.
// ---------------------------------------------------------------------

import type { Role } from "./model";
import { RATE_PER_TONNE_KM } from "./model";
import { APP_MODE } from "./config";
import { demoDb, estimateLoadDistanceKm } from "./demo/store";

// ---------------------------------------------------------------------
// Shared types exposed to all UI pages
// ---------------------------------------------------------------------
export interface AuthedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  verificationStatus: "unverified" | "pending" | "verified";
  companyId?: string | null;
  phone?: string;
  city?: string;
  isSuspended?: boolean;
}

export interface BookingListItem {
  id: string;
  status: import("./model").BookingStatus;
  quantityTons: number;
  priceQuote?: number;
  estimatedEarnings?: number;
  message?: string;
  cancellationReason?: string;
  cancelledById?: string;
  createdAt: string;
  updatedAt: string;
  trip: import("./model").Trip;
  load: import("./model").Load;
  counterpart: { id: string; fullName: string; companyName?: string; email?: string; phone?: string; city?: string };
  canReview: boolean;
  reviews: import("./model").Review[];
  tripBookings: number;
  loadBookings: number;
}

export interface AdminUserRow {
  profile: import("./model").Profile;
  company?: import("./model").Company;
  tripCount: number;
  loadCount: number;
  rating: number | null;
  reviewCount: number;
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------
export async function getSession(): Promise<AuthedUser | null> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.auth.getSession();
    if (!data.session?.user) return null;
    const uid = data.session.user.id;
    const { data: profile } = await supa.from("profiles").select("*").eq("id", uid).single();
    return profile
      ? {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          verificationStatus: profile.verification_status,
          companyId: profile.company_id,
          phone: profile.phone,
          city: profile.city,
          isSuspended: profile.is_suspended,
        }
      : null;
  }
  // Demo mode
  const session = demoDb.getSession();
  if (!session) return null;
  const p = demoDb.getProfile(session.userId);
  if (!p || p.isSuspended) return null;
  return {
    id: p.userId,
    email: p.email,
    fullName: p.fullName,
    role: p.role,
    verificationStatus: p.verificationStatus,
    companyId: p.companyId,
    phone: p.phone,
    city: p.city,
    isSuspended: p.isSuspended,
  };
}

export async function signUp(input: { fullName: string; email: string; password: string; role: Role }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { error } = await supa.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { role: input.role, full_name: input.fullName } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const result = demoDb.signUpDemo(input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  return demoDb.signInDemo(email, password);
}

export async function signOut(): Promise<void> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.auth.signOut();
    return;
  }
  demoDb.signOutDemo();
}

export async function updateProfile(userId: string, patch: Partial<{ fullName: string; phone: string; city: string }>) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const fieldMap: Record<string, string> = { fullName: "full_name", phone: "phone", city: "city" };
    const toPatch: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch)) { if (typeof v === "string" && fieldMap[k]) toPatch[fieldMap[k]] = v; }
    await supa.from("profiles").update({ ...toPatch, updated_at: new Date().toISOString() }).eq("id", userId);
    return;
  }
  demoDb.saveProfile(userId, patch);
}

// ---------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------
export async function getCompanyByUser(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("companies").select("*").eq("owner_id", userId).single();
    return data ? mapCompanyFromDb(data) : undefined;
  }
  return demoDb.getCompanyByOwner(userId);
}

export async function createCompany(ownerId: string, input: { name: string; legalType: string; city?: string; description?: string; gstin?: string }) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const ts = new Date().toISOString();
    const { data } = await supa.from("companies").insert({
      owner_id: ownerId, name: input.name, legal_type: input.legalType, city: input.city ?? null,
      description: input.description ?? null, gstin: input.gstin ?? null, verified: false,
      created_at: ts, updated_at: ts,
    }).select().single();
    if (data) await supa.from("profiles").update({ company_id: data.id, updated_at: ts }).eq("id", ownerId);
    return data ? mapCompanyFromDb(data) : undefined;
  }
  const c = demoDb.createCompany(ownerId, input);
  demoDb.saveProfile(ownerId, { companyId: c.id });
  return c;
}

function mapCompanyFromDb(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    legalType: row.legal_type as string,
    city: row.city as string | undefined,
    description: row.description as string | undefined,
    gstin: row.gstin as string | undefined,
    verified: row.verified as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  } satisfies import("./model").Company;
}

// ---------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------
export async function listVehicles(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("vehicles").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string, ownerId: r.owner_id as string, companyId: r.company_id as string | null,
      registrationNumber: r.registration_number as string,
      vehicleType: r.vehicle_type as import("./model").VehicleType,
      capacityTons: r.capacity_tons as number,
      capacityVolumeM3: r.capacity_volume_m3 as number | undefined,
      status: r.status as import("./model").VehicleStatus,
      createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    }));
  }
  return demoDb.listVehiclesOwned(userId);
}

export async function createVehicle(ownerId: string, input: { registrationNumber: string; vehicleType: import("./model").VehicleType; capacityTons: number; capacityVolumeM3?: number; companyId?: string }) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const ts = new Date().toISOString();
    const { data } = await supa.from("vehicles").insert({
      owner_id: ownerId, company_id: input.companyId ?? null,
      registration_number: input.registrationNumber.trim().toUpperCase(),
      vehicle_type: input.vehicleType, capacity_tons: input.capacityTons,
      capacity_volume_m3: input.capacityVolumeM3 ?? null, status: "available",
      created_at: ts, updated_at: ts,
    }).select().single();
    return data ? { id: data.id } : undefined;
  }
  return demoDb.createVehicle(ownerId, input);
}

export async function deleteVehicle(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("vehicles").delete().eq("id", id);
    return;
  }
  demoDb.deleteVehicle(id);
}

// ---------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------
export async function listTripsByTransporter(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("trips").select("*").eq("transporter_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map(mapTripFromDb).filter((t: import("./model").Trip) => t.status !== "archived");
  }
  return demoDb.listTripsOwned(userId);
}

export async function listOpenTrips() {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("trips").select("*").eq("status", "active").gt("available_capacity", 0).order("expected_return_at");
    return (data ?? []).map(mapTripFromDb);
  }
  return demoDb.listOpenTrips();
}

export async function getTrip(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("trips").select("*").eq("id", id).single();
    return data ? mapTripFromDb(data) : undefined;
  }
  return demoDb.getTrip(id);
}

export async function createTrip(transporterId: string, input: { originCity: string; destinationCity: string; viaCities: string[]; departureAt: string; expectedReturnAt: string; vehicleType: import("./model").VehicleType; maxCapacity: number; availableCapacity: number; capacityUnit: import("./model").CapacityUnit; goodsRestrictions: string[]; notes?: string; companyId?: string; vehicleId?: string }) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const ts = new Date().toISOString();
    const { data } = await supa.from("trips").insert({
      transporter_id: transporterId, company_id: input.companyId ?? null, vehicle_id: input.vehicleId ?? null,
      origin_city: input.originCity, destination_city: input.destinationCity, via_cities: input.viaCities,
      departure_at: input.departureAt, expected_return_at: input.expectedReturnAt,
      vehicle_type: input.vehicleType, max_capacity: input.maxCapacity,
      available_capacity: input.availableCapacity, capacity_unit: input.capacityUnit,
      goods_restrictions: input.goodsRestrictions, notes: input.notes ?? null,
      status: "active", created_at: ts, updated_at: ts,
    }).select().single();
    return data ? mapTripFromDb(data) : undefined;
  }
  return demoDb.createTrip(transporterId, input);
}

export async function cancelTrip(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("trips").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    return;
  }
  demoDb.updateTrip(id, { status: "cancelled" });
}

/** Withdraw an open load (shipper action). Only "open" loads can be withdrawn. */
export async function cancelLoad(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data: load } = await supa.from("loads").select("status").eq("id", id).single();
    if (load && load.status === "open") {
      await supa.from("loads").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    }
    return;
  }
  const load = demoDb.getLoad(id);
  if (load && load.status === "open") demoDb.updateLoad(id, { status: "cancelled" });
}

function mapTripFromDb(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    transporterId: r.transporter_id as string,
    companyId: r.company_id as string | null,
    vehicleId: r.vehicle_id as string | null,
    originCity: r.origin_city as string,
    destinationCity: r.destination_city as string,
    viaCities: (r.via_cities as string[]) ?? [],
    departureAt: r.departure_at as string,
    expectedReturnAt: r.expected_return_at as string,
    vehicleType: r.vehicle_type as import("./model").VehicleType,
    maxCapacity: r.max_capacity as number,
    availableCapacity: r.available_capacity as number,
    capacityUnit: r.capacity_unit as import("./model").CapacityUnit,
    goodsRestrictions: (r.goods_restrictions as string[]) ?? [],
    notes: (r.notes as string | null | undefined) ?? undefined,
    status: r.status as import("./model").TripStatus,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  } satisfies import("./model").Trip;
}

// ---------------------------------------------------------------------
// Loads
// ---------------------------------------------------------------------
export async function listLoadsByShipper(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("loads").select("*").eq("shipper_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map(mapLoadFromDb).filter((l: import("./model").Load) => l.status !== "archived");
  }
  return demoDb.listLoadsOwned(userId);
}

export async function listOpenLoads() {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("loads").select("*").eq("status", "open").order("pickup_window_start");
    return (data ?? []).map(mapLoadFromDb);
  }
  return demoDb.listOpenLoads();
}

export async function getLoad(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("loads").select("*").eq("id", id).single();
    return data ? mapLoadFromDb(data) : undefined;
  }
  return demoDb.getLoad(id);
}

export async function createLoad(shipperId: string, input: { pickupCity: string; deliveryCity: string; goodsType: string; goodsCategory: import("./model").GoodsCategory; weight: number; volumeM3?: number; dimensions?: string; pickupWindowStart: string; pickupWindowEnd: string; deliveryDeadline: string; specialHandling?: string; companyId?: string }) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const ts = new Date().toISOString();
    const { data } = await supa.from("loads").insert({
      shipper_id: shipperId, company_id: input.companyId ?? null,
      pickup_city: input.pickupCity, delivery_city: input.deliveryCity,
      goods_type: input.goodsType, goods_category: input.goodsCategory,
      weight: input.weight, volume_m3: input.volumeM3 ?? null,
      dimensions: input.dimensions ?? null,
      pickup_window_start: input.pickupWindowStart, pickup_window_end: input.pickupWindowEnd,
      delivery_deadline: input.deliveryDeadline, special_handling: input.specialHandling ?? null,
      status: "open", created_at: ts, updated_at: ts,
    }).select().single();
    return data ? mapLoadFromDb(data) : undefined;
  }
  return demoDb.createLoad(shipperId, input);
}

function mapLoadFromDb(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    shipperId: r.shipper_id as string,
    companyId: r.company_id as string | null,
    pickupCity: r.pickup_city as string,
    deliveryCity: r.delivery_city as string,
    goodsType: r.goods_type as string,
    goodsCategory: r.goods_category as import("./model").GoodsCategory,
    weight: r.weight as number,
    volumeM3: r.volume_m3 as number | undefined,
    dimensions: r.dimensions as string | undefined,
    pickupWindowStart: r.pickup_window_start as string,
    pickupWindowEnd: r.pickup_window_end as string,
    deliveryDeadline: r.delivery_deadline as string,
    specialHandling: r.special_handling as string | undefined,
    status: r.status as import("./model").LoadStatus,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  } satisfies import("./model").Load;
}

// ---------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------
export async function listBookingsFor(userId: string, role: Role): Promise<BookingListItem[]> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const col = role === "transporter" ? "transporter_id" : "shipper_id";
    const { data } = await supa.from("bookings").select("*, trips(*), loads(*)").eq(col, userId).order("created_at", { ascending: false });
    return Promise.all(
      (data ?? []).map(async (r: Record<string, unknown>) => {
        const trip = mapTripFromDb(r.trips as Record<string, unknown>);
        const load = mapLoadFromDb(r.loads as Record<string, unknown>);
        const counterPartyId = role === "transporter" ? r.shipper_id : r.transporter_id;
        return buildBookingListItem(r as Record<string, unknown>, trip, load, counterPartyId as string);
      }),
    );
  }
  const bookings = demoDb.listBookings().filter((b) => (role === "transporter" ? b.transporterId : b.shipperId) === userId);
  return bookings.map((b) => {
    const trip = demoDb.getTrip(b.tripId)!;
    const load = demoDb.getLoad(b.loadId)!;
    const counterPartyId = role === "transporter" ? b.shipperId : b.transporterId;
    return buildBookingListItemLocal(b, trip, load, counterPartyId);
  });
}

async function buildBookingListItem(r: Record<string, unknown>, trip: import("./model").Trip, load: import("./model").Load, counterPartyId: string): Promise<BookingListItem> {
  const { getSupabase } = await import("./supabase");
  const supa = await getSupabase();
  const { data: cpProfile } = await supa.from("profiles").select("full_name,phone,city").eq("id", counterPartyId).single();
  const { data: cpCompany } = await supa.from("companies").select("name").eq("owner_id", counterPartyId).single();
  const { data: reviews } = await supa.from("reviews").select("*").eq("booking_id", r.id);
  const userId = (await supa.auth.getUser()).data.user?.id;
  return {
    id: r.id as string,
    status: r.status as import("./model").BookingStatus,
    quantityTons: r.quantity_tons as number,
    priceQuote: r.price_quote as number | undefined,
    estimatedEarnings: r.estimated_earnings as number | undefined,
    message: r.message as string | undefined,
    cancellationReason: r.cancellation_reason as string | undefined,
    cancelledById: r.cancelled_by_id as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    trip, load,
    counterpart: { id: counterPartyId, fullName: cpProfile?.full_name ?? "—", companyName: cpCompany?.name, phone: cpProfile?.phone, city: cpProfile?.city },
    canReview: r.status === "completed" && userId != null && !reviews?.some((rev: Record<string, unknown>) => rev.author_id === userId),
    reviews: (reviews ?? []).map((rev: Record<string, unknown>) => ({ id: rev.id, bookingId: rev.booking_id, authorId: rev.author_id, subjectId: rev.subject_id, authorRole: rev.author_role, subjectRole: rev.subject_role, rating: rev.rating, comment: rev.comment, createdAt: rev.created_at })) as import("./model").Review[],
    tripBookings: 0,
    loadBookings: 0,
  };
}

function buildBookingListItemLocal(b: import("./model").Booking, trip: import("./model").Trip, load: import("./model").Load, counterPartyId: string): BookingListItem {
  const cp = demoDb.profileOf(counterPartyId);
  const cpCo = demoDb.companyOf(counterPartyId);
  const userId = demoDb.getSession()?.userId;
  const bookingReviews = demoDb.listReviewsByIds([b.id]);
  return {
    id: b.id, status: b.status, quantityTons: b.quantityTons,
    priceQuote: b.priceQuote, estimatedEarnings: b.estimatedEarnings,
    message: b.message, cancellationReason: b.cancellationReason,
    cancelledById: b.cancelledById,
    createdAt: b.createdAt, updatedAt: b.updatedAt,
    trip, load,
    counterpart: { id: counterPartyId, fullName: cp?.fullName ?? "—", companyName: cpCo?.name, phone: cp?.phone, city: cp?.city },
    canReview: demoDb.canReview(b.id, userId ?? ""),
    reviews: bookingReviews,
    tripBookings: demoDb.listBookings().filter((x) => x.tripId === trip.id && ["accepted", "requested"].includes(x.status)).length,
    loadBookings: demoDb.listBookings().filter((x) => x.loadId === load.id && ["accepted", "requested"].includes(x.status)).length,
  };
}

export async function createBookingRequest(input: { tripId: string; loadId: string; shipperId: string; transporterId: string; priceQuote?: number; message?: string }): Promise<{ ok: true; booking: import("./model").Booking } | { ok: false; error: string }> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data: trip } = await supa.from("trips").select("*").eq("id", input.tripId).single();
    const { data: load } = await supa.from("loads").select("*").eq("id", input.loadId).single();
    if (!trip || !load) return { ok: false, error: "Trip or load no longer exists." };
    if (trip.status !== "active") return { ok: false, error: "Trip no longer active." };
    if (load.status !== "open") return { ok: false, error: "Load already booked." };
    const existing = await supa.from("bookings").select("id").eq("load_id", input.loadId).in("status", ["requested", "accepted"]);
    if (existing.data && existing.data.length > 0) return { ok: false, error: "A booking is already pending for this load." };
    const estKm = estimateLoadDistanceKm(load.pickup_city, load.delivery_city);
    const est = estKm > 0 ? Math.round(load.weight * RATE_PER_TONNE_KM * estKm) : undefined;
    const ts = new Date().toISOString();
    const { data, error } = await supa.from("bookings").insert({
      trip_id: input.tripId, load_id: input.loadId, shipper_id: input.shipperId,
      transporter_id: input.transporterId, status: "requested",
      quantity_tons: Math.min(load.weight, trip.available_capacity),
      price_quote: input.priceQuote ?? null, message: input.message ?? null,
      estimated_earnings: est ?? null, created_at: ts, updated_at: ts,
    }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, booking: { id: data.id, tripId: data.trip_id, loadId: data.load_id, shipperId: data.shipper_id, transporterId: data.transporter_id, status: "requested", quantityTons: data.quantity_tons, priceQuote: data.price_quote, estimatedEarnings: data.estimated_earnings, message: data.message, createdAt: data.created_at, updatedAt: data.updated_at } };
  }
  const demoLoad = demoDb.getLoad(input.loadId);
  const estKm = demoLoad ? estimateLoadDistanceKm(demoLoad.pickupCity, demoLoad.deliveryCity) : 0;
  const est = estKm > 0 ? Math.round((demoLoad?.weight ?? 0) * RATE_PER_TONNE_KM * estKm) : undefined;
  return demoDb.createBookingRequest({ ...input, estimatedEarnings: est });
}

export async function acceptBooking(bookingId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data: b } = await supa.from("bookings").select("*").eq("id", bookingId).single();
    if (!b) return { ok: false as const, error: "Booking not found" } as const;
    if (b.status !== "requested") return { ok: false as const, error: "Only requested bookings can be accepted" } as const;
    const { data: trip } = await supa.from("trips").select("*").eq("id", b.trip_id).single();
    if (!trip || trip.status !== "active" || b.quantity_tons > trip.available_capacity) return { ok: false as const, error: "Trip no longer has capacity" } as const;
    const ts = new Date().toISOString();
    await supa.from("bookings").update({ status: "accepted", updated_at: ts }).eq("id", bookingId);
    await supa.from("trips").update({ available_capacity: +(trip.available_capacity - b.quantity_tons).toFixed(2), updated_at: ts }).eq("id", b.trip_id);
    await supa.from("loads").update({ status: "booked", updated_at: ts }).eq("id", b.load_id);
    return { ok: true as const } as const;
  }
  return demoDb.acceptBooking(bookingId);
}

export async function rejectBooking(bookingId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("bookings").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", bookingId);
    return { ok: true as const } as const;
  }
  return demoDb.rejectBooking(bookingId);
}

export async function cancelBooking(bookingId: string, byUserId: string, reason: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data: b } = await supa.from("bookings").select("*").eq("id", bookingId).single();
    if (!b) return { ok: false as const, error: "Booking not found" } as const;
    const wasAccepted = b.status === "accepted";
    const ts = new Date().toISOString();
    await supa.from("bookings").update({ status: "cancelled", cancelled_by_id: byUserId, cancellation_reason: reason, updated_at: ts }).eq("id", bookingId);
    if (wasAccepted) {
      const { data: trip } = await supa.from("trips").select("available_capacity,max_capacity").eq("id", b.trip_id).single();
      if (trip) await supa.from("trips").update({ available_capacity: Math.min(trip.max_capacity, +(trip.available_capacity + b.quantity_tons).toFixed(2)), updated_at: ts }).eq("id", b.trip_id);
      await supa.from("loads").update({ status: "open", updated_at: ts }).eq("id", b.load_id);
    }
    return { ok: true as const } as const;
  }
  return demoDb.cancelBooking(bookingId, byUserId, reason);
}

export async function completeBooking(bookingId: string, byUserId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const ts = new Date().toISOString();
    await supa.from("bookings").update({ status: "completed", updated_at: ts }).eq("id", bookingId);
    const { data: b } = await supa.from("bookings").select("load_id").eq("id", bookingId).single();
    if (b) await supa.from("loads").update({ status: "completed", updated_at: ts }).eq("id", b.load_id);
    return { ok: true as const } as const;
  }
  return demoDb.completeBooking(bookingId, byUserId);
}

export async function createReview(input: { bookingId: string; authorId: string; rating: number; comment?: string }) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data: b } = await supa.from("bookings").select("*").eq("id", input.bookingId).single();
    if (!b) return { ok: false as const, error: "Booking not found" } as const;
    if (b.status !== "completed") return { ok: false as const, error: "Only completed bookings" } as const;
    if (input.authorId !== b.shipper_id && input.authorId !== b.transporter_id) return { ok: false as const, error: "Not a participant" } as const;
    const subjectId = input.authorId === b.shipper_id ? b.transporter_id : b.shipper_id;
    const existing = await supa.from("reviews").select("id").eq("booking_id", input.bookingId).eq("author_id", input.authorId).single();
    if (existing.data) return { ok: false as const, error: "Already reviewed" } as const;
    const authorProfile = await supa.from("profiles").select("role").eq("id", input.authorId).single();
    await supa.from("reviews").insert({
      booking_id: input.bookingId, author_id: input.authorId, subject_id: subjectId,
      author_role: authorProfile.data?.role ?? "shipper",
      subject_role: authorProfile.data?.role === "transporter" ? "shipper" : "transporter",
      rating: input.rating, comment: input.comment ?? null, created_at: new Date().toISOString(),
    });
    return { ok: true as const } as const;
  }
  return demoDb.createReview(input);
}

export async function listReviewsBySubject(subjectId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("reviews").select("*").eq("subject_id", subjectId).order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => ({ id: r.id, bookingId: r.booking_id, authorId: r.author_id, subjectId: r.subject_id, authorRole: r.author_role, subjectRole: r.subject_role, rating: r.rating, comment: r.comment, createdAt: r.created_at }) as import("./model").Review);
  }
  return demoDb.listReviewsBySubject(subjectId);
}

export async function getRating(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("reviews").select("rating").eq("subject_id", userId);
    if (!data || data.length === 0) return { average: null, count: 0 };
    return { average: data.reduce((s, r) => s + r.rating, 0) / data.length, count: data.length };
  }
  return demoDb.getRating(userId);
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------
export async function listNotifications(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    return (data ?? []).map((n) => ({ id: n.id, userId: n.user_id, type: n.type, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.created_at }) as import("./model").AppNotification);
  }
  return demoDb.listNotifications(userId);
}

export async function unreadCount(userId: string): Promise<number> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { count } = await supa.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false);
    return count ?? 0;
  }
  return demoDb.unreadCount(userId);
}

export async function markNotificationsRead(userId: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    return;
  }
  demoDb.markNotificationsRead(userId);
}

// ---------------------------------------------------------------------
// Reported issues (admin / reporting)
// ---------------------------------------------------------------------
export async function reportIssue(input: { reporterId: string; subjectType: import("./model").ReportedIssue["subjectType"]; subjectId: string; reason: string; details?: string }) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const ts = new Date().toISOString();
    await supa.from("reported_issues").insert({ reporter_id: input.reporterId, subject_type: input.subjectType, subject_id: input.subjectId, reason: input.reason, details: input.details ?? null, status: "open", created_at: ts });
    return { ok: true as const } as const;
  }
  demoDb.reportIssue(input);
  return { ok: true as const } as const;
}

export async function listIssues() {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("reported_issues").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((i) => ({ id: i.id, reporterId: i.reporter_id, subjectType: i.subject_type, subjectId: i.subject_id, reason: i.reason, details: i.details, status: i.status, createdAt: i.created_at, resolvedAt: i.resolved_at }) as import("./model").ReportedIssue);
  }
  return demoDb.listIssues();
}

export async function resolveIssue(id: string, status: "resolved" | "dismissed") {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("reported_issues").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", id);
    return;
  }
  demoDb.setIssueStatus(id, status);
}

// ---------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------
export async function listAllUsers(): Promise<AdminUserRow[]> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data: profiles } = await supa.from("profiles").select("*").order("created_at");
    if (!profiles) return [];
    return Promise.all(
      profiles.map(async (p) => {
        const [trips, loads, reviews, company] = await Promise.all([
          supa.from("trips").select("id", { count: "exact", head: true }).eq("transporter_id", p.id),
          supa.from("loads").select("id", { count: "exact", head: true }).eq("shipper_id", p.id),
          supa.from("reviews").select("rating").eq("subject_id", p.id),
          supa.from("companies").select("*").eq("owner_id", p.id).single(),
        ]);
        const rts = reviews.data ?? [];
        return {
          profile: { id: p.id, userId: p.user_id, role: p.role, fullName: p.full_name, email: p.email, phone: p.phone, verificationStatus: p.verification_status, companyId: p.company_id, city: p.city, isSuspended: p.is_suspended, createdAt: p.created_at, updatedAt: p.updated_at } as import("./model").Profile,
          company: company.data ? mapCompanyFromDb(company.data as Record<string, unknown>) : undefined,
          tripCount: trips.count ?? 0,
          loadCount: loads.count ?? 0,
          rating: rts.length > 0 ? rts.reduce((s, r) => s + r.rating, 0) / rts.length : null,
          reviewCount: rts.length,
        };
      }),
    );
  }
  const profiles = demoDb.allProfiles();
  return profiles.map((p) => {
    const rating = demoDb.getRating(p.userId);
    return {
      profile: p,
      company: demoDb.companyOf(p.userId),
      tripCount: demoDb.listTripsOwned(p.userId).length,
      loadCount: demoDb.listLoadsOwned(p.userId).length,
      rating: rating.average,
      reviewCount: rating.count,
    };
  });
}

export async function suspendUser(userId: string, suspended: boolean) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("profiles").update({ is_suspended: suspended, updated_at: new Date().toISOString() }).eq("id", userId);
    return;
  }
  demoDb.suspendUser(userId, suspended);
}

export async function setVerification(userId: string, status: "verified" | "pending" | "unverified") {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("profiles").update({ verification_status: status, updated_at: new Date().toISOString() }).eq("id", userId);
    return;
  }
  demoDb.setVerification(userId, status);
}

export async function archiveTripAdmin(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("trips").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    return;
  }
  demoDb.archiveTripAdmin(id);
}

export async function archiveLoadAdmin(id: string) {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    await supa.from("loads").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    return;
  }
  demoDb.archiveLoadAdmin(id);
}

// ---------------------------------------------------------------------
// Matching (logic runs client-side regardless of backend)
// ---------------------------------------------------------------------
export async function getTripMatches(tripId: string) {
  const trip = await getTrip(tripId);
  if (!trip) return [];
  const { rankLoadsForTrip } = await import("./matching");
  const loads = await listOpenLoads();
  return rankLoadsForTrip(trip, loads).filter((m) => m.load.shipperId !== trip.transporterId);
}

export async function getLoadMatches(loadId: string) {
  const load = await getLoad(loadId);
  if (!load) return [];
  const { rankTripsForLoad } = await import("./matching");
  const trips = await listOpenTrips();
  return rankTripsForLoad(load, trips).filter((m) => m.trip.transporterId !== load.shipperId);
}

export async function resetDemo() {
  if (APP_MODE === "demo") demoDb.resetDemo();
}

// ---------------------------------------------------------------------
// Admin listings — all trips and loads across the platform
// ---------------------------------------------------------------------
export async function listAllTripsAdmin(): Promise<import("./model").Trip[]> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("trips").select("*").order("created_at", { ascending: false }).limit(200);
    return (data ?? []).map(mapTripFromDb);
  }
  const owners = demoDb.allProfiles().filter((p) => p.role === "transporter").map((p) => p.userId);
  return owners.flatMap((o) => demoDb.listTripsOwned(o)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function listAllLoadsAdmin(): Promise<import("./model").Load[]> {
  if (APP_MODE === "supabase") {
    const { getSupabase } = await import("./supabase");
    const supa = await getSupabase();
    const { data } = await supa.from("loads").select("*").order("created_at", { ascending: false }).limit(200);
    return (data ?? []).map(mapLoadFromDb);
  }
  const owners = demoDb.allProfiles().filter((p) => p.role === "shipper").map((p) => p.userId);
  return owners.flatMap((o) => demoDb.listLoadsOwned(o)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}