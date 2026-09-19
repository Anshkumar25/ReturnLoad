import type { BookingStatus, IssueStatus, LoadStatus, TripStatus, VehicleStatus } from "@/lib/model";
import { BOOKING_STATUS_LABEL, ISSUE_STATUS_LABEL, LOAD_STATUS_LABEL, TRIP_STATUS_LABEL, VEHICLE_STATUS_LABEL } from "@/lib/model";
import { Badge } from "./badge";

const GOOD = { tone: "green" as const };
const WARN = { tone: "amber" as const };
const NEUTRAL = { tone: "slate" as const };
const INFO = { tone: "blue" as const };
const BRAND = { tone: "brand" as const };

const TRIP_TONE: Record<TripStatus, "green" | "amber" | "slate" | "blue"> = {
  active: "green",
  completed: "blue",
  cancelled: "slate",
  archived: "slate",
};

const LOAD_TONE: Record<LoadStatus, "green" | "amber" | "blue" | "slate" | "brand"> = {
  open: "green",
  booked: "brand",
  completed: "blue",
  cancelled: "slate",
  archived: "slate",
};

const BOOKING_TONE: Record<BookingStatus, "green" | "amber" | "slate" | "red" | "blue"> = {
  requested: "amber",
  accepted: "green",
  rejected: "slate",
  cancelled: "red",
  completed: "blue",
};

const VEHICLE_TONE: Record<VehicleStatus, "green" | "brand" | "amber"> = {
  available: "green",
  "on-trip": "brand",
  maintenance: "amber",
};

const ISSUE_TONE: Record<IssueStatus, "red" | "green" | "slate"> = {
  open: "red",
  resolved: "green",
  dismissed: "slate",
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge tone={TRIP_TONE[status]}>{TRIP_STATUS_LABEL[status]}</Badge>;
}
export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  return <Badge tone={LOAD_TONE[status]}>{LOAD_STATUS_LABEL[status]}</Badge>;
}
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}
export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge tone={VEHICLE_TONE[status]}>{VEHICLE_STATUS_LABEL[status]}</Badge>;
}
export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge tone={ISSUE_TONE[status]}>{ISSUE_STATUS_LABEL[status]}</Badge>;
}

export function VerificationBadge({ status }: { status: "unverified" | "pending" | "verified" }) {
  if (status === "verified") return <Badge tone={GOOD.tone}>Verified</Badge>;
  if (status === "pending") return <Badge tone={WARN.tone}>Verification pending</Badge>;
  return <Badge tone={NEUTRAL.tone}>Unverified</Badge>;
}

const COMPAT_TONE = { yes: GOOD, no: WARN, block: "red" as const };
export function MatchCompatibleBadge({ compatible }: { compatible: boolean }) {
  return compatible ? <Badge tone={COMPAT_TONE.yes.tone}>Great fit</Badge> : <Badge tone={COMPAT_TONE.block}>Needs manual review</Badge>;
}

export function ScoreTone({ score }: { score: number }) {
  if (score >= 70) return BRAND;
  if (score >= 40) return WARN;
  return INFO;
}