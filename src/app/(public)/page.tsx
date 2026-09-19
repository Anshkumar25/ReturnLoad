import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  IndianRupee,
  Leaf,
  MapPin,
  PackageSearch,
  Repeat,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { APP_MODE } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="page pb-16">
      {/* ------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------ */}
      <section className="grid items-center gap-8 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="space-y-6">
          <Badge tone="brand" className="gap-1.5">
            <Leaf className="size-3.5" aria-hidden /> India&apos;s return-load marketplace
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Your truck is coming back <span className="text-brand-600">empty</span>.
            <br />
            Fill it up and earn.
          </h1>
          <p className="max-w-xl text-lg text-slate-600">
            ReturnLoad matches your empty return trip with shippers who need goods moved the same way.
            Trucks stop running empty. Shippers get cheaper, greener freight.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/signup?role=transporter">
              <Button size="lg">I have a truck — find return cargo</Button>
            </Link>
            <Link href="/signup?role=shipper">
              <Button size="lg" variant="secondary">I need cargo moved — ship cheaper</Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            No card needed · Create an account and post in minutes{APP_MODE === "demo" ? " · demo data is pre-seeded" : ""}
          </p>
        </div>

        {/* Headline scenario */}
        <Card className="border-brand-100 shadow-md">
          <CardBody className="space-y-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">The ReturnLoad scenario</p>
            <ScenarioRow
              step="1"
              from="Delhi"
              to="Jaipur"
              label="Truck delivers freight"
              detail="≈ 270 km run, cargo already paid for."
            />
            <ScenarioRow
              step="2"
              from="Jaipur"
              to="Delhi"
              label="No cargo booked on return"
              detail="Without ReturnLoad this leg runs empty — the classic “empty return”."
              accent
            />
            <ScenarioRow
              step="3"
              from="Jaipur"
              to="Delhi"
              label="ReturnLoad books a return load"
              detail="Spices from a Jaipur shipper, matched to the exact return leg."
            />
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Result: the driver earns on the way home.</p>
              <p className="mt-0.5 text-emerald-700">Transporter earns instead of running empty · shipper ships at a low return-trip rate.</p>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* ------------------------------------------------------ */}
      {/* Problem */}
      {/* ------------------------------------------------------ */}
      <section id="problem" className="scroll-mt-20 py-14">
        <SectionHeading
          eyebrow="The problem"
          title="Thousands of trucks return empty every night"
          sub="On India's major lanes, a big share of trucks come back without cargo after delivering their outbound load. That empty kilometre costs fuel, time and freight — and it pushes prices up for everyone."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <FactCard icon={<Truck className="size-5" aria-hidden />} title="Empty return legs" text="After a Delhi → Jaipur delivery, the same truck often drives Jaipur → Delhi with nothing on board." />
          <FactCard icon={<IndianRupee className="size-5" aria-hidden />} title="Cost passed to shippers" text="Transporters price the risk of an empty return into every outbound quote — so shippers pay more." />
          <FactCard icon={<Leaf className="size-5" aria-hidden />} title="Unnecessary emissions" text="Empty kilometres burn fuel and add to congestion with zero productive output." />
        </div>
      </section>

      {/* ------------------------------------------------------ */}
      {/* How it works */}
      {/* ------------------------------------------------------ */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-slate-200 py-14">
        <SectionHeading
          eyebrow="How it works"
          title="Two minutes to your first return booking"
          sub="No live GPS, no live pricing surprises — just reliable matching on routes, capacity and timing, with costs clearly shown as estimates."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard n="1" icon={Truck} title="Post your trip" text="Tell us where your truck delivers and when it returns, plus free capacity and any cargo you won't carry." />
          <StepCard n="2" icon={PackageSearch} title="Get matched return loads" text="Our engine scores open loads against your return leg: route fit, detour, capacity, timing and cargo." />
          <StepCard n="3" icon={Users} title="Book and confirm" text="Shippers request a booking. You review the load, accept when it fits, and the capacity locks on the trip." />
          <StepCard n="4" icon={BadgeCheck} title="Deliver, review, build trust" text="Complete the delivery, leave a review. Verified profiles and ratings make each match safer." />
        </div>
      </section>

      {/* ------------------------------------------------------ */}
      {/* Both sides */}
      {/* ------------------------------------------------------ */}
      <section className="border-t border-slate-200 py-14">
        <SectionHeading
          eyebrow="Built for both sides"
          title="One marketplace, two clear wins"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardBody className="space-y-4 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">For transporters</p>
              <ul className="space-y-3 text-sm text-slate-600">
                <Benefit icon={Repeat} text="Turn empty return kilometres into revenue instead of cost." />
                <Benefit icon={Route} text="Match loads to your exact route — not just your destination city — with detour tiers for on-route, minor, moderate and substantial." />
                <Benefit icon={Scale} text="Use leftover capacity with partial loads; stack multiple return bookings on one trip." />
                <Benefit icon={CalendarClock} text="Book only what your return schedule allows; your availability stays under your control." />
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-4 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-accent-700">For shippers</p>
              <ul className="space-y-3 text-sm text-slate-600">
                <Benefit icon={Repeat} text="Ship on trucks already heading your way — faster pickup and lower rates than a dedicated hire." />
                <Benefit icon={Route} text="See why a truck is a match: route overlap, capacity fit, pickup window and cargo compatibility, all in plain reasons." />
                <Benefit icon={Scale} text="Fit loads from cartons of spices to a full 20 t trailer load with weight, volume and dimensions." />
                <Benefit icon={ShieldCheck} text="Review verification status, ratings and booking history before you commit." />
              </ul>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------ */}
      {/* Differentiators / Estimates */}
      {/* ------------------------------------------------------ */}
      <section id="pricing" className="scroll-mt-20 border-t border-slate-200 py-14">
        <SectionHeading
          eyebrow="Transparent estimates"
          title="Know the money before you book"
          sub="Every match shows an illustrative earnings figure for the transporter and an estimated route distance for the shipper. These are estimates from a built-in city table, clearly labelled — never presented as live quotes."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <FactCard icon={<Sparkles className="size-5" aria-hidden />} title="Match reasons, not guesswork" text="Each match explains itself: “On the return route — uses ~60% of it”, “Capacity fits — 2.3 t left for more loads”." />
          <FactCard icon={<IndianRupee className="size-5" aria-hidden />} title="Illustrative earnings" text="Estimated using typical market rates (₹ per tonne-km) minus an operating cost estimate. Clearly marked Est." />
          <FactCard icon={<MapPin className="size-5" aria-hidden />} title="Routing fallback" text="Distances come from a built-in city directory. Add Google Maps or Mapbox keys and the same UI can use live routing later." />
        </div>
      </section>

      {/* ------------------------------------------------------ */}
      {/* CTA */}
      {/* ------------------------------------------------------ */}
      <section className="scroll-mt-20 border-t border-slate-200 py-14">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-center text-white sm:px-12">
          <p className="text-3xl font-bold sm:text-4xl">Fill your empty return leg today</p>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            {APP_MODE === "demo"
              ? "This build runs in demo mode with pre-seeded data. Explore as a transporter, a shipper, or an admin using the demo accounts."
              : "Create a free account, post your trip or load, and get matched."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="bg-white text-brand-800 hover:bg-brand-50">
                Get started <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------
// Small presentational pieces (colocated so the page reads top-down)
// ---------------------------------------------------------------
function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{eyebrow}</p>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {sub ? <p className="text-base text-slate-600">{sub}</p> : null}
    </div>
  );
}

function ScenarioRow({ step, from, to, label, detail, accent }: { step: string; from: string; to: string; label: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${accent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${accent ? "bg-amber-500" : "bg-brand-600"}`}>{step}</span>
        <span className="flex items-center gap-1.5">
          {from} <ArrowRight className="size-3.5 text-slate-400" aria-hidden /> {to}
        </span>
      </div>
      <p className={`mt-0.5 text-sm ${accent ? "text-amber-900" : "text-slate-500"}`}>{label}</p>
      <p className={`text-xs ${accent ? "text-amber-700/80" : "text-slate-400"}`}>{detail}</p>
    </div>
  );
}

function FactCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card>
      <CardBody className="space-y-2 p-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{text}</p>
      </CardBody>
    </Card>
  );
}

function StepCard({ n, icon: Icon, title, text }: { n: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-3xl font-extrabold text-slate-200">{n}</p>
      <p className="mt-1 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function Benefit({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
      <span>{text}</span>
    </li>
  );
}