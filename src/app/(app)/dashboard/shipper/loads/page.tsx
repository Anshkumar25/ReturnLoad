"use client";

import { useState } from "react";
import { PackagePlus, PackageX } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SpinnerCentered } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadCard } from "@/components/features/load-card";
import { LoadFormModal } from "@/components/features/load-form";
import { useToast } from "@/components/ui/toast";

export default function ShipperLoadsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const { data: loads, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return [];
    return data.listLoadsByShipper(uid);
  });

  if (loading) return <SpinnerCentered label="Loading your loads…" />;
  const all = loads ?? [];
  const open = all.filter((l) => l.status === "open");

  async function withdraw(id: string, description: string) {
    if (typeof window !== "undefined" && !window.confirm(`Withdraw "${description}"? It will no longer be matched to return trips.`)) return;
    await data.cancelLoad(id);
    toast.info("Load withdrawn.");
    void reload();
  }

  return (
    <>
      <PageHeader
        title="My loads"
        description="Things you need shipped. Open loads are matched against trucks returning your way."
        actions={<Button onClick={() => setFormOpen(true)}><PackagePlus className="size-4" aria-hidden />Post a load</Button>}
      />

      {all.length === 0 ? (
        <EmptyState icon={PackagePlus} title="No loads yet" description="Post what you need moved and return trips headed your way will match it automatically." action={{ label: "Post your first load", onClick: () => setFormOpen(true) }} />
      ) : (
        <>
          {open.length === 0 ? (
            <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">All your loads are booked or complete. Post a new one to keep shipping cheap.</p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {all.map((l) => (
              <LoadCard
                key={l.id}
                load={l}
                footer={
                  l.status === "open" ? (
                    <button type="button" onClick={() => void withdraw(l.id, l.goodsType)} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700">
                      <PackageX className="size-3.5" aria-hidden /> Withdraw load
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        </>
      )}

      {formOpen ? (
        <LoadFormModal
          userId={user?.id ?? ""}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            void reload();
            toast.success("Load posted — transporters on your route have been notified.");
          }}
        />
      ) : null}
    </>
  );
}