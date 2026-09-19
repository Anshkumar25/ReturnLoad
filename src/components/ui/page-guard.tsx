"use client";

import type { Role } from "@/lib/model";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "./empty-state";
import { ShieldX } from "lucide-react";

/** Renders children only when the signed-in user has one of the allowed roles. */
export function RoleGuard({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && allowed.includes(user.role)) return <>{children}</>;
  return (
    <EmptyState
      icon={ShieldX}
      title="You don't have access to this area"
      description="This section is restricted to authorised roles on ReturnLoad."
    />
  );
}