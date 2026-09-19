"use client";

import { Badge } from "@/components/ui/badge";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo/store";
import { APP_MODE } from "@/lib/config";
import { ROLE_LABEL } from "@/lib/model";

/** One-tap demo account fillers, shown on the login page in demo mode. */
export function DemoAccountChips({ onPick }: { onPick: (email: string, password: string) => void }) {
  if (APP_MODE !== "demo") return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
        <Badge tone="accent" className="px-1.5 py-0">Demo</Badge>
        Try a seeded account — password: <code className="rounded bg-amber-100 px-1">{DEMO_PASSWORD}</code>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => onPick(a.email, DEMO_PASSWORD)}
            className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {ROLE_LABEL[a.role as keyof typeof ROLE_LABEL]} · {a.fullName}
          </button>
        ))}
      </div>
    </div>
  );
}