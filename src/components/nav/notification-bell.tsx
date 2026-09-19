"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect } from "react";
import { unreadCount } from "@/lib/data";
import { useAsyncData } from "@/hooks/use-async-data";

/** Unread-notification bell. Refreshes when the route changes (e.g. new booking). */
export function NotificationBell({ userId }: { userId: string }) {
  const { data: count, reload } = useAsyncData(async (ref) => {
    const who = String(ref ?? "");
    if (!who) return 0;
    return unreadCount(who);
  }, userId);

  // Refresh whenever the user id or route changes.
  useEffect(() => {
    void reload(userId);
  }, [userId, reload]);

  const n = count ?? 0;
  return (
    <Link
      href="/dashboard/notifications"
      className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-brand-500"
      aria-label={`Notifications${n > 0 ? ` (${n} unread)` : ""}`}
    >
      <Bell className="size-5" aria-hidden />
      {n > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {n > 9 ? "9+" : n}
        </span>
      ) : null}
    </Link>
  );
}