import type { Role } from "./model";
import { Truck, PackageSearch, LayoutDashboard, CalendarRange, Search, ClipboardList, Users, Flag, UserCircle, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar navigation per role. Order matters — first item is the section's landing. */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  transporter: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/transporter/vehicles", label: "Vehicles", icon: Truck },
    { href: "/dashboard/transporter/trips", label: "My return trips", icon: CalendarRange },
    { href: "/dashboard/transporter/matches", label: "Match loads", icon: Search },
    { href: "/dashboard/transporter/bookings", label: "Bookings", icon: ClipboardList },
  ],
  shipper: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/shipper/loads", label: "My loads", icon: PackageSearch },
    { href: "/dashboard/shipper/search", label: "Find return trips", icon: Search },
    { href: "/dashboard/shipper/bookings", label: "Bookings", icon: ClipboardList },
  ],
  admin: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/listings", label: "Listings", icon: CalendarRange },
    { href: "/dashboard/admin/issues", label: "Reported issues", icon: Flag },
  ],
};

export const SECONDARY_NAV: NavItem[] = [
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];