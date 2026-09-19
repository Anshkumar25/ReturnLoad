"use client";

import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { BookingsList } from "@/components/features/bookings-list";

export default function TransporterBookingsPage() {
  const { user } = useAuth();
  const { data: bookings, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return [];
    return data.listBookingsFor(uid, "transporter");
  });

  return (
    <>
      <PageHeader title="Bookings" description="Shippers request space on your return trips. Accept what fits, decline politely, and keep your commitments." />
      <BookingsList bookings={bookings} loading={loading} role="transporter" onReload={reload} />
    </>
  );
}