"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Flag,
  Inbox,
  PackageSearch,
  Truck as TruckIcon,
  Users,
  Weight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { StatCard } from "@/components/ui/stat-card";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { TripCard } from "@/components/features/trip-card";
import { LoadCard } from "@/components/features/load-card";
import { BookingCard } from "@/components/features/booking-card";
import { LoadMatchCard } from "@/components/features/match-cards";
import { fmtTons } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "transporter") return <TransporterOverview />;
  if (role === "shipper") return <ShipperOverview />;
  if (role === "admin") return <AdminOverview />;
  return null;
}

// ---------------------------------------------------------------------
function TransporterOverview() {
  const { user } = useAuth();
  const { data: d, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    const [trips, vehicles, bookings] = await Promise.all([
      data.listTripsByTransporter(uid),
      data.listVehicles(uid),
      data.listBookingsFor(uid, "transporter"),
    ]);
    return { trips, vehicles, bookings };
  });

  if (loading || !d) return <SpinnerCentered label="Loading overview…" />;
  const activeTrips = d.trips.filter((t) => t.status === "active");
  const freeTons = activeTrips.reduce((s, t) => s + (t.availableCapacity > 0 ? t.availableCapacity : 0), 0);
  const pending = d.bookings.filter((b) => b.status === "requested");
  const latestTrip = activeTrips[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(" ")[0] ?? "there"}`}
        description="Your return legs, at a glance. Match cargo before you head back empty."
        actions={<Link href="/dashboard/transporter/trips"><Button>Publish a return trip</Button></Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarRange} label="Active return trips" value={activeTrips.length} />
        <StatCard icon={Weight} label="Return capacity free" value={fmtTons(freeTons)} tone="green" />
        <StatCard icon={TruckIcon} label="Vehicles" value={d.vehicles.length} tone="blue" />
        <StatCard icon={Inbox} label="Pending requests" value={pending.length} tone={pending.length ? "accent" : "neutral"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionTitle title="Your return trips" link={{ href: "/dashboard/transporter/trips", label: "Manage trips" }} />
          {activeTrips.length === 0 ? (
            <Card><CardBody><EmptyState icon={CalendarRange} title="No return trips yet" description="Publish the return leg of your run and start earning instead of driving back empty." action={{ component: <Link href="/dashboard/transporter/trips"><Button>Publish a return trip</Button></Link> }} /></CardBody></Card>
          ) : (
            activeTrips.slice(0, 2).map((t) => (
              <TripCard key={t.id} trip={t} />
            ))
          )}
        </div>

        <div className="space-y-4">
          <SectionTitle title="Recent bookings" link={{ href: "/dashboard/transporter/bookings", label: "All bookings" }} />
          {d.bookings.length === 0 ? (
            <Card><CardBody><EmptyState icon={ClipboardList} title="No bookings yet" description="When shippers request space on your trips you'll see and accept them here." /></CardBody></Card>
          ) : (
            d.bookings.slice(0, 2).map((b) => <BookingCard key={b.id} booking={b} role="transporter" onChanged={reload} />)
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <SectionTitle title="Suggested return loads" link={{ href: "/dashboard/transporter/matches", label: "Match all loads" }} />
        {latestTrip ? <SuggestedLoadsPreviews tripId={latestTrip.id} /> : null}
      </div>
    </>
  );
}

function SuggestedLoadsPreviews({ tripId }: { tripId: string }) {
  const { data: res, loading } = useAsyncData(async () => {
    const trip = await data.getTrip(tripId);
    if (!trip) return null;
    const matches = await data.getTripMatches(tripId);
    return { trip, matches };
  }, tripId);
  if (loading || !res) return <SpinnerCentered label="Scoring loads…" />;
  const good = res.matches.filter((m) => m.match.compatible).slice(0, 3);
  if (good.length === 0) {
    return (
      <Card><CardBody><EmptyState icon={PackageSearch} title="No strong fits right now" description="Keep the trip active — we'll notify you when a compatible load is posted near your route." /></CardBody></Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {good.map((m) => <LoadMatchCard key={m.load.id} trip={res.trip} loadMatch={m} />)}
    </div>
  );
}

// ---------------------------------------------------------------------
function ShipperOverview() {
  const { user } = useAuth();
  const { data: d, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    const [loads, bookings] = await Promise.all([data.listLoadsByShipper(uid), data.listBookingsFor(uid, "shipper")]);
    return { loads, bookings };
  });

  if (loading || !d) return <SpinnerCentered label="Loading overview…" />;
  const open = d.loads.filter((l) => l.status === "open");
  const booked = d.loads.filter((l) => l.status === "booked");
  const pending = d.bookings.filter((b) => b.status === "requested");

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(" ")[0] ?? "there"}`}
        description="Ship cheaper on trucks already coming your way."
        actions={<Link href="/dashboard/shipper/loads"><Button>Post a load</Button></Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={PackageSearch} label="Open loads" value={open.length} />
        <StatCard icon={ClipboardCheck} label="Booked loads" value={booked.length} tone="green" />
        <StatCard icon={Inbox} label="Pending requests" value={pending.length} tone={pending.length ? "accent" : "neutral"} />
        <StatCard icon={PackageSearch} label="Completed" value={d.loads.filter((l) => l.status === "completed").length} tone="blue" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionTitle title="Your loads" link={{ href: "/dashboard/shipper/loads", label: "Manage loads" }} />
          {d.loads.length === 0 ? (
            <Card><CardBody><EmptyState icon={PackageSearch} title="No loads yet" description="Post what you need shipped and let return trips come to you." action={{ component: <Link href="/dashboard/shipper/loads"><Button>Post a load</Button></Link> }} /></CardBody></Card>
          ) : (
            d.loads.slice(0, 2).map((l) => <LoadCard key={l.id} load={l} />)
          )}
        </div>
        <div className="space-y-4">
          <SectionTitle title="Recent bookings" link={{ href: "/dashboard/shipper/bookings", label: "All bookings" }} />
          {d.bookings.length === 0 ? (
            <Card><CardBody><EmptyState icon={ClipboardList} title="No bookings yet" description="Use Find return trips to request space on a truck coming your way." /></CardBody></Card>
          ) : (
            d.bookings.slice(0, 2).map((b) => <BookingCard key={b.id} booking={b} role="shipper" onChanged={reload} />)
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
function AdminOverview() {
  const { data: d, loading } = useAsyncData(async () => {
    const [users, issues] = await Promise.all([data.listAllUsers(), data.listIssues()]);
    return { users, issues };
  });
  if (loading || !d) return <SpinnerCentered label="Loading workspace…" />;
  const openIssues = d.issues.filter((i) => i.status === "open");
  const transportCount = d.users.filter((u) => u.profile.role === "transporter").length;

  return (
    <>
      <PageHeader title="Admin overview" description="Guard the marketplace: users, listings and reported issues." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Users" value={d.users.length} />
        <StatCard icon={TruckIcon} label="Transporters" value={transportCount} tone="blue" />
        <StatCard icon={Flag} label="Open issues" value={openIssues.length} tone={openIssues.length ? "red" : "green"} />
        <StatCard icon={ClipboardList} label="Resolved issues" value={d.issues.length - openIssues.length} tone="neutral" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recently reported issues</CardTitle></CardHeader>
          {d.issues.length === 0 ? (
            <CardBody><EmptyState icon={Flag} title="Plenty clear" description="No reported issues at the moment." /></CardBody>
          ) : (
            <CardBody className="space-y-2">
              {d.issues.slice(0, 4).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{i.reason}</span>
                  <span className="shrink-0 text-xs text-slate-400">{i.subjectType} · {i.status}</span>
                </div>
              ))}
            </CardBody>
          )}
          <CardFooter><Link href="/dashboard/admin/issues" className="text-sm font-medium text-brand-600 hover:text-brand-700">Open issues centre <ArrowRight className="inline size-3.5" /></Link></CardFooter>
        </Card>
        <Card>
          <CardHeader><CardTitle>Marketplace health</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-600">
            <p>{d.users.length} accounts on the platform.</p>
            <p>{d.users.filter((u) => u.profile.verificationStatus === "verified").length} verified profiles.</p>
            <p>{d.users.filter((u) => u.profile.isSuspended).length} suspended accounts.</p>
            <p className="text-xs text-slate-400">Verification and suspensions are managed from the Users tab.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function SectionTitle({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {link ? <Link href={link.href} className="text-sm font-medium text-brand-600 hover:text-brand-700">{link.label} <ArrowRight className="inline size-3.5" /></Link> : null}
    </div>
  );
}