"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { TripMatchCard } from "@/components/features/match-cards";
import { BookingRequestModal } from "@/components/features/booking-request-modal";
import { Field, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { fmtTons } from "@/lib/format";
import type { Load } from "@/lib/model";

export default function ShipperSearchPage() {
  const { user } = useAuth();
  const { data: myLoads, loading: loadingLoads } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return [];
    return data.listLoadsByShipper(uid);
  });
  const openLoads = (myLoads ?? []).filter((l) => l.status === "open");
  const [loadId, setLoadId] = useState("");
  const selected = openLoads.find((l) => l.id === loadId) ?? openLoads[0] ?? null;

  const { data: matches, loading: loadingMatches, reload } = useAsyncData(
    async (ref) => {
      const id = String(ref ?? "");
      if (!id) return null;
      return data.getLoadMatches(id);
    },
    selected?.id ?? null,
  );

  if (loadingLoads) return <SpinnerCentered label="Loading your loads…" />;

  return (
    <>
      <PageHeader
        title="Find return trips"
        description="Return trips scored against your load — the same matching engine, from the shipper's side. Request the ones that fit."
        actions={openLoads.length > 0 ? <Button variant="secondary" onClick={() => void reload()}>Refresh</Button> : undefined}
      />

      {openLoads.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Pick a load to search trips"
          description="You don't have any open loads. Post one and matching return trips will show up here."
          action={{ component: <Link href="/dashboard/shipper/loads"><Button>Post a load</Button></Link> }}
        />
      ) : (
        <>
          <div className="mb-5 max-w-sm">
            <Field label="Ship this load" htmlFor="search-load" hint={`${openLoads.length} open load${openLoads.length > 1 ? "s" : ""} · trips scored for route fit, capacity and timing.`}>
              <Select id="search-load" value={selected?.id ?? ""} onChange={(e) => setLoadId(e.target.value)}>
                {openLoads.map((l) => (
                  <option key={l.id} value={l.id}>{l.goodsType} · {l.pickupCity} → {l.deliveryCity} · {fmtTons(l.weight)}</option>
                ))}
              </Select>
            </Field>
          </div>

          {selMatches(selected?.id)}
        </>
      )}
    </>
  );

  function selMatches(id: string | null | undefined) {
    if (!id) return null;
    return <MatchesForLoad loadId={id} matches={matches} loading={loadingMatches} onReload={reload} openLoads={openLoads} />;
  }
}

function MatchesForLoad({ loadId, matches, loading, onReload, openLoads }: { loadId: string; matches: Awaited<ReturnType<typeof data.getLoadMatches>> | null; loading: boolean; onReload: () => void; openLoads: Load[] }) {
  const [requestTrip, setRequestTrip] = useState<Awaited<ReturnType<typeof data.getLoadMatches>>[number]["trip"] | null>(null);

  if (loading || !matches) return <SpinnerCentered label="Scoring return trips…" />;
  const theLoad = openLoads.find((l) => l.id === loadId)!;
  const compatible = matches.filter((m) => m.match.compatible);

  if (compatible.length === 0) {
    return (
      <EmptyState icon={Search} title="No compatible return trips yet" description="Try again later — or post a load in a lane with more return traffic. We'll notify you when a match appears." action={{ component: <Button variant="secondary" onClick={() => void onReload()}>Refresh</Button> }} />
    );
  }

  return (
    <>
      <Alert tone="info" className="mb-4">
        Showing {compatible.length} return trip{compatible.length > 1 ? "s" : ""} sorted by fit. Request the best one — the transporter confirms, and only then is space locked.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        {compatible.map((m) => (
          <TripMatchCard
            key={m.trip.id}
            load={theLoad}
            tripMatch={m}
            actions={
              <Button size="sm" onClick={() => setRequestTrip(m.trip)} disabled={m.match.compatible === false}>
                Request booking
              </Button>
            }
          />
        ))}
      </div>

      {requestTrip ? (
        <BookingRequestModal
          trip={requestTrip}
          loads={openLoads}
          onClose={() => setRequestTrip(null)}
          onDone={() => {
            setRequestTrip(null);
            void onReload();
          }}
        />
      ) : null}
    </>
  );
}