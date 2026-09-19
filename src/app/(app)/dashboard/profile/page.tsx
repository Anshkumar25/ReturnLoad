"use client";

import { useState } from "react";
import { Building2, RefreshCw, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SpinnerCentered } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/ui/status-badge";
import { profileSchema, companySchema } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";
import { APP_MODE } from "@/lib/config";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const { data: res, loading, reload } = useAsyncData(async () => {
    const uid = user?.id ?? "";
    if (!uid) return null;
    const [company, reviews, rating] = await Promise.all([data.getCompanyByUser(uid), data.listReviewsBySubject(uid), data.getRating(uid)]);
    return { company, reviews, rating };
  });

  if (loading || !res) return <SpinnerCentered label="Loading profile…" />;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Who you are on ReturnLoad. Verified profiles earn more trust — and more bookings."
        actions={user ? <div className="flex items-center gap-2"><VerificationBadge status={user.verificationStatus} />{user.role === "admin" || !user.companyId ? null : <Badge tone="brand">Company linked</Badge>}</div> : null}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6">
          <ProfileForm onSaved={() => { void refresh(); void reload(); }} />
          <CompanySection company={res.company} onChanged={() => void reload()} />
        </section>

        <section className="space-y-6">
          <RatingsCard rating={res.rating} />
          <ReviewsList reviews={res.reviews} />
          <TrustNote />
          {APP_MODE === "demo" ? <DemoReset /> : null}
        </section>
      </div>
    </>
  );
}

