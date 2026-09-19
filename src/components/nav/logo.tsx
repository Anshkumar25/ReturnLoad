import { Truck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/config";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-brand-500" aria-label={`${APP_NAME} home`}>
      <span className={cn("flex items-center justify-center rounded-lg bg-brand-600 text-white", size === "md" ? "size-9" : "size-8")}>
        <Truck className={size === "md" ? "size-5" : "size-4.5"} aria-hidden />
      </span>
      <span className={cn("font-bold tracking-tight text-slate-900", size === "md" ? "text-lg" : "text-base")}>
        Return<span className="text-brand-600">Load</span>
      </span>
    </Link>
  );
}