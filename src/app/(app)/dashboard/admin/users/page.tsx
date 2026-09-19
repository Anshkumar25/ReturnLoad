"use client";

import { BadgeCheck, ShieldX, Star } from "lucide-react";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/page-guard";
import { SpinnerCentered } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { VerificationBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/lib/model";

export default function AdminUsersPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <UsersTable />
    </RoleGuard>
  );
}

function UsersTable() {
  const toast = useToast();
  const { data: rows, loading, reload } = useAsyncData(async () => data.listAllUsers());

  if (loading || !rows) return <SpinnerCentered label="Loading users…" />;

  async function verify(userId: string, status: "verified" | "pending" | "unverified") {
    await data.setVerification(userId, status);
    toast.success(status === "verified" ? "User marked verified." : "Verification status updated.");
    void reload();
  }

  async function toggleSuspend(userId: string, suspended: boolean) {
    await data.suspendUser(userId, suspended);
    toast.info(suspended ? "Account suspended." : "Account restored.");
    void reload();
  }

  return (
    <>
      <PageHeader title="Users" description="Verification and account status across the marketplace." />
      {rows.length === 0 ? <Alert tone="info">No users yet.</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Verification</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Trips / Loads</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.profile;
              const suspended = !!p.isSuspended;
              return (
                <tr key={p.userId} className={`border-b border-slate-100 last:border-0 ${suspended ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials(p.fullName)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{p.fullName} {suspended ? <span className="ml-1 text-xs font-bold text-red-600">Suspended</span> : null}</p>
                        <p className="truncate text-xs text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">{p.role as Role}</td>
                  <td className="px-4 py-3 text-slate-700">{r.company?.name ?? "—"}</td>
                  <td className="px-4 py-3"><VerificationBadge status={p.verificationStatus} /></td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      {r.rating !== null ? (
                        <>
                          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden /> {r.rating.toFixed(1)} <span className="text-xs text-slate-400">({r.reviewCount})</span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="mr-2 inline-flex items-center gap-1"><BadgeCheck className="size-3.5 text-brand-500" aria-hidden />{r.tripCount} trips</span>
                    <span className="inline-flex items-center gap-1">{r.loadCount} loads</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.verificationStatus !== "verified" ? (
                        <Button size="sm" variant="secondary" onClick={() => void verify(p.userId, "verified")}>Verify</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => void verify(p.userId, "pending")}>Re-check</Button>
                      )}
                      {p.role !== "admin" ? (
                        suspended ? (
                          <Button size="sm" variant="secondary" onClick={() => void toggleSuspend(p.userId, false)}>Restore</Button>
                        ) : (
                          <Button size="sm" variant="subtleDanger" onClick={() => void toggleSuspend(p.userId, true)}><ShieldX className="size-3.5" aria-hidden />Suspend</Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}