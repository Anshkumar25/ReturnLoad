"use client";

import Link from "next/link";
import {
  Bell,
  ArrowRight,
  ClipboardCheck,
  Check,
  CalendarPlus,
  MessageSquare,
  Search,
  ShieldCheck,
  Flag,
  CalendarX,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import type { NotificationType } from "@/lib/model";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const TYPE_META: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  "booking-request": { icon: CalendarPlus, tone: "bg-brand-50 text-brand-600" },
  "booking-accepted": { icon: ClipboardCheck, tone: "bg-green-50 text-green-600" },
  "booking-rejected": { icon: CalendarX, tone: "bg-red-50 text-red-500" },
  "booking-cancelled": { icon: CalendarX, tone: "bg-orange-50 text-orange-500" },
  "booking-completed": { icon: Check, tone: "bg-emerald-50 text-emerald-600" },
  "new-review": { icon: MessageSquare, tone: "bg-amber-50 text-amber-600" },
  "new-match": { icon: Search, tone: "bg-violet-50 text-violet-600" },
  verification: { icon: ShieldCheck, tone: "bg-sky-50 text-sky-600" },
  issue: { icon: Flag, tone: "bg-slate-100 text-slate-600" },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data: items, loading, reload } = useAsyncData(async () =>
    user ? data.listNotifications(user.id) : []
  );

  if (loading || !items) return <SpinnerCentered label="Loading notifications…" />;

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!user) return;
    await data.markNotificationsRead(user.id);
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `You have ${unread} unread.` : "No unread notifications."}
        actions={
          unread > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => void markAllRead()}>
              <Check className="size-3.5" aria-hidden /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing here yet" description="Bookings, matches and verification updates will show up here." />
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={cn(!n.read && "border-brand-200 bg-brand-50/40")}>
                <CardBody className="flex items-start gap-3">
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(n.createdAt)}</span>
                    </div>
                    {n.body ? <p className="mt-0.5 text-sm text-slate-600">{n.body}</p> : null}
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View details <ArrowRight className="size-3" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                  {!n.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-500" aria-label="unread" /> : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}