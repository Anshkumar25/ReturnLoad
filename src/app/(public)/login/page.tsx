"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { APP_MODE } from "@/lib/config";
import { DemoAccountChips } from "@/components/auth/demo-accounts";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter both your email and password.");
      return;
    }
    setBusy(true);
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not sign you in.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500">Log in to publish trips, post loads and book return cargo.</p>
      </div>

      {APP_MODE === "demo" ? <DemoAccountChips onPick={(e, p) => { setEmail(e); setPassword(p); setError(null); }} /> : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" required htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password" required htmlFor="password" hint="At least 8 characters.">
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        New to ReturnLoad?{" "}
        <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>

      {APP_MODE === "demo" ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Repeat className="size-3.5" aria-hidden /> Sign-in is simulated in demo mode — data lives only in this browser.
        </p>
      ) : null}
      <div className="flex justify-center">{APP_MODE === "demo" ? <Badge tone="accent">Demo mode</Badge> : null}</div>
    </AuthLayout>
  );
}