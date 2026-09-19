"use client";

import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { BookingsList } from "@/components/features/bookings-list";

export default function ShipperBookingsPage() {
  const { user } = useAuth();
  const { data: bookings, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return [];
    return data.listBookingsFor(uid, "shipper");
  });

  return (
    <>
      <PageHeader title="Bookings" description="Requests you've sent to transporters, and their status as they accept, decline, cancel or deliver." />
      <BookingsList bookings={bookings} loading={loading} role="shipper" onReload={reload} />
    </>
  );
}