function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const parsed = profileSchema.safeParse({ fullName, phone: phone || "", city: city || "" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review your details.");
      return;
    }
    setBusy(true);
    await data.updateProfile(user.id, { fullName: parsed.data.fullName, phone: parsed.data.phone || undefined, city: parsed.data.city || undefined });
    await refresh();
    setBusy(false);
    onSaved();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required htmlFor="pf-name">
              <Input id="pf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="City" htmlFor="pf-city">
              <Input id="pf-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Jaipur" />
            </Field>
          </div>
          <Field label="Phone" htmlFor="pf-phone" hint="Used for coordination once a booking is accepted.">
            <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex justify-end">
            <Button type="submit" loading={busy}>Save details</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function CompanySection({ company, onChanged }: { company: Awaited<ReturnType<typeof data.getCompanyByUser>>; onChanged: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(!company);
  const [name, setName] = useState(company?.name ?? "");
  const [legalType, setLegalType] = useState(company?.legalType ?? "");
  const [city, setCity] = useState(company?.city ?? "");
  const [description, setDescription] = useState(company?.description ?? "");
  const [gstin, setGstin] = useState(company?.gstin ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const parsed = companySchema.safeParse({ name, legalType, city: city || "", description: description || "", gstin: gstin || "" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review the company details.");
      return;
    }
    setBusy(true);
    if (company) {
      // Edit an existing company is not exposed per-user on the data layer yet;
      // the only mutation path in the MVP is first-time setup.
      setBusy(false);
      setEditing(false);
      return;
    }
    await data.createCompany(user.id, {
      name: parsed.data.name,
      legalType: parsed.data.legalType,
      city: parsed.data.city || undefined,
      description: parsed.data.description || undefined,
      gstin: parsed.data.gstin || undefined,
    });
    setBusy(false);
    toast.success("Company created — you can now be verified as a business.");
    setEditing(false);
    onChanged();
  }

  if (!editing && company) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between"><CardTitle>Company / business</CardTitle><Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button></CardHeader>
        <CardBody className="space-y-1 text-sm">
          <p className="font-semibold text-slate-900">{company.name}</p>
          <p className="text-slate-600">{company.legalType}{company.city ? ` · ${company.city}` : ""}</p>
          {company.description ? <p className="text-slate-500">{company.description}</p> : null}
          {company.gstin ? <p className="text-xs text-slate-400">GSTIN: {company.gstin}</p> : null}
          <Badge tone={company.verified ? "green" : "neutral"}>{company.verified ? "Verified business" : "Not yet verified"}</Badge>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{company ? "Edit company" : "Add your company (optional)"}</CardTitle></CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" required htmlFor="co-name">
              <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sharma Roadlines" />
            </Field>
            <Field label="Legal type" required htmlFor="co-type">
              <Select id="co-type" value={legalType} onChange={(e) => setLegalType(e.target.value)}>
                <option value="">Select…</option>
                <option>Sole proprietorship</option>
                <option>Proprietorship</option>
                <option>Partnership</option>
                <option>Pvt Ltd</option>
                <option>LLP</option>
                <option>Public Ltd</option>
              </Select>
            </Field>
          </div>
          <Field label="City (registered)" htmlFor="co-city">
            <Input id="co-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Delhi" />
          </Field>
          <Field label="Description" htmlFor="co-desc" hint="Lanes you run, equipment, experience — shown on your public profile.">
            <Textarea id="co-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Daily runs Delhi–Jaipur and Delhi–Punjab lanes…" />
          </Field>
          <Field label="GSTIN (optional)" htmlFor="co-gstin" hint="A valid 15-character GSTIN speeds up verification.">
            <Input id="co-gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="07ABCDE1234F1Z5" />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex justify-end gap-2">
            {company ? <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button> : null}
            <Button type="submit" loading={busy}><Building2 className="size-4" aria-hidden />{company ? "Save" : "Create company"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function RatingsCard({ rating }: { rating: { average: number | null; count: number } | undefined }) {
  return (
    <Card>
      <CardHeader><CardTitle>Your rating</CardTitle></CardHeader>
      <CardBody className="flex items-center gap-4">
        <div className="flex size-16 flex-col items-center justify-center rounded-xl bg-brand-50">
          <span className="text-2xl font-extrabold text-brand-700">{rating?.average !== null && rating?.average !== undefined ? rating.average.toFixed(1) : "—"}</span>
          <span className="text-[10px] uppercase tracking-wide text-brand-600">/ 5</span>
        </div>
        <div>
          <div className="flex gap-0.5 text-amber-400" aria-label={`${rating?.average ?? "no"} stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={cn("size-5", rating?.average !== null && rating?.average !== undefined && n <= Math.round(rating.average ?? 0) ? "fill-amber-400" : "text-slate-200")} aria-hidden />
            ))}
          </div>
          <p className="mt-1 text-sm text-slate-500">{rating?.count ?? 0} review{rating?.count === 1 ? "" : "s"} from completed bookings.</p>
        </div>
      </CardBody>
    </Card>
  );
}

function ReviewsList({ reviews }: { reviews: Awaited<ReturnType<typeof data.listReviewsBySubject>> }) {
  return (
    <Card>
      <CardHeader><CardTitle>Reviews you&apos;ve received</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet. Complete a booking and the other party can rate you.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-sm font-medium text-slate-800">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} aria-hidden />
                  ))}
                </p>
                <span className="text-xs text-slate-400">by a {r.authorRole} · {fmtDateTime(r.createdAt)}</span>
              </div>
              {r.comment ? <p className="mt-1 text-sm text-slate-600">{r.comment}</p> : null}
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function TrustNote() {
  return (
    <Card>
      <CardBody className="space-y-1 text-sm text-slate-500">
        <p className="font-semibold text-slate-800">How verification works</p>
        <p>An admin reviews your profile and company details. Verified profiles display a badge and rank higher in trust signals for shippers.</p>
        <p className="text-xs text-slate-400">Suspended accounts cannot sign in or post.</p>
      </CardBody>
    </Card>
  );
}

function DemoReset() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function reset() {
    if (typeof window !== "undefined" && !window.confirm("Reset all demo data to the original seed? Current demo accounts and actions will be replaced.")) return;
    setBusy(true);
    await data.resetDemo();
    setBusy(false);
    toast.success("Demo data reset. You may need to sign out and sign back in.");
  }
  return (
    <Card>
      <CardBody className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><RefreshCw className="size-4 text-amber-500" aria-hidden />Demo mode</p>
        <p className="text-xs text-slate-500">All data lives in this browser. Reset it to the original seed whenever you like.</p>
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void reset()}>Reset demo data</Button>
      </CardBody>
    </Card>
  );
}