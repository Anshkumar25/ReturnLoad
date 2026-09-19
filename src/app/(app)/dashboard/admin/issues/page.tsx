"use client";

import { Flag, ShieldCheck, ShieldX } from "lucide-react";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/page-guard";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardBody } from "@/components/ui/card";
import { IssueStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

export default function AdminIssuesPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <Issues />
    </RoleGuard>
  );
}

function Issues() {
  const toast = useToast();
  const { data: issues, loading, reload } = useAsyncData(async () => {
    const [list, users] = await Promise.all([data.listIssues(), data.listAllUsers()]);
    const reporterOf = new Map(users.map((u) => [u.profile.userId, u.profile.fullName]));
    return { issues: list, reporterOf };
  });

  if (loading || !issues) return <SpinnerCentered label="Loading issues…" />;

  async function setStatus(id: string, status: "resolved" | "dismissed") {
    await data.resolveIssue(id, status);
    toast.info(status === "resolved" ? "Marked resolved." : "Dismissed — no action needed.");
    void reload();
  }

  if (issues.issues.length === 0) {
    return (
      <>
        <PageHeader title="Reported issues" description="Community reports, triaged." />
        <EmptyState icon={Flag} title="Nothing reported" description="No issues to review right now." />
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Reported issues (${issues.issues.filter((i) => i.status === "open").length} open)`} description="Shippers and transporters flag mismatches, safety concerns or suspected misuse." />
      <div className="space-y-4">
        {issues.issues.map((i) => (
          <Card key={i.id}>
            <CardBody className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={i.status === "open" ? "red" : i.status === "resolved" ? "green" : "neutral"}>{i.subjectType}</Badge>
                  <p className="text-sm font-medium text-slate-800">{i.reason}</p>
                </div>
                <IssueStatusBadge status={i.status} />
              </div>
              {i.details ? <p className="text-sm text-slate-600">{i.details}</p> : null}
              <p className="text-xs text-slate-400">
                Reported by {issues.reporterOf.get(i.reporterId) ?? "a user"} · subject {i.subjectId} · {fmtDateTime(i.createdAt)}
              </p>
              {i.status === "open" ? (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => void setStatus(i.id, "resolved")}><ShieldCheck className="size-3.5" aria-hidden />Mark resolved</Button>
                  <Button size="sm" variant="ghost" onClick={() => void setStatus(i.id, "dismissed")}><ShieldX className="size-3.5" aria-hidden />Dismiss</Button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}