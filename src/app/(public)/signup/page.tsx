"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch, Truck, Check } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { signupSchema } from "@/lib/validation";
import type { Role } from "@/lib/model";
import { cn } from "@/lib/cn";

const ROLES: { value: Exclude<Role, "admin">; title: string; desc: string; icon: typeof Truck }[] = [
  { value: "transporter", title: "I have a truck", desc: "Publish return trips and earn from return cargo.", icon: Truck },
  { value: "shipper", title: "I need cargo moved", desc: "Post loads and book trucks already coming your way.", icon: PackageSearch },
];

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Exclude<Role, "admin">>("transporter");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const parsed = signupSchema.safeParse({ fullName, email, password, role });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first ? first.message : "Please review the highlighted fields.");
      return;
    }
    setBusy(true);
    const res = await signUp({ fullName, email, password, role });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create your account.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Create your free account</h1>
        <p className="text-sm text-slate-500">Choose how you&apos;ll use ReturnLoad.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const active = role === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={active}
              className={cn(
                "relative rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-500",
                active ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-300 bg-white hover:border-slate-400",
              )}
            >
              {active ? (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
              <Icon className={cn("size-5", active ? "text-brand-600" : "text-slate-400")} aria-hidden />
              <p className="mt-2 text-sm font-semibold text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-500">{r.desc}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" required htmlFor="fullName">
          <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ramesh Sharma" />
        </Field>
        <Field label="Email" required htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required htmlFor="password" hint="At least 8 characters.">
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Confirm password" required htmlFor="confirm">
            <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </Field>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}