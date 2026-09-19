"use client";

import { useState } from "react";
import { MessageSquare, Star, XCircle } from "lucide-react";
import type { Role } from "@/lib/model";
import { GOODS_CATEGORIES, VEHICLE_TYPES } from "@/lib/model";
import type { BookingListItem } from "@/lib/data";
import * as data from "@/lib/data";
import { fmtDateTime, fmtINR, fmtTons } from "@/lib/format";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { Field, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { RouteLine } from "./route-line";

export function BookingCard({
  booking,
  role,
  onChanged,
}: {
  booking: BookingListItem;
  role: Role;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTransporter = role === "transporter";
  const canAccept = isTransporter && booking.status === "requested";
  const canReject = isTransporter && booking.status === "requested";
  const canCancel = ["requested", "accepted"].includes(booking.status);
  const canComplete = isTransporter && booking.status === "accepted";
  const canReview = booking.canReview;

  async function accept() {
    setBusy(true);
    const res = await data.acceptBooking(booking.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Booking accepted — capacity locked and load confirmed.");
    onChanged();
  }

  async function reject() {
    setBusy(true);
    const res = await data.rejectBooking(booking.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.info("Booking request rejected.");
    onChanged();
  }

  async function complete() {
    if (!user) return;
    setBusy(true);
    const res = await data.completeBooking(booking.id, user.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Delivery marked complete. Reviews are now unlocked.");
    onChanged();
  }

  const price = booking.priceQuote ?? booking.estimatedEarnings;

  return (
    <>
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <RouteLine origin={booking.trip.originCity} via={booking.trip.viaCities} destination={booking.trip.destinationCity} className="text-base" />
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your cargo</p>
              <p className="font-medium text-slate-800">{booking.load.goodsType}</p>
              <p className="text-slate-500">
                {booking.load.pickupCity} → {booking.load.deliveryCity} · {fmtTons(booking.quantityTons)}
              </p>
              <p className="text-xs text-slate-400">
                {GOODS_CATEGORIES.find((c) => c.value === booking.load.goodsCategory)?.label} · pickup {fmtDateTime(booking.load.pickupWindowStart)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isTransporter ? "Shipper" : "Transporter"}</p>
              <p className="font-medium text-slate-800">{booking.counterpart.fullName}</p>
              <p className="text-slate-500">{booking.counterpart.companyName ?? "Independent"}</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                {booking.counterpart.city} · {VEHICLE_TYPES[booking.trip.vehicleType]?.shortLabel ?? booking.trip.vehicleType}
                {booking.tripBookings > 1 ? ` · ${booking.tripBookings} bookings on this trip` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {price !== undefined ? (
              <p className="font-semibold text-slate-800">
                {booking.priceQuote !== undefined ? `₹ ${booking.priceQuote.toLocaleString("en-IN")}` : `Est. ${fmtINR(booking.estimatedEarnings ?? 0)}`}
                <span className="ml-1 text-xs font-normal text-slate-400">illustrative</span>
              </p>
            ) : (
              <p className="text-slate-400">No price quoted</p>
            )}
            {booking.message ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500"><MessageSquare className="size-3.5" aria-hidden />“{booking.message}”</p>
            ) : null}
          </div>

          {["cancelled", "rejected"].includes(booking.status) && booking.cancellationReason ? (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {booking.status === "cancelled" ? "Cancellation reason" : "Declined"} · {booking.cancellationReason}
            </p>
          ) : null}
        </CardBody>

        <CardFooter className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDetailOpen(true)}>Details</Button>
          {canAccept ? <Button size="sm" loading={busy} onClick={accept}>Accept</Button> : null}
          {canReject ? <Button size="sm" variant="secondary" loading={busy} onClick={reject}>Decline</Button> : null}
          {canCancel ? <Button size="sm" variant="subtleDanger" onClick={() => setCancelOpen(true)}><XCircle className="size-3.5" aria-hidden />Cancel</Button> : null}
          {canComplete ? <Button size="sm" variant="secondary" loading={busy} onClick={complete}>Mark delivered</Button> : null}
          {canReview ? (
            <Button size="sm" variant="secondary" onClick={() => setReviewOpen(true)}><Star className="size-3.5" aria-hidden />Leave a review</Button>
          ) : null}
        </CardFooter>
      </Card>

      {detailOpen ? <BookingDetailModal booking={booking} role={role} onClose={() => setDetailOpen(false)} /> : null}
      {cancelOpen ? <CancelBookingModal booking={booking} onClose={() => setCancelOpen(false)} onDone={() => { setCancelOpen(false); onChanged(); }} /> : null}
      {reviewOpen ? <ReviewModal booking={booking} onClose={() => setReviewOpen(false)} onDone={() => { setReviewOpen(false); onChanged(); }} /> : null}
    </>
  );
}

// ----------------------------------------------------------------------
// Detail modal
// ----------------------------------------------------------------------
function BookingDetailModal({ booking, role, onClose }: { booking: BookingListItem; role: Role; onClose: () => void }) {
  const isTransporter = role === "transporter";
  return (
    <Modal open onClose={onClose} title="Booking details" wide>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Requested {fmtDateTime(booking.createdAt)}</span>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Return trip</p>
          <p className="font-semibold text-slate-900"><RouteLine origin={booking.trip.originCity} via={booking.trip.viaCities} destination={booking.trip.destinationCity} /></p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li>Vehicle: {VEHICLE_TYPES[booking.trip.vehicleType]?.label}</li>
            <li>Departs {fmtDateTime(booking.trip.departureAt)}, returns {fmtDateTime(booking.trip.expectedReturnAt)}</li>
            <li>Capacity: {fmtTons(booking.trip.availableCapacity)} free of {fmtTons(booking.trip.maxCapacity)}</li>
            {booking.trip.goodsRestrictions.length ? <li>Restrictions: {booking.trip.goodsRestrictions.join(", ")}</li> : null}
            {booking.trip.notes ? <li className="text-slate-500">{booking.trip.notes}</li> : null}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Load</p>
          <p className="font-semibold text-slate-900">{booking.load.goodsType}</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li>{booking.load.pickupCity} → {booking.load.deliveryCity}</li>
            <li>{fmtTons(booking.load.weight)}{booking.load.volumeM3 ? ` · ${booking.load.volumeM3} m³` : ""}</li>
            <li>Pickup window {fmtDateTime(booking.load.pickupWindowStart)} – {fmtDateTime(booking.load.pickupWindowEnd)}</li>
            <li>Delivery deadline {fmtDateTime(booking.load.deliveryDeadline)}</li>
            {booking.load.specialHandling ? <li>{booking.load.specialHandling}</li> : null}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Counterparty</p>
          <p className="font-semibold text-slate-900">{booking.counterpart.fullName}{booking.counterpart.companyName ? ` · ${booking.counterpart.companyName}` : ""}</p>
          <p className="text-slate-600">{booking.counterpart.city ?? "—"} {booking.counterpart.phone ? `· ${booking.counterpart.phone}` : ""}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {booking.priceQuote !== undefined ? <MetaBlock label="Quoted price" value={fmtINR(booking.priceQuote)} /> : null}
          {booking.estimatedEarnings !== undefined ? <MetaBlock label="Est. earnings" value={fmtINR(booking.estimatedEarnings)} note="illustrative" /> : null}
          <MetaBlock label="Quantity" value={fmtTons(booking.quantityTons)} />
          <MetaBlock label={isTransporter ? "Shipper" : "Transporter"} value={booking.counterpart.fullName} />
        </div>

        {booking.message ? <Alert tone="info">Message from shipper: “{booking.message}”</Alert> : null}

        {booking.reviews.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reviews left on this booking</p>
            {booking.reviews.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="flex items-center gap-1 text-sm font-medium text-slate-800">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden /> {r.rating}/5
                </p>
                {r.comment ? <p className="mt-0.5 text-xs text-slate-500">{r.comment}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function MetaBlock({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}{note ? <span className="text-amber-500"> · {note}</span> : null}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Cancel modal
// ----------------------------------------------------------------------
function CancelBookingModal({ booking, onClose, onDone }: { booking: BookingListItem; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (reason.trim().length < 8) {
      setError("Please explain a little more (at least 8 characters).");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await data.cancelBooking(booking.id, user.id, reason.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Cancel booking">
      <form onSubmit={submit} className="space-y-4">
        <Alert tone="warning">
          Cancelling {booking.status === "accepted" ? "an accepted booking" : "a booking request"} frees the capacity and reopens the load for other transporters. The other party will be notified.
        </Alert>
        <Field label="Reason for cancellation" required htmlFor="cancel-reason" hint="Shown to the other party. Required.">
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Vehicle broke down and the run is delayed by a week." />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Keep booking</Button>
          <Button variant="danger" type="submit" loading={busy}>Cancel booking</Button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// Review modal
// ----------------------------------------------------------------------
function ReviewModal({ booking, onClose, onDone }: { booking: BookingListItem; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const res = await data.createReview({ bookingId: booking.id, authorId: user.id, rating, comment: comment.trim() || undefined });
    setBusy(false);
    if (!res.ok) {
      // surface error inline by simple re-render
      onDone();
      return;
    }
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={`Rate ${booking.counterpart.fullName}`}>
      <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {booking.load.goodsType} · {booking.load.pickupCity} → {booking.load.deliveryCity}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="rounded p-1 text-2xl focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <Star className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Comment" htmlFor="review-comment" hint="Optional, but helps others find reliable hauliers.">
          <Textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Punctual, careful with cargo, easy to coordinate…" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Not now</Button>
          <Button type="submit" loading={busy}>Submit review</Button>
        </div>
      </form>
    </Modal>
  );
}