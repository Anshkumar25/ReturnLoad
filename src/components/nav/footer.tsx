import { ShieldCheck, Truck, Zap } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="page grid gap-8 py-10 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Truck className="size-4 text-brand-600" aria-hidden /> Return<span className="text-brand-600">Load</span>
          </p>
          <p className="max-w-xs text-sm text-slate-500">
            The return-load marketplace. Trucks never run empty; shippers pay less to move freight.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">For transporters</p>
          <p className="text-slate-500">Publish your empty return leg and get matched with cargo headed your way.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">For shippers</p>
          <p className="text-slate-500">Ship on trucks already coming your way — faster pickup, lower cost, verified hauliers.</p>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="page flex flex-col gap-2 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden /> All distances, detours and earnings shown are estimates.</p>
          <p className="flex items-center gap-1.5"><Zap className="size-3.5" aria-hidden /> Built for small fleets and independent truck owners.</p>
        </div>
      </div>
    </footer>
  );
}