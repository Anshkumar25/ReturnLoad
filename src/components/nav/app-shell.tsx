"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { NAV_ITEMS, SECONDARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { SpinnerCentered } from "@/components/ui/spinner";
import { initials } from "@/lib/format";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  // Close the mobile drawer / account menu when a nav link is tapped.
  const closeMenus = () => {
    setMenuOpen(false);
    setUserOpen(false);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <SpinnerCentered label="Loading your workspace…" />
      </div>
    );
  }
  if (status !== "authed" || !user) return null;

  const items = NAV_ITEMS[user.role] ?? [];
  const isActive = (href: string) => href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMenus}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href) ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        ))}
        <div className="pt-3">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account</p>
        </div>
        {SECONDARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMenus}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href) ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs capitalize text-slate-500">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="hidden text-sm font-semibold text-slate-700 sm:block">{topbarTitle(pathname)}</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                className="ml-1 flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-500"
                aria-label="Account menu"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {initials(user.fullName)}
                </span>
              </button>
              {userOpen ? (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} aria-hidden />
                  <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Link href="/dashboard/profile" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      Profile
                    </Link>
                    <Link href="/dashboard/notifications" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      Notifications
                    </Link>
                    <button
                      type="button"
                      onClick={() => { void signOut(); router.replace("/login"); }}
                      className="mt-1 flex w-full items-center gap-2 rounded border-t border-slate-100 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="size-4" aria-hidden /> Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="page py-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function topbarTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Overview",
    "/dashboard/profile": "Profile",
    "/dashboard/notifications": "Notifications",
    "/dashboard/transporter/vehicles": "Vehicles",
    "/dashboard/transporter/trips": "Return trips",
    "/dashboard/transporter/matches": "Match loads",
    "/dashboard/transporter/bookings": "Bookings",
    "/dashboard/shipper/loads": "My loads",
    "/dashboard/shipper/search": "Find return trips",
    "/dashboard/shipper/bookings": "Bookings",
    "/dashboard/admin/users": "Users",
    "/dashboard/admin/listings": "Listings",
    "/dashboard/admin/issues": "Reported issues",
  };
  return map[pathname] ?? "ReturnLoad";
}