"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { APP_MODE } from "@/lib/config";
import { Badge } from "@/components/ui/badge";

export function PublicNav() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const authed = status === "authed";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <Link href="/#problem" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Problem
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            How it works
          </Link>
          <Link href="/#benefits" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Benefits
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Estimates
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {APP_MODE === "demo" ? <Badge tone="accent">Demo mode</Badge> : null}
          {authed ? (
            <Link href="/dashboard">
              <Button variant="primary">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/signup">
                <Button variant="primary">Sign up free</Button>
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="rounded p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/#problem" className="py-1 text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Problem</Link>
            <Link href="/#how-it-works" className="py-1 text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>How it works</Link>
            <Link href="/#benefits" className="py-1 text-sm font-medium text-slate-700" onClick={() => setOpen(false)}>Benefits</Link>
            {authed ? (
              <Link href="/dashboard"><Button className="w-full">Go to dashboard</Button></Link>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link href="/login"><Button variant="secondary" className="w-full">Log in</Button></Link>
                <Link href="/signup"><Button className="w-full">Sign up free</Button></Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}